# Agent One Scenario System - API Documentation

## Overview
The game now uses a scenario-based system where players complete 4 Agent One scenarios per game - one from each category (AP, Branch, DataCenter, Firmware). Each scenario requires plugging in the correct ports.

---

## Database Schema

### scenarios table
Stores all scenario definitions:
```
- id: INTEGER (Primary Key)
- name: TEXT (e.g., "APScenario1")
- category: TEXT (AP, Branch, DataCenter, Firmware)
- variant: INTEGER (1, 2, or 3)
- agent_message: TEXT (Agent One dialogue)
- required_ports: TEXT (JSON array: [1, 2, 4, 6])
- success_message: TEXT (Success response)
- background_image: TEXT (filename: "APScenario1.png")
- success_image: TEXT (filename: "APScenarioSuccessPage.png")
- created_at: TIMESTAMP
```

### scenario_runs table
Tracks scenario completion within a run:
```
- id: INTEGER (Primary Key)
- run_id: INTEGER (Foreign Key -> runs)
- scenario_id: INTEGER (Foreign Key -> scenarios)
- scenario_order: INTEGER (1, 2, 3, or 4)
- result: TEXT (pending, success, failure)
- time_ms: INTEGER (Time taken to complete)
- penalty_applied: INTEGER (1 = 3-second penalty applied)
- created_at: TIMESTAMP
```

### runs table (updated)
Added penalty tracking:
```
- penalty_ms: INTEGER (Total penalties accumulated)
```

---

## API Endpoints

### 1. POST /api/scenarios/load-game
**Load 4 random scenarios for a new game**

Request body:
```json
{
  "run_id": 123
}
```

Response (success):
```json
{
  "success": true,
  "message": "Game scenarios loaded successfully",
  "scenarios": [
    {
      "id": 101,
      "run_id": 123,
      "scenario_id": 5,
      "scenario_order": 1,
      "result": "pending",
      "time_ms": 0,
      "penalty_applied": 0,
      "scenario": {
        "id": 5,
        "name": "APScenario2",
        "category": "AP",
        "variant": 2,
        "agent_message": "4x Access Points... let's give them a reboot first",
        "required_ports": [2, 3, 5, 6],
        "success_message": "The Access Points have been rebooted successfully!",
        "background_image": "APScenario2.png",
        "success_image": "APScenarioSuccessPage.png"
      }
    },
    // ... 3 more scenarios (one per category)
  ]
}
```

---

### 2. GET /api/scenarios/current/:runId
**Get current pending scenario in a game**

URL params:
```
runId: 123
```

Response (success - scenario pending):
```json
{
  "success": true,
  "scenarioRun": {
    "id": 101,
    "run_id": 123,
    "scenario_id": 5,
    "scenario_order": 1,
    "result": "pending"
  },
  "scenario": {
    "id": 5,
    "name": "APScenario2",
    "category": "AP",
    "agent_message": "4x Access Points... let's give them a reboot first",
    "required_ports": [2, 3, 5, 6],
    "success_message": "The Access Points have been rebooted successfully!",
    "background_image": "APScenario2.png",
    "success_image": "APScenarioSuccessPage.png"
  },
  "progress": {
    "current": 1,
    "total": 4
  }
}
```

Response (all completed):
```json
{
  "success": true,
  "message": "All scenarios completed",
  "allCompleted": true,
  "scenarioRuns": [
    // ... all 4 scenario runs with their results
  ]
}
```

---

### 3. POST /api/scenarios/submit
**Submit player's port selection for a scenario**

Request body:
```json
{
  "scenario_run_id": 101,
  "run_id": 123,
  "plugged_ports": [2, 3, 5, 6],
  "time_ms": 15234
}
```

Response (success):
```json
{
  "success": true,
  "result": "success",
  "message": "Scenario completed successfully!",
  "scenarioRun": {
    "id": 101,
    "run_id": 123,
    "scenario_id": 5,
    "scenario_order": 1,
    "result": "success",
    "time_ms": 15234,
    "penalty_applied": 0
  },
  "penaltyApplied": 0,
  "nextScenario": {
    // ... next pending scenario (scenario_order: 2)
  },
  "allCompleted": false
}
```

Response (failure - wrong ports):
```json
{
  "success": true,
  "result": "failure",
  "message": "Incorrect ports. Moving to next scenario...",
  "scenarioRun": {
    "id": 101,
    "result": "failure",
    "time_ms": 15234,
    "penalty_applied": 1
  },
  "penaltyApplied": 1,
  "nextScenario": {
    // ... next scenario with order 2
  },
  "allCompleted": false
}
```

Response (all 4 scenarios completed):
```json
{
  "success": true,
  "result": "success",
  "message": "Scenario completed successfully!",
  "penaltyApplied": 0,
  "nextScenario": null,
  "allCompleted": true
}
```

---

## Game Flow

### Player Turn Flow:
1. **POST /api/run/start** - Start a new run
2. **POST /api/scenarios/load-game** - Load 4 random scenarios (1 per category)
3. **GET /api/scenarios/current/:runId** - Display first scenario
4. **[Player plugs ports in UI]** - Visual feedback, green flashing
5. **POST /api/scenarios/submit** - Submit port selection
   - If wrong: Apply 3-second penalty, show next scenario
   - If correct: Show success page image, then show next scenario
6. **Repeat steps 3-5** for scenarios 2, 3, and 4
7. **POST /api/run/complete** - Complete run with final time (including penalties)

---

## Scenario Data

### All 12 Scenarios:

**AP Category:**
- APScenario1: Ports [1, 2, 4, 6]
- APScenario2: Ports [2, 3, 5, 6]
- APScenario3: Ports [1, 4, 5, 6]

**Branch Category:**
- BranchScenario1: Ports [7, 10, 11, 12] (Abu Dhabi)
- BranchScenario2: Ports [8, 9, 11, 12] (Cape Town)
- BranchScenario3: Ports [7, 9, 10, 11] (Chennai)

**DataCenter Category:**
- DataCenterScenario1: Ports [13, 15, 16, 17]
- DataCenterScenario2: Ports [14, 15, 16, 18]
- DataCenterScenario3: Ports [13, 14, 16, 17]

**Firmware Category:**
- FirmwareScenario1: Ports [19, 20, 22, 24]
- FirmwareScenario2: Ports [19, 21, 23, 24]
- FirmwareScenario3: Ports [20, 21, 22, 23]

---

## Penalty System

- **Failed Scenario**: 3 seconds (3000 ms) added to total time
- **Total Time Calculation**: 
  - Sum of all scenario completion times
  - Plus 3 seconds for each failed scenario
  - Final time recorded in `runs.time_ms` + `runs.penalty_ms`

---

## Frontend Integration Points

1. **Load Game Scenarios** - Call when player's run starts
2. **Display Agent One UI** - Show agent message, required ports (highlighted in yellow)
3. **Display Switch Image** - Show background image with green flashing ports
4. **Port Selection** - Player selects/plugs ports visually
5. **Show Success Page** - On successful completion, display success_image
6. **Progress Indicator** - Show "2/4" scenario progress
7. **Final Results** - After all 4 scenarios, show total time and leaderboard position

---

## Notes

- All 12 scenarios are seeded automatically on server startup
- Images are referenced by filename (stored in `/Pitstop-Challenge/Scenarios/` folder)
- Scenarios are randomly selected per category (prevents memorization)
- Each game guarantees all 4 categories are covered
- No scenario is repeated within a single game
