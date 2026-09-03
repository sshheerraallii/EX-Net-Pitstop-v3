import './SuccessModal.css'
import AgentChatBubble from './AgentChatBubble'

// Each category gets its own success video (different source footage, so
// different colors/tinting) instead of one shared clip. Named to match the
// existing success_image convention already used per scenario.name prefix.
// The tint is per-category too - each clip's own colors needed a different
// gradient/opacity to read as on-brand without crushing the footage.
function successCategory(scenarioName) {
  const name = scenarioName || ''
  if (name.includes('AP')) return 'ap'
  if (name.includes('Branch')) return 'branch'
  if (name.includes('DataCenter')) return 'datacenter'
  return 'firmware'
}

function SuccessModal({ successMessage, messageKey, scenarioName }) {
  const category = successCategory(scenarioName)
  const videoSrc = `success-${category}.mp4`

  return (
    <div className="success-modal">
      {/* key forces the <video> to remount (and reload the new src) when the
          category changes, since browsers don't reliably pick up a changed
          src on an already-mounted video element. */}
      <video
        key={videoSrc}
        autoPlay
        loop
        muted
        className="success-video"
        src={`http://localhost:3001/${videoSrc}`}
      />
      <div className={`success-video-tint success-video-tint--${category}`}></div>

      <div className="success-badge-wrap">
        <div className="success-badge">&#10003;</div>
      </div>

      <AgentChatBubble messageKey={messageKey} message={successMessage || 'Task complete!'} />

      {/* Same Extreme Networks lockup the old success images had baked into
          their bottom-right corner - carried over so the branding doesn't
          disappear now that the corner is video instead of a flat image. */}
      <img src="/extreme-logo.png" alt="Extreme Networks" className="success-logo" />
    </div>
  )
}

export default SuccessModal
