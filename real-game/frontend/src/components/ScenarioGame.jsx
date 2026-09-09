import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ScenarioDisplay from './ScenarioDisplay'
import SuccessModal from './SuccessModal'
import './ScenarioGame.css'

const API_BASE = 'http://localhost:3001/api'

// How often the kiosk asks the backend for live switch port state.
const POLL_INTERVAL_MS = 500
// Plugging a cable bounces link state, so require the completion condition to hold
// across consecutive polls before acting on it.
const STABLE_POLLS_REQUIRED = 2

// Keyboard stand-in for the physical switch, so the game can be exercised end to end
// without hardware — and on the same build that ships, not a dev-only path.
// 1-9 are ports 1-9; A-O continue from port 10 through 24.
const KEY_PORT_MAP = (() => {
  const map = {}
  for (let i = 1; i <= 9; i += 1) map[String(i)] = i
  'abcdefghijklmno'.split('').forEach((ch, idx) => {
    map[ch] = idx + 10
  })
  return map
})()

function ScenarioGame({ runId, player, onGameComplete }) {
  const [currentScenarioRun, setCurrentScenarioRun] = useState(null)
  const [scenarioDetails, setScenarioDetails] = useState(null)
  const [gameStartTime] = useState(Date.now())
  const [scenarioStartTime, setScenarioStartTime] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [allScenarioRuns, setAllScenarioRuns] = useState([])
  const [error, setError] = useState('')
  const [livePluggedPorts, setLivePluggedPorts] = useState([])
  const [switchOnline, setSwitchOnline] = useState(true)
  const [simulated, setSimulated] = useState(false)

  // Guards against a second submit firing while the first is in flight.
  const submittingRef = useRef(false)
  const stablePollsRef = useRef(0)

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

  // Tell the backend which ports this scenario targets, then watch live switch state.
  // The scenario resolves once the player has plugged in as many ports as required —
  // right or wrong. The backend applies the flat penalty when they're wrong.
  useEffect(() => {
    if (!scenarioDetails || !currentScenarioRun) return

    let cancelled = false
    submittingRef.current = false
    stablePollsRef.current = 0
    setLivePluggedPorts([])

    const startAndPoll = async () => {
      try {
        await axios.post(`${API_BASE}/game/start`, {
          targetPorts: scenarioDetails.required_ports,
        })
      } catch (err) {
        console.error('Failed to arm switch session:', err.message)
      }

      const poll = async () => {
        if (cancelled || submittingRef.current) return

        try {
          const { data } = await axios.get(`${API_BASE}/game/status`)
          if (cancelled) return

          setSwitchOnline(data.snmpOk !== false)
          setSimulated(data.simulated === true)
          setLivePluggedPorts(data.newlyPluggedPorts || [])

          // A dropped SNMP read serves stale state, and the baseline isn't known
          // until the first successful read. Neither should advance a scenario.
          // Simulated mode has no SNMP feed by definition, so snmpOk being false
          // there is expected and must not block advancement.
          if ((data.snmpOk === false && !data.simulated) || !data.baselineCaptured) {
            stablePollsRef.current = 0
            return
          }

          if (data.countComplete) {
            stablePollsRef.current += 1

            if (stablePollsRef.current >= STABLE_POLLS_REQUIRED) {
              submittingRef.current = true
              submitScenario(data.newlyPluggedPorts || [])
            }
          } else {
            stablePollsRef.current = 0
          }
        } catch (err) {
          // Backend unreachable: hold steady rather than failing the run.
          if (!cancelled) setSwitchOnline(false)
        }
      }

      const timer = setInterval(poll, POLL_INTERVAL_MS)
      poll()
      return timer
    }

    let timerPromise = startAndPoll()

    return () => {
      cancelled = true
      timerPromise.then((timer) => timer && clearInterval(timer))
    }
  }, [currentScenarioRun?.id, scenarioDetails?.id])

  const submitScenario = async (pluggedPorts) => {
    if (!currentScenarioRun || !scenarioDetails) return

    const timeMs = Date.now() - scenarioStartTime

    try {
      const response = await axios.post(`${API_BASE}/scenarios/submit`, {
        scenario_run_id: currentScenarioRun.id,
        run_id: runId,
        plugged_ports: pluggedPorts,
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
      submittingRef.current = false
      setError(err.response?.data?.message || 'Failed to advance scenario')
    }
  }

  // Keyboard toggles hit the same /api/port endpoint the SNMP poller feeds, so a
  // simulated run exercises the real completion path rather than bypassing it.
  useEffect(() => {
    if (!scenarioDetails) return

    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (submittingRef.current) return

      const target = event.target
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return

      const port = KEY_PORT_MAP[String(event.key).toLowerCase()]
      if (!port) return

      event.preventDefault()
      axios.post(`${API_BASE}/port/toggle/${port}`).catch((err) => {
        console.error(`Port ${port} toggle failed:`, err.message)
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scenarioDetails?.id])

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
          pluggedPorts={livePluggedPorts}
        />
      )}

      {simulated && (
        <div className="switch-offline-note">
          Keyboard mode — 1-9 and A-O toggle ports 1-24
        </div>
      )}

      {!switchOnline && !simulated && (
        <div className="switch-offline-note">Switch link lost — retrying</div>
      )}

      {showSuccess && scenarioDetails && (
        <SuccessModal
          messageKey={currentScenarioRun?.id}
          successMessage={scenarioDetails.success_message}
          scenarioName={scenarioDetails.name}
        />
      )}
    </div>
  )
}

export default ScenarioGame
