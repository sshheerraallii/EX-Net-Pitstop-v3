import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PlayerEntry from './components/PlayerEntry'
import ScenarioGame from './components/ScenarioGame'
import ResultScreen from './components/ResultScreen'
import IntroVideo from './components/IntroVideo'
import SpectatorLeaderboard from './components/SpectatorLeaderboard'
import AppMenu from './components/AppMenu'
import { API_BASE } from './config'
import './App.css'

// Minimal path router - no router dependency. Two surfaces live at clean
// links so each can be opened directly (e.g. put the leaderboard on a
// second screen at the booth):
//   /            -> the kiosk game flow
//   /leaderboard -> the standalone spectator leaderboard
// Whatever serves this build needs an SPA fallback (serve index.html for
// unknown paths) so the deep links survive a refresh.
function routeFromPath(pathname) {
  return pathname.replace(/\/+$/, '').toLowerCase().endsWith('/leaderboard')
    ? 'leaderboard'
    : 'game'
}

function App() {
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname))
  const [gameState, setGameState] = useState('intro') // intro, playerEntry, game, result
  const [player, setPlayer] = useState(null)
  const [run, setRun] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [gameResult, setGameResult] = useState(null)

  const navigate = useCallback((to) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to)
    }
    setRoute(routeFromPath(to))
  }, [])

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const handlePlayerCreated = async (playerData) => {
    setPlayer(playerData)
    try {
      const response = await axios.post(`${API_BASE}/run/start`, {
        player_id: playerData.id,
      })
      setRun(response.data.run)
      setGameState('game')
    } catch (error) {
      console.error('Failed to start run:', error)
    }
  }

  const handleGameComplete = async (totalTimeMs, scenarioRuns) => {
    try {
      const response = await axios.post(`${API_BASE}/run/complete`, {
        run_id: run.id,
        time_ms: totalTimeMs,
      })
      // The backend folds any silent wrong-port penalties into the run's
      // time_ms; use that so the result screen matches the leaderboard.
      const completedRun = response.data.run
      setGameResult({
        player,
        run: completedRun,
        scenarioRuns,
        totalTime: Number(completedRun?.time_ms) || totalTimeMs,
      })
      setGameState('result')
    } catch (error) {
      console.error('Failed to complete run:', error)
    }
  }

  const handleRestartGame = () => {
    setGameState('intro')
    setPlayer(null)
    setRun(null)
    setScenarios([])
    setGameResult(null)
  }

  return (
    <div className="app">
      {route === 'leaderboard' ? (
        <SpectatorLeaderboard />
      ) : (
        <>
          {gameState === 'intro' && (
            <IntroVideo onVideoEnd={() => setGameState('playerEntry')} />
          )}

          {gameState === 'playerEntry' && (
            <PlayerEntry onPlayerCreated={handlePlayerCreated} />
          )}

          {gameState === 'game' && run && (
            <ScenarioGame
              runId={run.id}
              player={player}
              onGameComplete={handleGameComplete}
            />
          )}

          {gameState === 'result' && gameResult && (
            <ResultScreen
              gameResult={gameResult}
              onPlayAgain={handleRestartGame}
            />
          )}
        </>
      )}

      <AppMenu route={route} onNavigate={navigate} apiBase={API_BASE} />
    </div>
  )
}

export default App
