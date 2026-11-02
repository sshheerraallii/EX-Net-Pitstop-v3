import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { API_BASE, backendUrl } from '../config'
import { TABLET_CHECKIN_POLL_MS, TABLET_CHECKIN_COUNTDOWN_SECONDS } from '../config/tabletCheckin'
import { fetchPendingCheckins, claimCheckin, parseServerTime } from '../config/checkinRelay'
import NeonBackdrop from './NeonBackdrop'
import { unlockAudio, playSfx } from '../audio'
import './IntroVideo.css'

// The kiosk's idle / attract screen: the mission title card.
//
// The check-in logic is unchanged from before - it polls the tablet relay,
// claims the oldest pending player, and runs a countdown synced to the
// tablet's own. What changed is everything visual, plus one important side
// effect: the START MISSION button is the page's first user gesture, which is
// what lets audio play for the rest of the session.

function IntroVideo({ onGameStart, onStartMission }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [phase, setPhase] = useState('idle') // idle | countdown
  const [pendingName, setPendingName] = useState('')
  const [secsLeft, setSecsLeft] = useState(TABLET_CHECKIN_COUNTDOWN_SECONDS)
  const [armed, setArmed] = useState(false) // audio unlocked by a real gesture

  const claimingRef = useRef(false)
  const playerRef = useRef(null)
  const endsAtRef = useRef(0)
  const lastBeepRef = useRef(null)

  // Admin-configurable background video, kept as faint texture behind the
  // drawn backdrop rather than the main visual.
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

  // Any touch anywhere counts as the gesture that enables sound. Booth staff
  // or a curious passer-by brushing the screen is enough, so the music is
  // usually already running by the time a player arrives.
  useEffect(() => {
    if (armed) return
    const arm = () => {
      unlockAudio()
      setArmed(true)
    }
    window.addEventListener('pointerdown', arm, { once: true })
    window.addEventListener('keydown', arm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [armed])

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
    playSfx('whoosh')
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
        playSfx('beep5')
        onGameStart(playerRef.current)
        return
      }
      // One beep per whole second, and only on the last few, so the count
      // reads as a race light rather than a metronome.
      if (left <= 3 && lastBeepRef.current !== left) {
        lastBeepRef.current = left
        playSfx('beep')
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

  const handleStartMission = () => {
    unlockAudio()
    setArmed(true)
    playSfx('whoosh')
    if (onStartMission) onStartMission()
  }

  return (
    <div className="intro-screen">
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

      <NeonBackdrop />

      <header className="intro-topbar">
        <img src="/extreme-logo.png" alt="Extreme Networks" className="intro-brand" />
      </header>

      <div className="intro-stack">
        <div className="intro-lockup">
          <img
            src="/agent-one-logo.svg"
            className="intro-prism"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <div className="intro-wordmark">
            AGENT ONE<span className="intro-tm">&#8482;</span>
          </div>
        </div>

        {phase === 'countdown' ? (
          <div className="intro-countdown">
            <div className="intro-countdown-name">Get ready, {pendingName}</div>
            <div className="intro-countdown-num" key={secsLeft}>
              {secsLeft}
            </div>
            <div className="intro-countdown-hint">Your incident briefing is loading</div>
          </div>
        ) : (
          <>
            <h1 className="intro-headline">
              <span className="intro-headline-top">MEET</span>
              <span className="intro-headline-main">
                AGENT <em className="intro-headline-one">ONE</em>
                <span className="intro-headline-tm">&#8482;</span>
              </span>
            </h1>

            <p className="intro-tagline">
              <span className="intro-tagline-accent">Four network incidents.</span>{' '}
              <span className="intro-tagline-strong">One mission.</span>
            </p>
            <p className="intro-sub">
              Restore every site before the system reaches critical status.
            </p>

            <button
              type="button"
              className="intro-cta"
              onClick={handleStartMission}
              disabled={!onStartMission}
            >
              <span className="intro-cta-label">START MISSION</span>
              <span className="intro-cta-arrow" aria-hidden="true">
                <svg viewBox="0 0 16 18" width="14" height="16">
                  <path d="M1 1 L15 9 L1 17 Z" fill="currentColor" />
                </svg>
              </span>
            </button>

            <p className="intro-waiting">Check in at the desk to play.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default IntroVideo
