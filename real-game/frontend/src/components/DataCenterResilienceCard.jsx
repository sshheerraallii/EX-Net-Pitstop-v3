import './DataCenterResilienceCard.css'

// DataCenter's narration is the odd one out - unlike AP/Branch, nothing is
// currently broken: "There was a cable break between the racks, I have
// staged and implemented the failover to another link automatically. There
// was no service disruption." The fault already happened AND already
// resolved itself, which the scenario's own resolution copy leans into
// ("...to celebrate the resiliency of Extreme Fabric Connect"). So both
// racks stay marked online the whole time; only the primary link between
// them is shown broken (muted grey, not alarm-red - it's history, not a
// live problem), while the backup path is drawn solid and glowing with
// continuous traffic, because it's already carrying the connection, not
// staged and waiting like Branch's amber route.
function RackNode({ x, cy, label }) {
  return (
    <g>
      <circle cx={x} cy={cy} r="46" fill="url(#dcNodeGlow)" />
      <circle cx={x} cy={cy} r="26" fill="var(--surface-raised)" stroke="var(--success)" strokeWidth="2.5" />
      <g stroke="var(--success)" strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x={x - 9} y={cy - 12} width="18" height="24" rx="2.5" />
        <line x1={x - 9} y1={cy - 3} x2={x + 9} y2={cy - 3} opacity="0.6" />
        <line x1={x - 9} y1={cy + 5} x2={x + 9} y2={cy + 5} opacity="0.6" />
        <circle cx={x + 4.5} cy={cy - 8} r="0.8" fill="var(--success)" stroke="none" />
      </g>
      <text x={x} y={cy + 58} textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--text)">
        {label}
      </text>
      <text
        x={x}
        y={cy + 80}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        letterSpacing="0.1em"
        fill="var(--success)"
      >
        ONLINE
      </text>
    </g>
  )
}

function DataCenterResilienceCard() {
  const backupPath = 'M 170 95 Q 500 150 830 95'

  return (
    <div className="dc-resilience-card">
      <div className="dc-resilience-label">
        <span className="dc-resilience-label-dot"></span>
        Fabric Link Status
      </div>

      <svg viewBox="0 0 1000 170" className="dc-resilience-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="dcNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* backup path - already live, carrying the connection */}
        <path d={backupPath} fill="none" stroke="var(--success)" strokeWidth="6" strokeLinecap="round" opacity="0.14" />
        <path d={backupPath} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        <circle r="5" fill="var(--success)">
          <animateMotion dur="2.2s" repeatCount="indefinite" path={backupPath} />
        </circle>
        <circle r="5" fill="var(--success)" opacity="0.5">
          <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path={backupPath} />
        </circle>

        {/* primary link - broken, but it's history now, not a live alarm */}
        <line x1="170" y1="60" x2="452" y2="60" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />
        <line x1="548" y1="60" x2="830" y2="60" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />
        <g stroke="var(--error)" strokeWidth="3" strokeLinecap="round" opacity="0.75">
          <line x1="491" y1="50" x2="509" y2="70" />
          <line x1="509" y1="50" x2="491" y2="70" />
        </g>

        <RackNode x={90} cy={60} label="RACK 1" />
        <RackNode x={910} cy={60} label="RACK 2" />
      </svg>

      <div className="dc-resilience-caption">
        <span className="dc-resilience-check">&#10003;</span>
        Auto-failover already restored the link &mdash; zero service disruption
      </div>
    </div>
  )
}

export default DataCenterResilienceCard
