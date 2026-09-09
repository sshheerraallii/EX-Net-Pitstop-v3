'use strict'

const { app, BrowserWindow, globalShortcut, dialog } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const http = require('http')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001
const HEALTH_URL = `http://localhost:${PORT}/api/health`
const APP_URL = `http://localhost:${PORT}/`

// `--view=leaderboard` (used by the second Start-menu shortcut) opens the
// spectator board instead of the game.
const view = (process.argv.find((a) => a.startsWith('--view=')) || '').split('=')[1]
const startUrl = view === 'leaderboard' ? `${APP_URL}leaderboard` : APP_URL

// In a packaged build this shell owns the backend process. In dev, run the
// backend yourself (`cd ../backend && npm run dev`) and this just opens the
// window against it.
const OWNS_BACKEND = app.isPackaged

let backendProc = null
let win = null

// ---------------------------------------------------------------------------
// Backend lifecycle
// ---------------------------------------------------------------------------
function backendPaths() {
  // Packaged: resources/backend/*  and  resources/frontend/dist
  const backendDir = path.join(process.resourcesPath, 'backend')
  return {
    entry: path.join(backendDir, 'server2.js'),
    cwd: backendDir,
    frontendDir: path.join(process.resourcesPath, 'frontend', 'dist'),
  }
}

function pingHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1500, () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForBackend(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await pingHealth()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function startBackend() {
  // Someone (a prior session, or a separate auto-start) may already have it up.
  if (await pingHealth()) {
    console.log('[shell] backend already running, reusing it')
    return true
  }

  const { entry, cwd, frontendDir } = backendPaths()

  backendProc = fork(entry, [], {
    cwd,
    env: {
      ...process.env,
      // Use Electron's bundled Node to run the backend, so native modules
      // (better-sqlite3) only ever need one ABI.
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(PORT),
      // Read-only app dir -> keep the SQLite DB + uploads in a writable
      // per-user folder.
      PITSTOP_DATA_DIR: path.join(app.getPath('userData'), 'data'),
      PITSTOP_FRONTEND_DIR: frontendDir,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })

  backendProc.stdout?.on('data', (d) => console.log('[backend]', String(d).trimEnd()))
  backendProc.stderr?.on('data', (d) => console.error('[backend]', String(d).trimEnd()))
  backendProc.on('exit', (code, signal) => {
    console.error(`[shell] backend exited (code=${code} signal=${signal})`)
    backendProc = null
  })

  return waitForBackend()
}

function stopBackend() {
  if (!backendProc) return
  try {
    backendProc.kill()
  } catch (_) {
    /* noop */
  }
  backendProc = null
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#050409',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.once('ready-to-show', () => win.show())
  win.loadURL(startUrl)

  // Booth-friendly keys: F11 toggles full-screen, Ctrl+Shift+Q quits.
  globalShortcut.register('F11', () => {
    if (win) win.setFullScreen(!win.isFullScreen())
  })
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())

  win.on('closed', () => {
    win = null
  })
}

async function boot() {
  if (OWNS_BACKEND) {
    const ok = await startBackend()
    if (!ok) {
      dialog.showErrorBox(
        'Extreme Agent One',
        `The game server did not start on port ${PORT}.\n\n` +
          'Close any other copy that may be running and try again. ' +
          'If it keeps happening, restart the PC.'
      )
      app.quit()
      return
    }
  }
  createWindow()
}

// ---------------------------------------------------------------------------
// App wiring
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    // Launch at login on the kiosk PC. Remove via Task Manager > Startup, or
    // by uninstalling.
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: true, args: [] })
    }
    boot()
  })

  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', stopBackend)
  app.on('will-quit', () => globalShortcut.unregisterAll())
}
