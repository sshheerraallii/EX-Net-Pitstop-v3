import './SwitchChassis.css'

// A fully custom, on-brand vector rendering of the 24-port switch faceplate,
// built to read as close to the real hardware as an illustration reasonably
// can: individual RJ45 jacks with bezels/pin contacts/link LEDs, a brushed
// chassis finish, vent perforation strips, SFP/MGMT/CONSOLE/USB cluster and
// status LEDs. Replaces the old approach (a photo of a real switch floating
// in dead space, with a transparent overlay glued on by pixel coordinates)
// so the layout, colors, and port math are all ours - matching the real
// hardware's port-pairing scheme (odd port on top, even port below, same
// column; 12 ports per block, two blocks).

const PORT_W = 44
const PORT_H = 27
const ROW0_Y = 40
const ROW1_Y = 78
const BLOCK1_X = 110
const PORT_GAP_X = 9
const BLOCK_WIDTH = 6 * PORT_W + 5 * PORT_GAP_X
const BLOCK_GAP = 40
const BLOCK2_X = BLOCK1_X + BLOCK_WIDTH + BLOCK_GAP

const VIEW_W = 1220
const VIEW_H = 156

function buildPortLayout() {
  const ports = []
  for (let col = 0; col < 6; col++) {
    ports.push({ port: col * 2 + 1, x: BLOCK1_X + col * (PORT_W + PORT_GAP_X), y: ROW0_Y })
    ports.push({ port: col * 2 + 2, x: BLOCK1_X + col * (PORT_W + PORT_GAP_X), y: ROW1_Y })
  }
  for (let col = 0; col < 6; col++) {
    ports.push({ port: 13 + col * 2, x: BLOCK2_X + col * (PORT_W + PORT_GAP_X), y: ROW0_Y })
    ports.push({ port: 14 + col * 2, x: BLOCK2_X + col * (PORT_W + PORT_GAP_X), y: ROW1_Y })
  }
  return ports
}

const PORT_LAYOUT = buildPortLayout()

function buildVentDots() {
  const dots = []
  for (const rowY of [16, 22, 134, 140]) {
    for (let x = 20; x < VIEW_W - 20; x += 7) {
      dots.push({ x, y: rowY })
    }
  }
  return dots
}

const VENT_DOTS = buildVentDots()

function Port({ port, x, y, active }) {
  const labelY = y === ROW0_Y ? y - 6 : y + PORT_H + 13
  const pinAreaX = x + 7
  const pinW = (PORT_W - 14) / 8

  return (
    <g>
      {/* Highlight box is sized just a few px past the port's own bezel and
          stays fully opaque/crisp (no blur) - ports sit only ~9-11px apart,
          so a soft blurred glow bleeds straight into the neighboring port
          and makes it look lit when it isn't. Precision over prettiness
          here since this is literally the gameplay instruction. */}
      {active && (
        <rect
          x={x - 4}
          y={y - 4}
          width={PORT_W + 8}
          height={PORT_H + 8}
          rx="5"
          fill="none"
          stroke="var(--success)"
          strokeWidth="2"
        >
          <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="1.5;3;1.5" dur="0.8s" repeatCount="indefinite" />
        </rect>
      )}
      <rect
        x={x}
        y={y}
        width={PORT_W}
        height={PORT_H}
        rx="3"
        fill={active ? 'url(#portBezelActive)' : 'url(#portBezel)'}
        stroke={active ? 'var(--success)' : '#000'}
        strokeOpacity={active ? 1 : 0.6}
        strokeWidth={active ? 2.5 : 1}
      />
      <rect x={x + 1.5} y={y + 1.2} width={PORT_W - 3} height="2" rx="1" fill="#ffffff" fillOpacity="0.18" />
      <rect
        x={x + 5}
        y={y + 4}
        width={PORT_W - 10}
        height={PORT_H - 8}
        rx="1.5"
        fill={active ? 'url(#portCavityActive)' : 'url(#portCavity)'}
      />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={pinAreaX + i * pinW}
          y={y + 5}
          width={pinW * 0.55}
          height="3.5"
          fill="#d4af37"
          fillOpacity="0.55"
        />
      ))}
      <rect x={x + PORT_W / 2 - 4} y={y + PORT_H - 1} width="8" height="3" rx="1" fill="#0a0b0e" />
      <circle cx={x + PORT_W - 5} cy={y + 4} r={active ? 2.6 : 2.1} fill={active ? 'var(--success)' : '#3a3f4a'}>
        {active && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      <text
        x={x + PORT_W / 2}
        y={labelY}
        textAnchor="middle"
        fontWeight="800"
        fontSize={active ? 14 : 9}
        fill={active ? 'var(--success)' : 'rgba(255,255,255,0.32)'}
      >
        {port}
        {active && <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />}
      </text>
    </g>
  )
}

function SwitchChassis({ requiredPorts = [] }) {
  const isRequired = (port) => requiredPorts.includes(port)
  const rightX = BLOCK2_X + BLOCK_WIDTH + 40
  const mgmtX = rightX + 78
  const usbX = mgmtX + 54
  const statusX = usbX + 40

  return (
    <svg
      className="switch-chassis"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Network switch, 24 ports"
    >
      <defs>
        <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9089dd" />
          <stop offset="10%" stopColor="#8478d4" />
          <stop offset="50%" stopColor="#7d70c8" />
          <stop offset="85%" stopColor="#6d5fb8" />
          <stop offset="100%" stopColor="#5f4fa8" />
        </linearGradient>
        <linearGradient id="chassisSheen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="8%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="portBezel" cx="30%" cy="25%" r="90%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="55%" stopColor="#23262e" />
          <stop offset="100%" stopColor="#0a0b0e" />
        </radialGradient>
        <radialGradient id="portCavity" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#1a1b20" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="portBezelActive" cx="30%" cy="25%" r="90%">
          <stop offset="0%" stopColor="#3fdb8f" />
          <stop offset="45%" stopColor="#17b26a" />
          <stop offset="100%" stopColor="#0a3d24" />
        </radialGradient>
        <radialGradient id="portCavityActive" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#0d3320" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <linearGradient id="sfpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cfd3da" />
          <stop offset="50%" stopColor="#8b90a0" />
          <stop offset="100%" stopColor="#4c505c" />
        </linearGradient>
        <filter id="chassisShadow" x="-10%" y="-30%" width="120%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000000" floodOpacity="0.55" />
        </filter>
        <pattern id="brushed" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="3" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" />
        </pattern>
      </defs>

      <g filter="url(#chassisShadow)">
        <rect x="0" y="8" width={VIEW_W} height="140" rx="10" fill="url(#chassisGrad)" stroke="#000000" strokeOpacity="0.45" strokeWidth="1.5" />
        <rect x="0" y="8" width={VIEW_W} height="140" rx="10" fill="url(#brushed)" />
        <rect x="1" y="9" width={VIEW_W - 2} height="34" rx="9" fill="url(#chassisSheen)" />
        <rect x="0" y="8" width={VIEW_W} height="140" rx="10" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
      </g>

      <g fill="#000000" fillOpacity="0.55">
        {VENT_DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.3" />
        ))}
      </g>

      <g>
        <circle cx="55" cy="78" r="26" fill="#0d0a18" fillOpacity="0.5" />
        <circle cx="55" cy="78" r="26" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1.5" />
        <circle cx="55" cy="78" r="17" fill="#ffffff" />
        <text x="55" y="86" textAnchor="middle" fontWeight="800" fontSize="20" fill="#20004c">E</text>
        <text x="55" y="118" textAnchor="middle" fontWeight="700" fontSize="9" letterSpacing="1" fill="#ffffff" fillOpacity="0.55">5420-24P</text>
      </g>

      {PORT_LAYOUT.map((p) => (
        <Port key={p.port} port={p.port} x={p.x} y={p.y} active={isRequired(p.port)} />
      ))}

      {/* SFP+ uplinks 25-28 */}
      {[0, 1].map((row) =>
        [0, 1].map((col) => {
          const sx = rightX + col * 30
          const sy = ROW0_Y - 2 + row * 39
          return (
            <g key={`sfp-${row}-${col}`}>
              <rect x={sx} y={sy} width="24" height="29" rx="2" fill="url(#sfpGrad)" stroke="#2a2d35" strokeWidth="1" />
              <rect x={sx + 3} y={sy + 3} width="18" height="23" rx="1" fill="#1a1c22" />
            </g>
          )
        })
      )}
      <text x={rightX + 27} y={ROW1_Y + PORT_H + 13} textAnchor="middle" fontWeight="700" fontSize="7" fill="#ffffff" fillOpacity="0.4">25-28</text>

      {/* MGMT / CONSOLE */}
      <rect x={mgmtX} y={ROW0_Y - 2} width="36" height="24" rx="3" fill="url(#portBezel)" stroke="#000" strokeWidth="1" />
      <rect x={mgmtX + 5} y={ROW0_Y + 2} width="26" height="16" rx="1.5" fill="url(#portCavity)" />
      <text x={mgmtX + 18} y={ROW0_Y - 6} textAnchor="middle" fontWeight="700" fontSize="6.5" fill="#ffffff" fillOpacity="0.4">MGMT</text>

      <rect x={mgmtX} y={ROW1_Y} width="36" height="24" rx="3" fill="url(#portBezel)" stroke="#000" strokeWidth="1" />
      <rect x={mgmtX + 5} y={ROW1_Y + 4} width="26" height="16" rx="1.5" fill="url(#portCavity)" />
      <text x={mgmtX + 18} y={ROW1_Y + PORT_H + 13} textAnchor="middle" fontWeight="700" fontSize="6.5" fill="#ffffff" fillOpacity="0.4">CONSOLE</text>

      {/* USB */}
      <rect x={usbX} y={ROW0_Y + 14} width="16" height="22" rx="2" fill="url(#portBezel)" stroke="#000" strokeWidth="1" />
      <rect x={usbX + 3} y={ROW0_Y + 17} width="10" height="16" rx="1" fill="url(#portCavity)" />
      <text x={usbX + 8} y={ROW0_Y + 11} textAnchor="middle" fontWeight="700" fontSize="6.5" fill="#ffffff" fillOpacity="0.4">USB</text>

      {/* Status LEDs */}
      {['PWR', 'SYS', 'FAN'].map((label, i) => {
        const sy = ROW0_Y - 2 + i * 16
        return (
          <g key={label}>
            <circle cx={statusX} cy={sy} r="3" fill="var(--success)" />
            <text x={statusX + 10} y={sy + 3} fontWeight="700" fontSize="7" fill="#ffffff" fillOpacity="0.45">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default SwitchChassis
