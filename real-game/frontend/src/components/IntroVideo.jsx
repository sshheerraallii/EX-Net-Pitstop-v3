import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { API_BASE, backendUrl } from '../config'
import { TABLET_CHECKIN_POLL_MS, TABLET_CHECKIN_COUNTDOWN_SECONDS } from '../config/tabletCheckin'
import { fetchPendingCheckins, claimCheckin, parseServerTime } from '../config/checkinRelay'
import './IntroVideo.css'

// The kiosk's idle / attract screen. Modelled on Extreme Platform ONE's
// "Extreme Agent ONE has arrived." landing page. It just sits here whenever
// nobody is playing, polling the tablet check-in relay. When a player is
// checked in on the tablet it claims them, runs a countdown that lines up
// with the tablet's, then hands off to the game.

function IntroVideo({ onGameStart }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [phase, setPhase] = useState('idle') // idle | countdown
  const [pendingName, setPendingName] = useState('')
  const [secsLeft, setSecsLeft] = useState(TABLET_CHECKIN_COUNTDOWN_SECONDS)

  const claimingRef = useRef(false)
  const playerRef = useRef(null)
  const endsAtRef = useRef(0)

  // Admin-configurable background video (dim, blurred - just texture).
  useEffect(() => {
    let alive = true
    axios
      .get(`${API_BASE}/admin/intro/current`)
      .then((res) => {
        if (alive && res.data && res.data.currentIntroVideo) {
          setVideoUrl(backendUrl(res.data.currentIntroVideo))
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const beginCountdown = useCallback((checkin, player) => {
    playerRef.current = player
    setPendingName(checkin.name || 'Agent')

    // Count down to the moment the relay set (start_at), so the tablet and
    // the kiosk match. If that moment is missing or already gone (a queued
    // player whose timer lapsed while someone else was playing), start a
    // fresh full-length countdown now.
    const target = parseServerTime(checkin.start_at)
    const now = Date.now()
    const endsAt =
      target && target.getTime() - now > 1500
        ? target.getTime()
        : now + TABLET_CHECKIN_COUNTDOWN_SECONDS * 1000

    endsAtRef.current = endsAt
    setSecsLeft(Math.max(1, Math.ceil((endsAt - now) / 1000)))
    setPhase('countdown')
  }, [])

  // Poll for a check-in while idle.
  useEffect(() => {
    if (phase !== 'idle') return
    let alive = true

    const poll = async () => {
      if (!alive || claimingRef.current) return
      let list = []
      try {
        list = await fetchPendingCheckins()
      } catch (_) {
        return
      }
      if (!alive || claimingRef.current || phase !== 'idle') return

      const next = list[0] // oldest pending first
      if (!next) return

      claimingRef.current = true
      try {
        const playerRes = await axios.post(`${API_BASE}/player/manual`, {
          name: next.name,
          country: next.country || null,
          source: 'tablet',
        })
        claimCheckin(next.id) // best effort, non-blocking
        if (alive) beginCountdown(next, playerRes.data.player)
      } catch (err) {
        console.error('Failed to start game for checked-in player:', err)
        claimingRef.current = false // let the next poll retry
      }
    }

    poll()
    const timer = setInterval(poll, TABLET_CHECKIN_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [phase, beginCountdown])

  // Run the countdown, then start the game.
  useEffect(() => {
    if (phase !== 'countdown') return
    let alive = true

    const tick = () => {
      if (!alive) return
      const left = Math.ceil((endsAtRef.current - Date.now()) / 1000)
      if (left <= 0) {
        clearInterval(timer)
        setSecsLeft(0)
        onGameStart(playerRef.current)
        return
      }
      setSecsLeft(left)
    }

    tick()
    const timer = setInterval(tick, 250)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [phase, onGameStart])

  return (
    <div className="intro-video">
      {videoUrl && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="intro-bg-video"
            src={videoUrl}
          />
          <div className="intro-bg-veil" />
        </>
      )}

      <div className="intro-ambient" aria-hidden="true" />

      <header className="intro-topbar">
        <img src="/extreme-logo.png" alt="Extreme Networks" className="intro-brand" />
      </header>

      <div className="intro-stack">
        <img
          src="/agent-one-logo.svg"
          className="intro-prism"
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <h1 className="intro-headline">
          <img
            src="/agent-one-logo.svg"
            className="intro-headline-mark"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <span>
            Extreme Agent ONE<span className="intro-tm">&#8482;</span> has arrived.
          </span>
        </h1>

        {phase === 'countdown' ? (
          <div className="intro-countdown">
            <div className="intro-countdown-name">Get ready, {pendingName}</div>
            <div className="intro-countdown-num">{secsLeft}</div>
            <div className="intro-countdown-hint">Your incident briefing is loading…</div>
          </div>
        ) : (
          <>
            <p className="intro-sub">
              A live incident is unfolding on the network. Step in, take the
              controls, and bring it back online before the clock runs out.
            </p>
            <p className="intro-waiting">Check in at the desk to play.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default IntroVideo
