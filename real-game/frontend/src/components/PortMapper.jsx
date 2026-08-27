import { useState } from 'react'
import './PortMapper.css'

function PortMapper() {
  const [imageSrc, setImageSrc] = useState(null)
  const [ports, setPorts] = useState([])
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImageSrc(event.target.result)
      setPorts([])
    }
    reader.readAsDataURL(file)
  }

  const handleImageLoad = (e) => {
    setImageSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    })
  }

  const handleClick = (e) => {
    if (!imageSrc) return

    const img = e.target
    const rect = img.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const percentX = (x / rect.width) * 100
    const percentY = (y / rect.height) * 100

    const absX = (percentX / 100) * imageSize.width
    const absY = (percentY / 100) * imageSize.height

    setPorts([
      ...ports,
      {
        num: ports.length + 1,
        x: parseFloat(percentX.toFixed(2)),
        y: parseFloat(percentY.toFixed(2)),
        absX: Math.round(absX),
        absY: Math.round(absY),
      },
    ])
  }

  const downloadCSV = () => {
    if (ports.length === 0) {
      alert('No ports mapped yet')
      return
    }

    let csv = 'Port #,X%,Y%,AbsoluteX,AbsoluteY\n'
    ports.forEach((p) => {
      csv += `${p.num},${p.x},${p.y},${p.absX},${p.absY}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'switch-ports.csv'
    a.click()
  }

  const downloadJSON = () => {
    if (ports.length === 0) {
      alert('No ports mapped yet')
      return
    }

    const portConfig = ports.map((p) => ({
      x: p.absX,
      y: p.absY,
      port: p.num,
      status: 'active',
    }))

    const blob = new Blob([JSON.stringify(portConfig, null, 2)], {
      type: 'application/json',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'port-config.json'
    a.click()
  }

  const copyJSON = () => {
    if (ports.length === 0) {
      alert('No ports mapped yet')
      return
    }

    const portConfig = ports.map((p) => ({
      x: p.absX,
      y: p.absY,
      port: p.num,
      status: 'active',
    }))

    const json = JSON.stringify(portConfig, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      alert('Copied to clipboard!')
    })
  }

  return (
    <div className="port-mapper">
      <div className="mapper-container">
        <h2>🔌 Port Mapper</h2>

        <div className="upload-section">
          <label htmlFor="image-input" className="upload-area">
            📷 Click to upload scenario image
          </label>
          <input
            id="image-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>

        {imageSrc && (
          <div className="mapper-section">
            <h3>Click on each port LED to map coordinates</h3>
            <div className="image-wrapper">
              <img
                src={imageSrc}
                alt="Switch"
                onClick={handleClick}
                onLoad={handleImageLoad}
                className="mapper-image"
                style={{ cursor: 'crosshair' }}
              />
              <svg
                className="port-overlay"
                viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              >
                {ports.map((p) => (
                  <g key={p.num}>
                    <rect
                      x={p.absX - 20}
                      y={p.absY - 20}
                      width={40}
                      height={40}
                      rx={6}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <text
                      x={p.absX}
                      y={p.absY}
                      textAnchor="middle"
                      dy="0.3em"
                      fill="#10b981"
                      fontSize={14}
                      fontWeight={700}
                    >
                      {p.num}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="port-list">
              <h4>Mapped Ports ({ports.length}):</h4>
              {ports.length === 0 ? (
                <p>No ports mapped yet. Click on port LEDs in the image.</p>
              ) : (
                <div className="ports-grid">
                  {ports.map((p) => (
                    <div key={p.num} className="port-item">
                      Port {p.num}: {p.x}% × {p.y}% ({p.absX}, {p.absY})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="button-group">
              <button onClick={() => setPorts(ports.slice(0, -1))} disabled={ports.length === 0}>
                ↶ Undo
              </button>
              <button onClick={() => setPorts([])} disabled={ports.length === 0}>
                🗑️ Clear
              </button>
              <button onClick={copyJSON} disabled={ports.length === 0} className="primary">
                📋 Copy JSON
              </button>
              <button onClick={downloadJSON} disabled={ports.length === 0} className="primary">
                📥 Download JSON
              </button>
              <button onClick={downloadCSV} disabled={ports.length === 0}>
                📥 Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PortMapper
