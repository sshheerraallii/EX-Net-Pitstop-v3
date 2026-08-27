import { useState, useEffect } from 'react'
import axios from 'axios'
import PlayerEntry from './components/PlayerEntry'
import ScenarioGame from './components/ScenarioGame'
import ResultScreen from './components/ResultScreen'
import IntroVideo from './components/IntroVideo'
import './App.css'

const API_BASE = 'http://localhost:3001/api'

function App() {
  const [gameState, setGameState] = useState('intro') // intro, playerEntry, game, result
  const [player, setPlayer] = useState(null)
  const [run, setRun] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [gameResult, setGameResult] = useState(null)

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
      setGameResult({
        player,
        run: response.data.run,
        scenarioRuns,
        totalTime: totalTimeMs,
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
    </div>
  )
}

export default App
