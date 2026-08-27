# Frontend Build & Setup Guide

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── IntroVideo.jsx          - Video loop with red light countdown
│   │   ├── IntroVideo.css
│   │   ├── PlayerEntry.jsx         - Player identification (manual/QR)
│   │   ├── PlayerEntry.css
│   │   ├── ScenarioGame.jsx        - Main game component
│   │   ├── ScenarioGame.css
│   │   ├── ScenarioDisplay.jsx     - Agent One message & scenario image
│   │   ├── ScenarioDisplay.css
│   │   ├── SwitchPanel.jsx         - 24-port switch with green flashing
│   │   ├── SwitchPanel.css
│   │   ├── SuccessModal.jsx        - Success page display
│   │   ├── SuccessModal.css
│   │   ├── ResultScreen.jsx        - Final results & leaderboard
│   │   └── ResultScreen.css
│   ├── App.jsx                      - Main app component
│   ├── App.css
│   ├── main.jsx                     - Entry point
│   └── index.css                    - Global styles
├── index.html                       - HTML template
├── package.json                     - Dependencies
├── vite.config.js                  - Vite configuration
└── frontend.backup/                 - Original compiled app (backup)
```

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
cd "C:\Users\marcoderu\OneDrive - Extreme Networks, Inc\Claude Code\Pitstop-Challenge\Real Game\resources\frontend"
npm install
```

This installs:
- React 18.2.0
- React DOM 18.2.0
- Axios (for API calls)
- Vite (build tool)

### 2. Environment Variables (Optional)

If you want to use a different API URL, create a `.env` file:

```env
VITE_API_BASE=http://localhost:3001/api
```

Then update `src/App.jsx` to use: `import.meta.env.VITE_API_BASE`

## 🛠️ Development

### Start Development Server

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` with:
- Hot module replacement (HMR)
- API proxy to `http://localhost:3001/api`

### Access the App

Open: `http://localhost:5173`

## 📦 Production Build

### Build for Production

```bash
npm run build
```

This creates:
- Minified bundles in `dist/` folder
- Optimized CSS
- Source maps (disabled in vite.config.js)

### Preview Built App

```bash
npm run preview
```

## 🔌 API Integration

The frontend makes the following API calls:

### Player Creation
- **Manual Entry**: `POST /api/player/manual`
- **QR Scan**: `POST /api/player/scan`

### Game Flow
- **Start Run**: `POST /api/run/start`
- **Load Scenarios**: `POST /api/scenarios/load-game`
- **Get Current**: `GET /api/scenarios/current/:runId`
- **Submit Result**: `POST /api/scenarios/submit`
- **Complete Run**: `POST /api/run/complete`

### Leaderboard
- **Get Result**: `GET /api/result/:playerId`
- **Intro Video**: `GET /api/admin/intro/current`

## 🎨 UI Components

### IntroVideo
- Shows looping video between games
- Red light countdown (10 seconds)
- Blinking animation when ≤5 seconds

### PlayerEntry
- Manual name entry or QR code scan
- Error handling & validation
- Loading states

### ScenarioGame
- Loads 4 random scenarios
- Displays Agent One message
- Shows green flashing on required ports
- Validates port selection
- Shows success page on correct completion
- Handles 3-second penalties on failure

### SwitchPanel
- 24-port interactive switch
- Color coding:
  - Gray: Not selected
  - Green (flashing): Required
  - Purple: Selected
- Port statistics
- Legend

### SuccessModal
- Full-screen success page image
- Animates checkmark
- Auto-closes after 3 seconds

### ResultScreen
- Final time display
- Scenario summary (success/failure)
- Top 10 leaderboard
- Player rank highlight
- Play again button

## 🎯 Key Features

✅ **Responsive Design** - Works on desktop, tablet, mobile
✅ **Dark Theme** - Purple & black Extreme Networks branding
✅ **Animations** - Smooth transitions and visual feedback
✅ **Error Handling** - User-friendly error messages
✅ **Loading States** - Spinners and progress indicators
✅ **Green Flashing Ports** - Clear visual indication
✅ **Penalty Tracking** - Shows time penalties
✅ **Leaderboard Integration** - Live ranking display

## 🔧 Customization

### Colors
Edit `src/index.css` for the color palette:
```css
:root {
  --primary-purple: #7c3aed;
  --success-green: #10b981;
  --error-red: #ef4444;
  --warning-yellow: #fcd34d;
}
```

### Fonts
Default: DM Sans (from Google Fonts)
Monospace (timers): Digital Numbers

### Ports per Scenario
Currently hardcoded to 24 ports. To change:
- Edit `SwitchPanel.jsx`: `Array.from({ length: 24 }, ...)`

## 📱 Mobile Responsive

Breakpoints configured:
- Desktop: 1200px+
- Tablet: 768px - 1200px
- Mobile: < 768px
- Small Mobile: < 480px

## 🐛 Troubleshooting

### "Failed to load intro video"
- Check backend is running on port 3001
- Verify `api/admin/intro/current` endpoint works

### "Scenario image not loaded"
- Verify image paths in `/Pitstop-Challenge/Scenarios/` folder
- Check file URLs use correct escaping for spaces

### CORS errors
- Backend should have `cors()` middleware enabled
- Check `vite.config.js` proxy settings

### Green flashing not showing
- Clear browser cache (Ctrl+Shift+Delete)
- Check CSS animation keyframes in `SwitchPanel.css`

## 🚢 Deployment to Electron

When ready to bundle with Electron:

1. Build the frontend: `npm run build`
2. Copy `dist/` contents to Electron's `preload` or resource folder
3. Configure Electron main process to serve the built files
4. Package with `electron-builder`

## 📝 Notes

- All API calls use relative URLs (proxied in dev, absolute in prod)
- Images loaded from file:// URLs (Electron-safe)
- No external CDN dependencies (fully self-contained)
- Animations optimized for 60fps
- Accessibility features included (keyboard navigation, ARIA labels)

## 🔄 Next Steps

1. Run `npm install` to install dependencies
2. Ensure backend is running on port 3001
3. Run `npm run dev` to start development
4. Test the full game flow
5. Build with `npm run build` when ready
6. Deploy to Electron app

---

## Quick Reference

**Development**
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview built app
```

**Backend Required**
- Running on: `http://localhost:3001`
- Endpoints: `/api/*`

**Frontend URLs**
- Dev: `http://localhost:5173`
- Built: `dist/` folder
