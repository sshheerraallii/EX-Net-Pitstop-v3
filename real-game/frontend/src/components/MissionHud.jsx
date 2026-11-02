import { useState, useEffect, useRef } from 'react'
import './MissionHud.css'

// The run clock and mission progress, always on screen during play.
//
// This is a race - the only thing separating first place from tenth is
// elapsed time - and until now the player couldn't see the clock at all.
// Counting up rather than down, because there's no fail state: the time IS
// the score.

// Urgency thresholds, in seconds. Tuned off a clean run taking roughly
// 90 seconds, so "amber" means you are behind the pace and "red" means the
// leaderboard is out of reach - visible pressure without ever ending a run.
const AMBER_AFTER_S = 120
const RED_AFTER_S = 180

function formatClock(ms) {
  const total = Math.max(0, ms)
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  // Tenths tick visibly, which is what makes a clock feel live rather than
  // like a number that happens to change.
  const tenths = Math.floor((total % 1000) / 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function MissionHud({ startTime, current, total }) {
  const [elapsed, setElapsed] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startTime)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [startTime])

  const seconds = elapsed / 1000
  const urgency = seconds >= RED_AFTER_S ? 'red' : seconds >= AMBER_AFTER_S ? 'amber' : 'calm'
  const count = Math.max(total, current, 1)

  return (
    <div className="mission-hud">
      <div className={`hud-clock hud-clock--${urgency}`}>
        <span className="hud-clock-label">Elapsed</span>
        <span className="hud-clock-value">{formatClock(elapsed)}</span>
      </div>

      <div className="hud-pips" aria-label={`Scenario ${current} of ${count}`}>
        {Array.from({ length: count }, (_, i) => {
          const index = i + 1
          const state = index < current ? 'done' : index === current ? 'active' : 'todo'
          return <span key={index} className={`hud-pip hud-pip--${state}`} />
        })}
        <span className="hud-pips-label">
          Incident {current}/{count}
        </span>
      </div>
    </div>
  )
}

export default MissionHud
