import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ScenarioDisplay from './ScenarioDisplay'
import SuccessModal from './SuccessModal'
import './ScenarioGame.css'

const API_BASE = 'http://localhost:3001/api'

function ScenarioGame({ runId, player, onGameComplete }) {
  const [currentScenarioRun, setCurrentScenarioRun] = useState(null)
  const [scenarioDetails, setScenarioDetails] = useState(null)
  const [gameStartTime] = useState(Date.now())
  const [scenarioStartTime, setScenarioStartTime] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [allScenarioRuns, setAllScenarioRuns] = useState([])
  const [error, setError] = useState('')

  // Load initial scenarios (only once per runId)
  const scenariosLoadedRef = useRef(false)

  useEffect(() => {
    if (scenariosLoadedRef.current) return
    scenariosLoadedRef.current = true

    const loadScenarios = async () => {
      try {
        console.log('Loading scenarios for runId:', runId)
        const response = await axios.post(`${API_BASE}/scenarios/load-game`, {
          run_id: runId,
        })
        console.log('Scenarios loaded:', response.data.scenarios)
        setAllScenarioRuns(response.data.scenarios)
        loadCurrentScenario()
      } catch (err) {
        console.error('Failed to load scenarios:', err)
        setError('Failed to load scenarios: ' + (err.response?.data?.message || err.message))
      }
    }

    loadScenarios()
  }, [runId])

  // Load current scenario
  const loadCurrentScenario = async () => {
    console.log('🔄 loadCurrentScenario called')
    setLoading(true)
    try {
      console.log('📍 Fetching current scenario for runId:', runId)
      const response = await axios.get(`${API_BASE}/scenarios/current/${runId}`)
      console.log('✅ Current scenario response:', response.data)

      if (response.data.allCompleted) {
        console.log('🏁 All scenarios completed!')
        // All scenarios done, calculate final time
        const totalTime = Date.now() - gameStartTime
        const scenarioRunsWithDetails = response.data.scenarioRuns.map(sr => ({
          ...sr,
          required_ports: JSON.parse(sr.required_ports)
        }))
        onGameComplete(totalTime, scenarioRunsWithDetails)
        return
      }

      console.log('📝 Setting scenario:', response.data.scenario.name, 'ID:', response.data.scenario.id)
      setCurrentScenarioRun(response.data.scenarioRun)
      setScenarioDetails(response.data.scenario)
      setScenarioStartTime(Date.now())
      setShowSuccess(false)
      console.log('✔️ Current scenario loaded - Order:', response.data.progress.current, '/', response.data.progress.total)
    } catch (err) {
      console.error('❌ Failed to load current scenario:', err)
      setError('Failed to load current scenario: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  // TODO: Add physical switch polling when SNMP integration is ready
  // For now, display scenarios with waiting message overlay

  const handleManualAdvance = async () => {
    if (!currentScenarioRun || !scenarioDetails) return

    const timeMs = Date.now() - scenarioStartTime

    try {
      const response = await axios.post(`${API_BASE}/scenarios/submit`, {
        scenario_run_id: currentScenarioRun.id,
        run_id: runId,
        plugged_ports: scenarioDetails.required_ports,
        time_ms: timeMs,
      })

      setAllScenarioRuns((prev) => {
        const updated = [...prev]
        const idx = updated.findIndex((sr) => sr.id === currentScenarioRun.id)
        if (idx !== -1) {
          updated[idx] = response.data.scenarioRun
        }
        return updated
      })

      setShowSuccess(true)

      setTimeout(() => {
        if (response.data.allCompleted) {
          const totalTime = Date.now() - gameStartTime
          onGameComplete(totalTime, allScenarioRuns)
        } else {
          loadCurrentScenario()
        }
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to advance scenario')
    }
  }

  if (loading) {
    return (
      <div className="scenario-game loading">
        <div className="spinner"></div>
        <p>Loading scenario...</p>
      </div>
    )
  }

  return (
    <div className="scenario-game">
      {error && <div className="error-banner">{error}</div>}

      {scenarioDetails && (
        <ScenarioDisplay
          scenario={scenarioDetails}
          progress={{
            current: currentScenarioRun?.scenario_order || 1,
            total: allScenarioRuns.length,
          }}
          requiredPorts={scenarioDetails.required_ports}
        />
      )}

      {scenarioDetails && !showSuccess && (
        <button
          onClick={handleManualAdvance}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            zIndex: 50,
          }}
        >
          Test: Skip Scenario
        </button>
      )}

      {showSuccess && scenarioDetails && (
        <SuccessModal imagePath={scenarioDetails.success_image} />
      )}
    </div>
  )
}

export default ScenarioGame
