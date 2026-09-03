import './RankCelebration.css'

// Full-screen takeover for a top-3 finish, shown before the normal result
// screen - same beat as the scenario SuccessModal (a moment that plays,
// then hands off to what's next) rather than just a bigger header on the
// same page. Reuses the medalGrad-gold/silver/bronze gradients ResultScreen
// already defines for the leaderboard's RankBadge, so the trophy matches
// the same medal colors a player sees a moment later in the standings.
const TIER_BY_RANK = {
  1: { tier: 'gold', ordinal: '1st' },
  2: { tier: 'silver', ordinal: '2nd' },
  3: { tier: 'bronze', ordinal: '3rd' },
}

const CONFETTI_COLORS = ['var(--violet)', 'var(--steel)', 'var(--highlight)', 'var(--success)', '#ffffff']

// Deterministic "scatter" instead of Math.random() so the field looks the
// same on every play rather than occasionally clumping - 28 pieces spread
// with a coprime-ish step across the width, staggered delays/durations/drift
// pulled from small cycling sets so no two pieces move in lockstep.
function ConfettiField() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const left = (i * 37) % 100
    const delay = (i % 7) * 0.28
    const duration = 3.2 + (i % 5) * 0.45
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const drift = (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 14)
    return { id: i, left, delay, duration, color, drift }
  })

  return (
    <div className="confetti-field" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

function TrophyGlyph({ tier }) {
  return (
    <svg viewBox="0 0 80 90" className="celebration-trophy" aria-hidden="true">
      <path
        d="M20 10 H60 V28 C60 42 51 52 40 52 C29 52 20 42 20 28 Z"
        fill={`url(#medalGrad-${tier})`}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.5"
      />
      <path
        d="M20 14 C9 14 7 27 16 33 C19 35 20 33 20 33"
        fill="none"
        stroke={`url(#medalGrad-${tier})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M60 14 C71 14 73 27 64 33 C61 35 60 33 60 33"
        fill="none"
        stroke={`url(#medalGrad-${tier})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <rect x="36" y="52" width="8" height="13" fill={`url(#medalGrad-${tier})`} />
      <path d="M23 75 H57 L52 65 H28 Z" fill={`url(#medalGrad-${tier})`} />
      <rect x="18" y="75" width="44" height="8" rx="2.5" fill={`url(#medalGrad-${tier})`} />
    </svg>
  )
}

function RankCelebration({ rank, playerName, timeLabel }) {
  const info = TIER_BY_RANK[rank]
  if (!info) return null

  return (
    <div className={`rank-celebration rank-celebration--${info.tier}`}>
      <ConfettiField />

      <div className="celebration-content">
        <TrophyGlyph tier={info.tier} />
        <div className="celebration-ordinal">{info.ordinal} Place</div>
        <div className="celebration-name">{playerName}</div>
        {timeLabel && <div className="celebration-time">{timeLabel}</div>}
        <div className="celebration-sub">Best time today</div>
      </div>
    </div>
  )
}

export default RankCelebration
