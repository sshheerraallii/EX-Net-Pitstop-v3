import { useState, useRef, useEffect } from 'react'
import './ScenarioDisplay.css'
import PortOverlay from './PortOverlay'

function ScenarioDisplay({ scenario, progress, requiredPorts }) {
  const imageUrl = `/scenarios/${scenario.background_image}`
  const imageRef = useRef(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    // ResizeObserver to track image size changes (zoom, window resize, etc.)
    const resizeObserver = new ResizeObserver(() => {
      if (image.naturalWidth && image.naturalHeight) {
        // Use natural (actual) image dimensions
        setImageDimensions({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
    })

    resizeObserver.observe(image)

    // Also set initial dimensions once image loads
    if (image.naturalWidth) {
      setImageDimensions({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div className="scenario-display">
      <div className="scenario-header">
        <div className="header-content">
          <img src="/scenarios/agent-one-icon.svg" alt="Agent One" className="agent-icon" />
          <div className="header-text">
            <p className="agent-text">{scenario.agent_message}</p>
            <p className="required-ports-text">
              Plug in ports <span className="ports-highlight">{requiredPorts.join(', ')}</span> to {scenario.name.includes('AP') ? 'upgrade the Access Points' : scenario.name.includes('Branch') ? 'bring the branch back online' : scenario.name.includes('DataCenter') ? 'restore the data center connection' : 'upgrade the Firmware'}
            </p>
          </div>
        </div>
        <div className="progress-indicator">
          <span className="progress-label">Scenario {progress.current}/{progress.total}</span>
        </div>
      </div>

      <div className="scenario-image-container">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={scenario.name}
          className="scenario-image"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.parentElement.innerHTML =
              '<div class="image-placeholder">Scenario image not loaded</div>'
          }}
        />
        <PortOverlay requiredPorts={requiredPorts} imageDimensions={imageDimensions} />

        <div className="waiting-message">
          <div className="spinner"></div>
          <p>Waiting for ports to be plugged in...</p>
        </div>
      </div>
    </div>
  )
}

export default ScenarioDisplay
