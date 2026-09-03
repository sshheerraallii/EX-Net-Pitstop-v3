import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  TABLET_CHECKIN_API,
  TABLET_CHECKIN_KEY,
  TABLET_CHECKIN_CONFIGURED,
  TABLET_CHECKIN_POLL_MS,
} from '../config/tabletCheckin'
import './TabletCheckinPicker.css'

// MySQL's NOW() reflects the DB server's clock - Hostinger defaults to UTC,
// so treat a timestamp with no timezone suffix as UTC. If a Hostinger plan
// is ever configured otherwise, adjust the "Z" fallback below.
function parseServerTime(value) {
  if (!value) return null
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function timeAgo(value) {
  const d = parseServerTime(value)
  if (!d) return ''
  const seconds = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hr ago`
}

function TabletCheckinPicker({ apiBase, onPlayerCreated }) {
  const [checkins, setCheckins] = useState([])
  const [status, setStatus] = useState(TABLET_CHECKIN_CONFIGURED ? 'loading' : 'not-configured') // loading | ok | unreachable | not-configured
  const [claimingId, setClaimingId] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  const fetchCheckins = useCallback(async () => {
    if (!TABLET_CHECKIN_CONFIGURED) return
    try {
      const res = await axios.get(`${TABLET_CHECKIN_API}/checkin_list.php`, {
        headers: { 'X-Checkin-Key': TABLET_CHECKIN_KEY },
        timeout: 6000,
      })
      if (res.data && res.data.success) {
        setCheckins(res.data.checkins || [])
        setStatus('ok')
      } else {
        setStatus('unreachable')
      }
    } catch (err) {
      setStatus('unreachable')
    }
  }, [])

  useEffect(() => {
    if (!TABLET_CHECKIN_CONFIGURED) return
    fetchCheckins()
    pollRef.current = setInterval(fetchCheckins, TABLET_CHECKIN_POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [fetchCheckins])

  const handlePick = async (checkin) => {
    if (claimingId) return
    setClaimingId(checkin.id)
    setError('')

    try {
      // Create the local player first - if this fails, nothing on the
      // relay has changed, so the entry is still safe to retry.
      const playerRes = await axios.post(`${apiBase}/player/manual`, {
        name: checkin.name,
        country: checkin.country || null,
        source: 'tablet',
      })

      // Best-effort: mark it claimed on the relay so it drops off every
      // kiosk's list. If this call fails, the player already started -
      // don't block them on it, just let it get cleaned up by staleness.
      axios
        .post(
          `${TABLET_CHECKIN_API}/checkin_claim.php`,
          { id: checkin.id },
          { headers: { 'X-Checkin-Key': TABLET_CHECKIN_KEY }, timeout: 6000 }
        )
        .catch(() => {})

      setCheckins((prev) => prev.filter((c) => c.id !== checkin.id))
      onPlayerCreated(playerRes.data.player)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start the game for that player. Please try again.')
      setClaimingId(null)
    }
  }

  if (status === 'not-configured') {
    return (
      <div className="tablet-checkin-picker">
        <div className="tcp-empty tcp-setup">
          <p>Tablet check-in isn't set up yet.</p>
          <p className="tcp-empty-sub">Deploy the tablet-checkin relay and fill in its config to enable this tab.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tablet-checkin-picker">
      <div className="tcp-header">
        <span className={`tcp-live-dot ${status === 'ok' ? 'live' : ''}`} />
        <span className="tcp-header-label">
          {status === 'unreachable' ? "Can't reach check-in service - retrying..." : 'Live from tablet check-in'}
        </span>
      </div>

      {error && <div className="tcp-error">{error}</div>}

      {status !== 'unreachable' && checkins.length === 0 && (
        <div className="tcp-empty">
          <p>No check-ins waiting yet.</p>
          <p className="tcp-empty-sub">Ask a staff member to check the player in on the tablet.</p>
        </div>
      )}

      <ul className="tcp-list">
        {checkins.map((c) => (
          <li key={c.id}>
            <button
              className="tcp-item"
              onClick={() => handlePick(c)}
              disabled={claimingId !== null}
            >
              <span className="tcp-item-main">
                <span className="tcp-item-name">{c.name}</span>
                {c.country && <span className="tcp-item-country">{c.country}</span>}
              </span>
              <span className="tcp-item-meta">
                {claimingId === c.id ? <span className="tcp-spin">&#10227;</span> : timeAgo(c.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TabletCheckinPicker
