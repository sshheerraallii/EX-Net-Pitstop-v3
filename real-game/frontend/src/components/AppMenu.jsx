import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './AppMenu.css'

// Small, deliberately low-key navigation menu that rides along on every
// screen (game + leaderboard). Collapsed to a plain icon in the corner;
// click to expand. Lets booth staff jump between the game, the spectator
// leaderboard and the check-in page, start a game by hand if the tablet is
// down, restart the current game for the next player, and start a fresh
// session (which clears the current leaderboard) - all without leaving the
// kiosk.
function AppMenu({ route, onNavigate, onRestartGame, onStaffStart, apiBase }) {
  const [open, setOpen] = useState(false)
  const [resetPhase, setResetPhase] = useState('idle') // idle | confirm | working | done | error
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setResetPhase('idle')
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setResetPhase('idle')
      }
    }

    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (to) => {
    setOpen(false)
    setResetPhase('idle')
    onNavigate(to)
  }

  const restartGame = () => {
    setOpen(false)
    setResetPhase('idle')
    onNavigate('/')
    onRestartGame()
  }

  const staffStart = () => {
    setOpen(false)
    setResetPhase('idle')
    onNavigate('/')
    onStaffStart()
  }

  const doReset = async () => {
    setResetPhase('working')
    try {
      await axios.post(`${apiBase}/admin/session/new`, {})
      setResetPhase('done')
      setTimeout(() => {
        setResetPhase('idle')
        setOpen(false)
        // The spectator board only refetches on its own timer; force it to
        // show the cleared state right away.
        if (route === 'leaderboard') window.location.reload()
      }, 1200)
    } catch (error) {
      console.error('Session reset failed:', error)
      setResetPhase('error')
    }
  }

  return (
    <div className={`app-menu ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="app-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {open && (
        <div className="app-menu-panel" role="menu">
          <button
            type="button"
            className="app-menu-item"
            role="menuitem"
            onClick={() => go('/')}
            disabled={route === 'game'}
          >
            Game
          </button>
          <button
            type="button"
            className="app-menu-item"
            role="menuitem"
            onClick={() => go('/leaderboard')}
            disabled={route === 'leaderboard'}
          >
            Leaderboard
          </button>
          <a className="app-menu-item" role="menuitem" href="/checkin">
            Check-in
          </a>

          <div className="app-menu-sep" role="separator"></div>

          {resetPhase === 'idle' && (
            <button
              type="button"
              className="app-menu-item"
              role="menuitem"
              onClick={staffStart}
            >
              Start game (no check-in)
            </button>
          )}

          {resetPhase === 'idle' && (
            <button
              type="button"
              className="app-menu-item"
              role="menuitem"
              onClick={restartGame}
            >
              Restart game
            </button>
          )}

          {resetPhase === 'idle' && (
            <button
              type="button"
              className="app-menu-item app-menu-item--danger"
              role="menuitem"
              onClick={() => setResetPhase('confirm')}
            >
              New session
            </button>
          )}

          {resetPhase === 'confirm' && (
            <div className="app-menu-confirm">
              <p>Start a new session? This clears the current leaderboard.</p>
              <div className="app-menu-confirm-row">
                <button
                  type="button"
                  className="app-menu-btn"
                  onClick={() => setResetPhase('idle')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="app-menu-btn app-menu-btn--danger"
                  onClick={doReset}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {resetPhase === 'working' && (
            <div className="app-menu-status">Resetting&#8230;</div>
          )}
          {resetPhase === 'done' && (
            <div className="app-menu-status app-menu-status--ok">
              New session started
            </div>
          )}
          {resetPhase === 'error' && (
            <div className="app-menu-status app-menu-status--err">
              Reset failed &#8212; is the server running?
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AppMenu
