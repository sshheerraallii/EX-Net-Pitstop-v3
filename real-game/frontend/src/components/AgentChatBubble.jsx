import { useState, useEffect } from 'react'
import './AgentChatBubble.css'

// Agent One's messages live in an actual chat-widget popup anchored to the
// bottom-left corner. The "Nudge" (the instruction telling the player what
// to do) is a separate, larger, glowing panel that sits ABOVE the chat
// bubble and lands FIRST; the chat bubble then pops in below it, "thinks",
// and types Agent One's message out character by character.

function AgentOneMark() {
  // The real Extreme "Agent One" product mark - the colorful prism/triangle
  // logo, served as a static asset (public/agent-one-logo.svg) the same way
  // the Extreme wordmark is. Replaces the earlier off-brand robot mascot so
  // the in-game agent matches Extreme Platform ONE's actual Agent One UI.
  return (
    <img
      src="/agent-one-logo.svg"
      className="agent-chat-avatar-icon"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  )
}

// `message` is what Agent One types out. `taskText` is optional - when
// given, it renders as the Nudge panel above the bubble (used for the
// "plug in ports X" instruction on the scenario screen); when omitted, the
// widget is just the chat bubble alone (used on the success screen).
// `messageKey` lets a caller force the pop/type sequence to replay even if
// the message text itself happens to repeat.
function AgentChatBubble({ message, taskText, messageKey }) {
  const [displayedText, setDisplayedText] = useState('')
  const [typingPhase, setTypingPhase] = useState('thinking') // thinking | typing | done
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(false)

  // `taskText` is a fresh React element on every render, so it can't go in
  // the effect's dep array - use a stable boolean for the "has a Nudge"
  // branch and key the replay off messageKey/message only.
  const hasTask = Boolean(taskText)

  useEffect(() => {
    const fullMessage = message || ''
    // Reset everything, then replay the sequence: Nudge first, chat bubble
    // a beat later, then thinking dots -> type-out.
    setNudgeVisible(false)
    setBubbleVisible(false)
    setDisplayedText('')
    setTypingPhase('thinking')

    let charIndex = 0
    let typingInterval

    // When there's a Nudge it leads and the bubble follows; with no Nudge
    // (success screen) the bubble shouldn't sit there waiting - pop it early.
    const bubbleDelay = hasTask ? 560 : 40

    const nudgeTimeout = setTimeout(() => setNudgeVisible(true), 40)
    const popTimeout = setTimeout(() => setBubbleVisible(true), bubbleDelay)

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
    }, bubbleDelay + 650)

    return () => {
      clearTimeout(nudgeTimeout)
      clearTimeout(popTimeout)
      clearTimeout(thinkingTimeout)
      clearInterval(typingInterval)
    }
  }, [messageKey, message, hasTask])

  return (
    <div className="agent-chat-widget">
      {taskText && (
        <div className={`agent-chat-nudge ${nudgeVisible ? 'visible' : ''}`}>
          <div className="agent-chat-nudge-label">
            <span className="agent-chat-nudge-spark" aria-hidden="true"></span>
            Nudge
          </div>
          <div className="agent-chat-nudge-body">{taskText}</div>
        </div>
      )}

      <div className={`agent-chat-bubble ${bubbleVisible ? 'visible' : ''}`}>
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
      </div>

      <div className={`agent-chat-avatar-row ${bubbleVisible ? 'visible' : ''}`}>
        <div className="agent-chat-avatar">
          <span className="agent-chat-avatar-ring"></span>
          <AgentOneMark />
        </div>
      </div>
    </div>
  )
}

export default AgentChatBubble
