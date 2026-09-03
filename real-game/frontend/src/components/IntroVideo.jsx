import { useState, useEffect } from 'react'
import './IntroVideo.css'

function AgentSignal() {
  return (
    <div className="agent-signal">
      <svg className="agent-signal-rings" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="signal-ring ring-1" cx="100" cy="100" r="30" />
        <circle className="signal-ring ring-2" cx="100" cy="100" r="30" />
        <circle className="signal-ring ring-3" cx="100" cy="100" r="30" />
        <circle className="signal-node" cx="100" cy="100" r="14" />
      </svg>
      <div className="agent-signal-text">
        <span className="agent-signal-line line-1">Agent</span>
        <span className="agent-signal-line line-2">One</span>
      </div>
    </div>
  )
}

function IntroVideo({ onVideoEnd }) {
  const [countdown, setCountdown] = useState(10)
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => {
    // Fetch the current intro video from admin endpoint
    const fetchVideo = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/admin/intro/current')
        const data = await response.json()
        setVideoUrl(`http://localhost:3001${data.currentIntroVideo}`)
      } catch (error) {
        console.error('Failed to load intro video:', error)
        setVideoUrl('http://localhost:3001/intovideo.mp4')
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
            className="video-player"
            src={videoUrl}
          />
          <div className="video-tint" />
        </>
      )}

      <div className="intro-stack">
        <AgentSignal />

        <div className="countdown-container">
          <div className="red-light">
            <div className={`light ${countdown <= 5 ? 'blinking' : ''}`}></div>
          </div>
          <div className="countdown-text">{countdown}</div>
        </div>
      </div>

      <div className="tap-prompt">
        <p>Ready? Tap to continue</p>
      </div>

      <button
        className="continue-btn"
        onClick={() => setCountdown(0)}
        title="Start the game"
      >
        Start Game
      </button>
    </div>
  )
}

export default IntroVideo
