import portConfig from '../data/portConfig.json'
import './PortOverlay.css'

function PortOverlay({ requiredPorts = [], imageDimensions = { width: 0, height: 0 } }) {
  // Use a FIXED viewBox based on the coordinate system of portConfig.json
  // This ensures the overlay stays aligned regardless of image size or zoom level
  const FIXED_WIDTH = 4400
  const FIXED_HEIGHT = 2475

  // Filter to only required ports
  const activePorts = portConfig.filter((port) => requiredPorts.includes(port.port))

  return (
    <svg
      className="port-overlay"
      viewBox={`0 0 ${FIXED_WIDTH} ${FIXED_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {activePorts.map((port) => {
        const size = 80
        const x = port.x - size / 2
        const y = port.y - size / 2

        return (
          <g key={port.port} className="port-indicator">
            <rect
              x={x}
              y={y}
              width={size}
              height={size}
              rx={16}
              className="port-square port-active"
            />
            <text
              x={port.x}
              y={port.y}
              textAnchor="middle"
              dy="0.35em"
              className="port-number"
            >
              {port.port}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default PortOverlay
