import axios from 'axios'
import { useState, useEffect } from 'react'
import './ResultScreen.css'

const API_BASE = 'http://localhost:3001/api'

function ResultScreen({ gameResult, onPlayAgain }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [playerRank, setPlayerRank] = useState(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="result-screen">
      <div className="result-container">
        <div className="result-header">
          <h1>Game Complete!</h1>
          <p className="player-name">{gameResult.player.name}</p>
        </div>

        <div className="result-content">
          <div className="time-section">
            <div className="time-display">
              <div className="time-label">Your Time</div>
              <div className="time-value">
                {formatTime(gameResult.totalTime)}
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
                  <div key={idx} className={`scenario-row ${sr.result}`}>
                    <span className="scenario-num">Scenario {idx + 1}</span>
                    <span className="scenario-result">
                      {sr.result === 'success' ? '✓ Success' : '✗ Failed'}
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
                  >
                    <div className="col-rank">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                      {idx > 2 && `#${idx + 1}`}
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
    </div>
  )
}

export default ResultScreen
