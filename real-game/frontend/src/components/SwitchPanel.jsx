import './SwitchPanel.css'

function SwitchPanel({ requiredPorts, selectedPorts, onPortClick, disabled }) {
  const allPorts = Array.from({ length: 24 }, (_, i) => i + 1)

  const isRequired = (port) => requiredPorts.includes(port)
  const isSelected = (port) => selectedPorts.includes(port)

  return (
    <div className="switch-panel">
      <div className="switch-header">
        <h3>Network Switch - 24 Port</h3>
        <div className="port-stats">
          <span className="stat">
            <span className="stat-label">Selected:</span>
            <span className="stat-value">{selectedPorts.length}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Required:</span>
            <span className="stat-value">{requiredPorts.length}</span>
          </span>
        </div>
      </div>

      <div className="switch-display">
        <div className="ports-grid">
          {allPorts.map((port) => (
            <button
              key={port}
              className={`port ${
                isRequired(port) ? 'required' : ''
              } ${isSelected(port) ? 'selected' : ''} ${
                disabled ? 'disabled' : ''
              }`}
              onClick={() => !disabled && onPortClick(port)}
              disabled={disabled}
              title={`Port ${port}${isRequired(port) ? ' (Required)' : ''}`}
            >
              <span className="port-number">{port}</span>
              {isRequired(port) && (
                <span className="required-indicator">●</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="port-legend">
        <div className="legend-item">
          <div className="legend-icon empty"></div>
          <span>Not Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon required"></div>
          <span>Required</span>
        </div>
      </div>
    </div>
  )
}

export default SwitchPanel
