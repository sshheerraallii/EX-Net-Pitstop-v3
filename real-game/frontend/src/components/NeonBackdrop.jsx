// The attract screen's light-streak backdrop, drawn entirely in SVG rather than
// shipped as a raster. The reference art was only 1640px wide, which would go
// soft on a booth display; drawn this way it stays sharp at any resolution and
// the colours come from the brand variables instead of being baked into pixels.
//
// Two mirrored fans of bezier streaks sweep up from the floor line, with a
// reflection band under them. Only transform and opacity animate, so the
// compositor handles it and the kiosk doesn't burn CPU on an idle screen.

// Every streak leaves the same vanishing point low and centre, runs outward
// along the floor, then lifts away toward the screen edge. That keeps the
// middle of the frame clear for the title, which is what the reference does.
//
// endY, width, colour stop, opacity, seconds
const STREAKS = [
  [650, 2.6, 'a', 0.90, 13],
  [560, 1.5, 'b', 0.70, 17],
  [470, 3.2, 'c', 0.95, 11],
  [395, 1.3, 'a', 0.55, 19],
  [330, 2.4, 'b', 0.80, 15],
  [270, 1.2, 'c', 0.45, 21],
  [215, 2.9, 'a', 0.70, 12],
  [165, 1.5, 'b', 0.42, 18],
  [120, 2.1, 'c', 0.55, 16],
]

const VP_X = 960 // vanishing point: centre, just below the floor line
const VP_Y = 1010

function Fan({ side }) {
  // side: -1 draws the left fan, 1 the right. Mirrored so the composition
  // stays symmetrical.
  return (
    <g>
      {STREAKS.map(([endY, width, stop, opacity, dur], i) => {
        // How far up the edge this streak lands drives how early it peels off
        // the floor: the flattest ones hug the bottom the longest.
        const lift = 1 - endY / 700
        const endX = VP_X + side * 2150
        const cx1 = VP_X + side * (420 + lift * 260)
        const cy1 = VP_Y - 10
        const cx2 = VP_X + side * (1180 + lift * 180)
        const cy2 = endY + 230 - lift * 90
        return (
          <path
            key={`${side}-${i}`}
            className="neon-streak"
            style={{ animationDuration: `${dur}s`, animationDelay: `${i * -1.7}s` }}
            d={`M ${VP_X} ${VP_Y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
            fill="none"
            stroke={`url(#neon-${stop})`}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={opacity}
          />
        )
      })}
    </g>
  )
}

function NeonBackdrop() {
  return (
    <svg
      className="neon-backdrop"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="neon-a" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#3655e2" stopOpacity="0" />
          <stop offset="0.35" stopColor="#4f6bff" />
          <stop offset="1" stopColor="#a647ff" />
        </linearGradient>
        <linearGradient id="neon-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f427c8" stopOpacity="0" />
          <stop offset="0.4" stopColor="#f427c8" />
          <stop offset="1" stopColor="#7519f9" />
        </linearGradient>
        <linearGradient id="neon-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7d76f2" stopOpacity="0" />
          <stop offset="0.45" stopColor="#a647ff" />
          <stop offset="1" stopColor="#f427c8" />
        </linearGradient>

        <radialGradient id="neon-haze" cx="0.5" cy="0.78" r="0.62">
          <stop offset="0" stopColor="#7519f9" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#5b059c" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="neon-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a647ff" stopOpacity="0.30" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        {/* One blur pass shared by every streak - cheaper than per-path glow */}
        <filter id="neon-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1920" height="1080" fill="url(#neon-haze)" />

      <g filter="url(#neon-bloom)">
        <Fan side={-1} />
        <Fan side={1} />
      </g>

      {/* Floor: the horizon line the streaks converge onto, plus its wash */}
      <rect x="0" y="905" width="1920" height="175" fill="url(#neon-floor)" />
      <rect x="0" y="903" width="1920" height="2" fill="#c9a2ff" opacity="0.30" />
    </svg>
  )
}

export default NeonBackdrop
