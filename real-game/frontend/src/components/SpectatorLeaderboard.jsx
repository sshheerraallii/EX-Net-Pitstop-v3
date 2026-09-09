import axios from 'axios'
import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import './SpectatorLeaderboard.css'

// Standalone, always-on leaderboard for a second screen at the booth. Lives
// at /leaderboard, polls the same session-scoped board the result screen
// uses, and re-renders as players finish. No interaction of its own - the
// shared AppMenu handles navigation and session reset.

const REFRESH_MS = 5000

function Medal({ rank }) {
  if (rank > 3) {
    return <span className="splb-rank-plain">{rank}</span>
  }
  const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'
  const stops =
    tier === 'gold'
      ? ['#ffe58a', '#d4a017']
      : tier === 'silver'
        ? ['#eef1f5', '#a9b0bc']
        : ['#e2a76f', '#a86a3d']
  return (
    <svg viewBox="0 0 32 32" className={`splb-medal splb-medal--${tier}`} aria-hidden="true">
      <defs>
        <linearGradient id={`splb-grad-${tier}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="100%" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#splb-grad-${tier})`} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1a1400">
        {rank}
      </text>
    </svg>
  )
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function SpectatorLeaderboard() {
  const [rows, setRows] = useState([])
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | error

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [lb, sess] = await Promise.all([
          axios.get(`${API_BASE}/leaderboard`),
          axios.get(`${API_BASE}/session`).catch(() => null),
        ])
        if (!alive) return
        setRows(lb.data.leaderboard || [])
        if (sess && sess.data && sess.data.session) setSession(sess.data.session)
        setStatus('ok')
      } catch (error) {
        if (!alive) return
        console.error('Leaderboard poll failed:', error)
        setStatus('error')
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="splb">
      <div className="splb-bg" aria-hidden="true">
        <img src="/extreme-logo.png" alt="" />
      </div>

      <div className="splb-inner">
        <header className="splb-head">
          <img src="/agent-one-logo.svg" className="splb-mark" alt="" aria-hidden="true" />
          <div className="splb-titles">
            <h1>Leaderboard</h1>
            <p>{session && session.name ? session.name : 'Live session'}</p>
          </div>
          <span className={`splb-live splb-live--${status}`}>
            {status === 'error' ? 'Reconnecting' : 'Live'}
          </span>
        </header>

        {rows.length === 0 ? (
          <div className="splb-empty">
            {status === 'loading'
              ? 'Loading…'
              : 'No finishers yet. The board fills as players complete their runs.'}
          </div>
        ) : (
          <ol className="splb-table">
            <li className="splb-row splb-row--header">
              <span className="splb-c-rank">Rank</span>
              <span className="splb-c-name">Name</span>
              <span className="splb-c-country">Country</span>
              <span className="splb-c-time">Time</span>
            </li>
            {rows.map((r, i) => (
              <li
                key={r.player_id != null ? r.player_id : i}
                className={`splb-row ${i < 3 ? 'splb-row--podium' : ''}`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className="splb-c-rank">
                  <Medal rank={i + 1} />
                </span>
                <span className="splb-c-name">{r.name}</span>
                <span className="splb-c-country">{r.country || '—'}</span>
                <span className="splb-c-time">{formatTime(r.best_time_ms)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default SpectatorLeaderboard
