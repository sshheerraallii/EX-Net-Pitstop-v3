import axios from 'axios'
import { useState, useEffect, useRef } from 'react'
import RankCelebration from './RankCelebration'
import './ResultScreen.css'

// How long the top-3 celebration takeover plays before handing off to the
// normal result screen - same "plays, then hands off" beat as the scenario
// SuccessModal's 3s timer, just a bit longer since this one has more to land
// (trophy, ordinal, confetti) before the leaderboard reveal underneath.
const CELEBRATION_DURATION_MS = 4500

const API_BASE = 'http://localhost:3001/api'

// Counts up from 0 to the final time instead of just appearing - gives the
// result a "reveal" beat instead of a flat number dump, matching the
// animated-everything feel the rest of the game already has (typing text,
// shimmering progress bars, pulsing status dots).
function useCountUp(target, durationMs = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])

  return value
}

// Gold/silver/bronze badge for the top 3 leaderboard spots, replacing the
// emoji medals - a plain numbered chip for everyone else. Keeps the same
// no-emoji, custom-SVG language used everywhere else in the build.
function RankBadge({ rank }) {
  if (rank > 3) {
    return <span className="rank-plain">#{rank}</span>
  }
  const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'
  return (
    <svg viewBox="0 0 32 32" className={`rank-medal rank-medal--${tier}`} aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill={`url(#medalGrad-${tier})`} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1a1400">
        {rank}
      </text>
    </svg>
  )
}

function ScenarioStatusBadge({ success }) {
  return (
    <span className={`scenario-status-badge ${success ? 'success' : 'failure'}`}>
      {success ? '✓' : '✕'}
    </span>
  )
}

function ResultScreen({ gameResult, onPlayAgain }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [playerRank, setPlayerRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [celebrationDismissed, setCelebrationDismissed] = useState(false)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${API_BASE}/result/${gameResult.player.id}`)
        setLeaderboard(response.data.leaderboard)
        setPlayerRank(response.data.player)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [gameResult])

  const isTopThree = playerRank && playerRank.rank <= 3
  const showCelebration = !loading && isTopThree && !celebrationDismissed

  // Plays once the rank is known to be top-3, then hands off to the normal
  // result screen underneath - the player never has to tap anything to move
  // past it, same as every other timed beat in this build.
  useEffect(() => {
    if (!showCelebration) return
    const timer = setTimeout(() => setCelebrationDismissed(true), CELEBRATION_DURATION_MS)
    return () => clearTimeout(timer)
  }, [showCelebration])

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s`
  }

  const getTotalPenalty = () => {
    const failedScenarios = gameResult.scenarioRuns.filter(
      (sr) => sr.result === 'failure'
    ).length
    return failedScenarios * 3
  }

  const displayedTimeMs = useCountUp(gameResult.totalTime)

  return (
    <div className="result-screen">
      {/* shared gradient defs for the rank medals - one set of ids, reused
          by every RankBadge instance below */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="medalGrad-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe58a" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
          <linearGradient id="medalGrad-silver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef1f5" />
            <stop offset="100%" stopColor="#a9b0bc" />
          </linearGradient>
          <linearGradient id="medalGrad-bronze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2a76f" />
            <stop offset="100%" stopColor="#a86a3d" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top-3 finish gets a full-screen celebration moment first - same
          "plays, then hands off" pattern as the scenario SuccessModal -
          before settling into the normal result screen underneath. Ranks
          4+ skip straight to the result screen, no takeover. */}
      {showCelebration && (
        <RankCelebration
          rank={playerRank.rank}
          playerName={gameResult.player.name}
          timeLabel={formatTime(gameResult.totalTime)}
        />
      )}

      <div className="result-container">
        <div className="result-header">
          <div className="result-badge">
            <span>&#10003;</span>
          </div>
          <h1>Game Complete!</h1>
          <p className="player-name">{gameResult.player.name}</p>
        </div>

        <div className="result-content">
          <div className="time-section">
            <div className="time-display">
              <div className="time-label">Your Time</div>
              <div className="time-value">
                {formatTime(displayedTimeMs)}
              </div>
              {getTotalPenalty() > 0 && (
                <div className="penalty-info">
                  +{getTotalPenalty()}s penalty
                </div>
              )}
            </div>

            <div className="scenarios-summary">
              <h3>Scenarios Summary</h3>
              <div className="scenarios-list">
                {gameResult.scenarioRuns.map((sr, idx) => (
                  <div
                    key={idx}
                    className={`scenario-row ${sr.result}`}
                    style={{ animationDelay: `${idx * 70}ms` }}
                  >
                    <span className="scenario-num">Scenario {idx + 1}</span>
                    <span className="scenario-result">
                      <ScenarioStatusBadge success={sr.result === 'success'} />
                      {sr.result === 'success' ? 'Success' : 'Failed'}
                    </span>
                    <span className="scenario-time">
                      {(sr.time_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!loading && (
            <div className="leaderboard-section">
              <div className="leaderboard-header">
                <h3>Top 10 Leaderboard</h3>
                {playerRank && (
                  <div className="player-rank">
                    <span className="rank-label">Your Rank:</span>
                    <span className="rank-value">
                      #{playerRank.rank}
                    </span>
                  </div>
                )}
              </div>

              <div className="leaderboard-table">
                <div className="leaderboard-row header">
                  <div className="col-rank">Rank</div>
                  <div className="col-name">Name</div>
                  <div className="col-time">Time</div>
                </div>

                {leaderboard.map((player, idx) => (
                  <div
                    key={idx}
                    className={`leaderboard-row ${
                      playerRank && playerRank.player_id === player.id
                        ? 'highlight'
                        : ''
                    }`}
                    style={{ animationDelay: `${idx * 55}ms` }}
                  >
                    <div className="col-rank">
                      <RankBadge rank={idx + 1} />
                    </div>
                    <div className="col-name">{player.name}</div>
                    <div className="col-time">
                      {formatTime(player.best_time_ms)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="play-again-btn" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>

      <img src="/extreme-logo.png" alt="Extreme Networks" className="result-logo" />
    </div>
  )
}

export default ResultScreen
