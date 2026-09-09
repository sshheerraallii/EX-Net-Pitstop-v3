import { useState, useEffect } from 'react'
import { API_BASE, backendUrl } from '../config'
import './IntroVideo.css'

// First screen. Modelled on Extreme Platform ONE's "Extreme Agent ONE has
// arrived." landing page: near-black canvas with a soft violet/magenta
// ambient, the real Agent One prism mark floating centre stage, the product
// headline, a game hook, and a glowing pill CTA in place of the product's
// "Ask me anything" bar. Auto-advances on a quiet countdown for the kiosk.

function IntroVideo({ onVideoEnd }) {
  const [countdown, setCountdown] = useState(12)
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => {
    // The intro video is admin-configurable; if it loads it sits far back
    // as a dim, blurred backdrop behind the Agent One composition. If the
    // fetch fails the ambient gradient carries the screen on its own.
    const fetchVideo = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/intro/current`)
        const data = await response.json()
        setVideoUrl(backendUrl(data.currentIntroVideo))
      } catch (error) {
        console.error('Failed to load intro video:', error)
      }
    }
    fetchVideo()
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      onVideoEnd()
      return
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown, onVideoEnd])

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
          Extreme Agent ONE<span className="intro-tm">&#8482;</span> has arrived.
        </h1>

        <p className="intro-sub">
          A live incident is unfolding on the network. Step in, take the
          controls, and bring it back online before the clock runs out.
        </p>

        <button
          className="intro-cta"
          onClick={() => setCountdown(0)}
          title="Start the game"
        >
          <img
            src="/agent-one-logo.svg"
            className="intro-cta-icon"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <span className="intro-cta-label">Tap to begin</span>
          <span className="intro-cta-divider" aria-hidden="true"></span>
          <span className="intro-cta-hint">auto-starts in {countdown}s</span>
        </button>
      </div>
    </div>
  )
}

export default IntroVideo
