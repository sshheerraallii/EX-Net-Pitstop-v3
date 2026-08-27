# 🚀 Quick Start Guide

## ⚡ Get Running in 5 Minutes

### Step 1: Install Frontend Dependencies
```bash
cd "C:\Users\marcoderu\OneDrive - Extreme Networks, Inc\Claude Code\Pitstop-Challenge\Real Game\resources\frontend"
npm install
```
⏱️ ~2 minutes (first time only)

### Step 2: Start Backend Server
```bash
cd "C:\Users\marcoderu\OneDrive - Extreme Networks, Inc\Claude Code\Pitstop-Challenge\Real Game\resources\backend"
npm start
```
✅ Should print: `🕹️ Game server listening at http://localhost:3001`

### Step 3: Start Frontend Dev Server
In a **new terminal**:
```bash
cd "C:\Users\marcoderu\OneDrive - Extreme Networks, Inc\Claude Code\Pitstop-Challenge\Real Game\resources\frontend"
npm run dev
```
✅ Should print: `VITE v5.0.8 ready in X ms` → `http://localhost:5173`

### Step 4: Play the Game
Open your browser: **http://localhost:5173**

---

## 🎮 Playing the Game

1. **Watch the intro video** (10-second countdown with red light)
2. **Enter your name** (or scan QR code)
3. **Complete 4 scenarios**:
   - Read Agent One's message
   - Look at scenario background image
   - Click the **green flashing ports** on the switch
   - Click "Plug Ports" to submit
   - ✓ Correct = Show success page, load next
   - ✗ Wrong = Add 3-second penalty, load next
4. **See your results** with final time and leaderboard

---

## 🛠️ Terminal Commands Reference

### Frontend
```bash
npm run dev       # Start development server (http://localhost:5173)
npm run build     # Build for production (creates dist/)
npm run preview   # Preview the built app
```

### Backend
```bash
npm start         # Start the game server (http://localhost:3001)
npm run dev       # Start with nodemon (auto-restart on file changes)
```

---

## ✅ Verification Checklist

After starting both servers:

```bash
# In another terminal, verify backend is working:
curl http://localhost:3001/api/health
# Response: {"status":"ok","timestamp":"...","uptime":...}

# Verify scenarios are seeded:
curl http://localhost:3001/api/admin/players
# Response: {"success":true,"players":[...]}
```

---

## 📱 What You'll See

### 1. Intro Screen
- Video looping in background
- Red light pulsing
- Countdown timer (10 → 0)
- "Start Game" button

### 2. Player Entry
- Name input field
- Optional country field
- "Start Game" button
- (Or: QR code scanner mode)

### 3. Game Screen (Scenario)
- **Left side**: Scenario background image with Agent One message
  - Shows required ports in yellow
  - Progress indicator (1/4, 2/4, etc.)
- **Right side**: 24-port switch panel
  - Green flashing on required ports
  - Click ports to select (turn purple)
  - "Plug Ports" button

### 4. Success/Failure
- **Success**: Shows beautiful success page image for 3 seconds
- **Failure**: Shows error message, +3 seconds penalty
- Then loads next scenario

### 5. Results
- Your final time (with penalty breakdown)
- Scenario summary (✓ Success / ✗ Failed)
- Top 10 leaderboard
- Your ranking highlighted
- "Play Again" button

---

## 🐛 If Something Doesn't Work

### Frontend doesn't load
```bash
# Kill the dev server (Ctrl+C) and restart
npm run dev

# Or clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend connection error
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# If not, restart backend
npm start

# Check if port 3001 is already in use
netstat -ano | findstr :3001
```

### Scenario image not showing
- Verify file: `C:\Users\marcoderu\OneDrive - Extreme Networks, Inc\Claude Code\Pitstop-Challenge\Scenarios\`
- Check file names match (e.g., `APScenario1.png`)
- Clear browser cache (Ctrl+Shift+Delete)

### Ports not flashing green
- Refresh page (F5)
- Check browser console for errors (F12)
- Ensure backend returned correct `required_ports`

---

## 📊 Testing the Scenarios

Each game loads 4 different scenarios. Example games:
- Game 1: AP + Branch + DataCenter + Firmware
- Game 2: AP (different variant) + DataCenter + Firmware + Branch
- Game 3: Branch (different variant) + AP + Firmware + DataCenter
- Etc. (always 1 from each category, never repeats in single game)

### Test Correct Ports
Look at the yellow port numbers on the scenario image → Click those same numbers on the switch panel

### Test Failure
Click **wrong** ports → Should show "Incorrect ports" message and add 3 seconds

### Test Success Page  
Complete all scenarios correctly → Should show beautiful success page image

---

## 📈 Performance Tips

### Frontend
- Frontend is fastest if built: `npm run build` then serve `dist/`
- Dev server with HMR is for development only
- Production build is ~300KB gzipped

### Backend
- SQLite is single-process, fast for this scale
- Backend handles ~100 concurrent connections easily
- For scale: consider adding connection pooling

---

## 🔄 Workflow

### During Development
```bash
Terminal 1: npm start              # Backend
Terminal 2: npm run dev            # Frontend
Browser:   http://localhost:5173   # Play
```

### For Production
```bash
# Build frontend
cd frontend && npm run build

# Create release package
# (Electron will include dist/ folder)

# Run backend
npm start
```

---

## 📚 Documentation

Quick reference files in the `Real Game` folder:
- **QUICKSTART.md** ← You are here
- **PROJECT_COMPLETION_SUMMARY.md** - Full overview
- **SCENARIO_API.md** - REST API details
- **IMPLEMENTATION_SUMMARY.md** - Backend architecture
- **FRONTEND_BUILD_GUIDE.md** - Frontend details

---

## 🎯 Common Tasks

### Add a New Scenario
1. Add PNG to `Scenarios/` folder
2. Add entry to `db/seed-scenarios.js`
3. Restart backend (scenarios auto-reseed)

### Change Intro Video
1. Upload via Admin app
2. Or: Replace `dist/intovideo.mp4`

### Customize Colors
Edit `src/index.css` - search for `:root` color variables

### Change Port Count (e.g., to 48)
1. Edit `src/components/SwitchPanel.jsx` line: `Array.from({ length: 24 }, ...)`
2. Change `24` to your port count
3. Restart dev server

---

## ✨ That's It!

You now have a **fully functional Agent One scenario game** running locally.

- 🎮 4 scenarios per game
- 🎨 Beautiful UI with animations  
- ⚡ Fast & responsive
- 📊 Full leaderboard
- 🔄 Easy to customize

**Questions?** Check the documentation files listed above.

**Ready to deploy?** See `FRONTEND_BUILD_GUIDE.md` for production build steps.

---

**Enjoy the game! 🚀**
