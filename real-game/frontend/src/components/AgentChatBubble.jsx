import { useState, useEffect } from 'react'
import './AgentChatBubble.css'

// Agent One's messages now live in an actual chat-widget popup anchored to
// the bottom-left corner, instead of a static text line in a header bar -
// avatar + speech bubble, pops in with a spring animation whenever a new
// scenario loads, "thinking" dots, then a character-by-character type-out,
// then the required-ports instruction settles in as a task chip.

function RobotIcon() {
  // Same mascot used elsewhere in the build, recolored to the brand palette
  // (white on the violet/indigo avatar circle instead of the original
  // off-brand green disc).
  return (
    <svg viewBox="0 0 100 100" className="agent-chat-avatar-icon" aria-hidden="true">
      <rect x="28" y="18" width="44" height="38" rx="3" fill="white" />
      <rect x="47" y="6" width="6" height="14" fill="white" />
      <circle cx="50" cy="3" r="3" fill="white" />
      <circle cx="36" cy="28" r="3.5" fill="var(--indigo)" />
      <circle cx="64" cy="28" r="3.5" fill="var(--indigo)" />
      <line x1="40" y1="40" x2="45" y2="40" stroke="var(--indigo)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="55" y1="40" x2="60" y2="40" stroke="var(--indigo)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="16" y="32" width="6" height="18" rx="2" fill="white" />
      <rect x="78" y="32" width="6" height="18" rx="2" fill="white" />
      <rect x="26" y="58" width="48" height="28" rx="2" fill="white" />
      <rect x="12" y="62" width="6" height="18" rx="2" fill="white" />
      <rect x="82" y="62" width="6" height="18" rx="2" fill="white" />
    </svg>
  )
}

// `message` is what Agent One types out. `taskText` is optional - when
// given, it settles in below the message as a highlighted chip once typing
// finishes (used for the "plug in ports X" instruction on the scenario
// screen); when omitted, the bubble is just the message alone (used on the
// success screen). `messageKey` lets a caller force the pop/type sequence
// to replay even if the message text itself happens to repeat.
function AgentChatBubble({ message, taskText, messageKey }) {
  const [displayedText, setDisplayedText] = useState('')
  const [typingPhase, setTypingPhase] = useState('thinking') // thinking | typing | done
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const fullMessage = message || ''
    // Dropping "visible" first (briefly) and re-adding it lets the popup
    // play its close/reopen transition every time the message changes, not
    // just on the very first mount - reads as the old message ducking out
    // and the new one popping in.
    setVisible(false)
    setDisplayedText('')
    setTypingPhase('thinking')

    let charIndex = 0
    let typingInterval

    const popTimeout = setTimeout(() => {
      setVisible(true)
    }, 30)

    const thinkingTimeout = setTimeout(() => {
      setTypingPhase('typing')
      typingInterval = setInterval(() => {
        charIndex += 1
        setDisplayedText(fullMessage.slice(0, charIndex))
        if (charIndex >= fullMessage.length) {
          clearInterval(typingInterval)
          setTypingPhase('done')
        }
      }, 22)
    }, 650)

    return () => {
      clearTimeout(popTimeout)
      clearTimeout(thinkingTimeout)
      clearInterval(typingInterval)
    }
  }, [messageKey, message])

  return (
    <div className={`agent-chat-widget ${visible ? 'visible' : ''}`}>
      <div className="agent-chat-bubble">
        <div className="agent-chat-bubble-header">
          <span className="agent-chat-name">Agent One</span>
          <span className="agent-chat-status-dot"></span>
        </div>

        <p className="agent-chat-message">
          {typingPhase === 'thinking' ? (
            <span className="typing-dots" aria-label="Agent One is typing">
              <span></span><span></span><span></span>
            </span>
          ) : (
            <>
              {displayedText}
              {typingPhase === 'typing' && <span className="typing-cursor" aria-hidden="true" />}
            </>
          )}
        </p>

        {taskText && (
          <div className={`agent-chat-task ${typingPhase === 'done' ? 'visible' : ''}`}>{taskText}</div>
        )}
      </div>

      <div className="agent-chat-avatar-row">
        <div className="agent-chat-avatar">
          <span className="agent-chat-avatar-ring"></span>
          <RobotIcon />
        </div>
      </div>
    </div>
  )
}

export default AgentChatBubble
