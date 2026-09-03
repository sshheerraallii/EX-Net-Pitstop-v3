import './BranchLinkMap.css'

// Turns Agent One's Branch narration ("The Cape Town branch shows offline
// ... while Johannesburg is still reporting in fine, I have staged the
// failover...") into a small animated network diagram instead of leaving it
// as text alone - two sites, a broken primary link between them (pulsing
// red break glyph), and the staged failover path drawn as a dashed amber
// arc with a traveling dot, standing in for "ready, waiting on your call".
// City names come straight out of the message itself so this stays correct
// across all three Branch variants (Abu Dhabi/Dubai, Cape Town/Johannesburg,
// Chennai/Mumbai) without hardcoding any of them.
function parseBranchCities(message) {
  const text = message || ''
  const match = text.match(/The (.+?) branch shows offline.*?while (.+?) is (?:still )?reporting/i)
  if (!match) return null
  return { offlineCity: match[1].trim(), onlineCity: match[2].trim() }
}

function SiteNode({ x, cy, city, status }) {
  const isOffline = status === 'offline'
  const color = isOffline ? 'var(--error)' : 'var(--success)'
  const glowId = isOffline ? 'branchNodeOfflineGlow' : 'branchNodeOnlineGlow'

  return (
    <g>
      <circle cx={x} cy={cy} r="46" fill={`url(#${glowId})`} />
      <circle cx={x} cy={cy} r="26" fill="var(--surface-raised)" stroke={color} strokeWidth="2.5">
        {isOffline && (
          <animate attributeName="stroke-opacity" values="1;0.35;1" dur="1.3s" repeatCount="indefinite" />
        )}
      </circle>
      {/* simple signal/site glyph */}
      <g stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <line x1={x} y1={cy + 10} x2={x} y2={cy - 10} />
        <path d={`M ${x - 8} ${cy - 2} A 11 11 0 0 1 ${x + 8} ${cy - 2}`} />
        <path d={`M ${x - 12} ${cy + 3} A 17 17 0 0 1 ${x + 12} ${cy + 3}`} opacity="0.55" />
      </g>
      <text x={x} y={cy + 58} textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--text)">
        {city}
      </text>
      <text
        x={x}
        y={cy + 80}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        letterSpacing="0.1em"
        fill={color}
      >
        {isOffline ? 'OFFLINE' : 'ONLINE'}
      </text>
    </g>
  )
}

function BranchLinkMap({ message }) {
  const cities = parseBranchCities(message)
  if (!cities) return null
  const { offlineCity, onlineCity } = cities
  const failoverPath = 'M 170 78 Q 500 130 830 78'

  return (
    <div className="branch-link-card">
      <div className="branch-link-label">
        <span className="branch-link-label-dot"></span>
        Branch Link Status
      </div>

      <svg viewBox="0 0 1000 170" className="branch-link-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="branchNodeOfflineGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--error)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--error)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="branchNodeOnlineGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* staged failover route - dashed, marching, waiting for approval */}
        <path
          d={failoverPath}
          fill="none"
          stroke="var(--highlight)"
          strokeWidth="2.5"
          strokeDasharray="7 7"
          strokeLinecap="round"
          opacity="0.7"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.1s" repeatCount="indefinite" />
        </path>
        <circle r="4.5" fill="var(--highlight)">
          <animateMotion dur="2.6s" repeatCount="indefinite" path={failoverPath} />
        </circle>

        {/* primary link, broken in the middle */}
        <line x1="170" y1="60" x2="452" y2="60" stroke="var(--error)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="548" y1="60" x2="830" y2="60" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />

        {/* break glyph - pulsing ring + X */}
        <circle cx="500" cy="60" r="20" fill="none" stroke="var(--error)" strokeWidth="2">
          <animate attributeName="r" values="16;30;16" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <g stroke="var(--error)" strokeWidth="3.5" strokeLinecap="round">
          <line x1="490" y1="48" x2="510" y2="72">
            <animate attributeName="opacity" values="1;0.35;1" dur="0.9s" repeatCount="indefinite" />
          </line>
          <line x1="510" y1="48" x2="490" y2="72">
            <animate attributeName="opacity" values="1;0.35;1" dur="0.9s" repeatCount="indefinite" />
          </line>
        </g>

        <SiteNode x={90} cy={60} city={offlineCity} status="offline" />
        <SiteNode x={910} cy={60} city={onlineCity} status="online" />
      </svg>

      <div className="branch-link-caption">Failover staged &mdash; awaiting your approval to restore the link</div>
    </div>
  )
}

export default BranchLinkMap
