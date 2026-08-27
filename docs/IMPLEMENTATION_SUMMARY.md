# Agent One Scenario System - Implementation Summary

## ✅ Backend Implementation Complete

### Files Modified/Created:

#### 1. **Database Schema** (`resources/backend/db/database.js`)
- Added `scenarios` table for scenario definitions
- Added `scenario_runs` table to track scenario progression
- Updated `runs` table with `penalty_ms` field
- Created indexes for performance

#### 2. **Seed Data** (`resources/backend/db/seed-scenarios.js`)
- Auto-populates 12 scenarios on server startup
- 4 categories × 3 variants each:
  - AP (Access Points reboot)
  - Branch (Link failover between branches)
  - DataCenter (Cable break failover)
  - Firmware (Firmware upgrade)

#### 3. **Database Queries** (`resources/backend/db/queries.js`)
Added helper functions:
- `getRandomScenariosByCategory()` - Select 1 random scenario per category
- `getScenarioById()` - Get scenario details
- `createScenarioRun()` - Create scenario instance for a run
- `completeScenarioRun()` - Mark scenario as success/failure
- `getScenarioRunsByRunId()` - Get all scenarios in a run
- `updateRunWithPenalty()` - Add 3-second penalty

#### 4. **API Endpoints** (`resources/backend/server2.js`)
New REST endpoints:
- `POST /api/scenarios/load-game` - Start new game with 4 scenarios
- `GET /api/scenarios/current/:runId` - Get current pending scenario
- `POST /api/scenarios/submit` - Submit port selection and get result

---

## 🎮 Game Flow

### Before (Original):
```
Player → Random ports → Plug all → Timer → Score
```

### After (New Scenario System):
```
Player → Load 4 Scenarios (1 per category) → 
  Scenario 1 (Agent One message) → 
    Plug correct ports → 
      Success? Show success page + next scenario
      Failure? Add 3-sec penalty + next scenario
  Scenario 2, 3, 4 (repeat) →
Record total time (with penalties) → Leaderboard
```

---

## 📊 Data Structure

### Scenario Loading:
```
Game Start
  ↓
Load Scenarios
  ├─ Random AP Scenario (1 of 3)
  ├─ Random Branch Scenario (1 of 3)
  ├─ Random DataCenter Scenario (1 of 3)
  └─ Random Firmware Scenario (1 of 3)
  ↓
Create 4 scenario_runs with status: pending
  ↓
Return scenarios to frontend
```

### Scenario Completion:
```
Player Plugs Ports
  ↓
Validate Against Required Ports
  ├─ Correct? → result: "success" → Show success page
  └─ Wrong?  → result: "failure" → Add 3-sec penalty
  ↓
Load Next Scenario (if available)
  ↓
After 4 Scenarios → Close game → Record final time
```

---

## 🔄 Penalty System

- **Per failed scenario**: +3 seconds (3000 ms)
- **Tracked in**: `runs.penalty_ms`
- **Example**:
  - Scenario 1: 15 seconds (success, no penalty)
  - Scenario 2: 12 seconds (failure, +3 sec penalty)
  - Scenario 3: 14 seconds (success, no penalty)
  - Scenario 4: 13 seconds (failure, +3 sec penalty)
  - **Total**: 15 + 12 + 3 + 14 + 13 + 3 = **60 seconds**

---

## 📸 Asset Integration

Images stored in `/Pitstop-Challenge/Scenarios/`:

**Scenario Background Images:**
- APScenario1.png, APScenario2.png, APScenario3.png
- BranchScenario1.png, BranchScenario2.png, BranchScenario3.png
- DataCenterScenario1.png, DataCenterScenario2.png, DataCenterScenario3.png
- FirmwareScenario1.png, FirmwareScenario2.png, FirmwareScenario3.png

**Success Page Images:**
- APScenarioSuccessPage.png
- BranchScenarioSuccessPage.png
- DataCenterScenarioSuccessPage.png
- FirmwareScenarioSuccessPage.png

**Required Ports (highlighted in yellow on images):**
- Each scenario image shows ports 1-24
- API specifies which ports to highlight in green (flashing)

---

## 🎯 Next Steps - Frontend Integration

The frontend needs to:

1. **Load Game Screen**
   - Call `POST /api/scenarios/load-game` with run_id
   - Receive 4 scenarios for the game

2. **Scenario Display**
   - Show scenario background image (from API)
   - Display Agent One icon + dialogue (from API)
   - Highlight required ports in yellow
   - Show progress: "1/4", "2/4", etc.

3. **Port Selection**
   - Show 24 ports from switch image
   - Allow player to click/plug ports
   - Display green flashing effect on required ports
   - Collect selected ports

4. **Submit Scenario**
   - Call `POST /api/scenarios/submit`
   - Pass: scenario_run_id, plugged_ports, time_ms, run_id
   - Receive: result (success/failure), next scenario

5. **Success/Failure Handling**
   - Success: Display success_image for 2-3 seconds
   - Failure: Show message "Wrong ports, moving to next..." for 1 second
   - Then display next scenario

6. **Game Completion**
   - After 4 scenarios, show final time
   - Include penalty information
   - Post to `/api/run/complete` with total time
   - Show leaderboard position

---

## 📋 API Response Examples

### Load Game:
```json
{
  "success": true,
  "scenarios": [
    {
      "scenario": {
        "name": "APScenario2",
        "category": "AP",
        "agent_message": "4x Access Points... reboot first",
        "required_ports": [2, 3, 5, 6],
        "background_image": "APScenario2.png",
        "success_image": "APScenarioSuccessPage.png"
      }
    },
    // ... 3 more
  ]
}
```

### Get Current Scenario:
```json
{
  "scenario": {
    "name": "APScenario2",
    "required_ports": [2, 3, 5, 6],
    "background_image": "APScenario2.png"
  },
  "progress": { "current": 1, "total": 4 }
}
```

### Submit Result (Success):
```json
{
  "result": "success",
  "message": "Scenario completed successfully!",
  "penaltyApplied": 0,
  "nextScenario": { /* scenario order 2 */ },
  "allCompleted": false
}
```

### Submit Result (Failure):
```json
{
  "result": "failure",
  "message": "Incorrect ports. Moving to next scenario...",
  "penaltyApplied": 1,
  "nextScenario": { /* scenario order 2 */ },
  "allCompleted": false
}
```

---

## 🚀 Testing the Backend

To verify the backend is working:

```bash
# 1. Start a run
POST /api/run/start
Body: { "player_id": 1 }
Response: { "run": { "id": 123 } }

# 2. Load game scenarios
POST /api/scenarios/load-game
Body: { "run_id": 123 }
Response: 4 scenarios loaded

# 3. Get current scenario
GET /api/scenarios/current/123
Response: First scenario details

# 4. Submit result (success)
POST /api/scenarios/submit
Body: { 
  "scenario_run_id": 101,
  "run_id": 123,
  "plugged_ports": [2, 3, 5, 6],
  "time_ms": 15234
}
Response: success result + next scenario

# 5. Complete the run
POST /api/run/complete
Body: { "run_id": 123, "time_ms": 60000 }
Response: Run completed, leaderboard updated
```

---

## ✨ Key Features Preserved

- ✅ Video loop between plays (unchanged)
- ✅ Red light countdown timer (unchanged)
- ✅ Admin panel integration (unchanged)
- ✅ Leaderboard display (unchanged)
- ✅ Player scoring system (updated with penalties)
- ✅ Session management (unchanged)
- ✅ SNMP integration (removed from gameplay, can be re-added for real switch control)

---

## 📝 Notes

- All 12 scenarios automatically seeded on first run
- Randomization ensures no scenario repetition within one game
- 3-second penalty system encourages accuracy
- Success pages add visual reward feedback
- Frontend can serve images directly from `/Scenarios/` folder
