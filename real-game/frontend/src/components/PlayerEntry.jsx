import { useState } from 'react'
import axios from 'axios'
import TabletCheckinPicker from './TabletCheckinPicker'
import './PlayerEntry.css'

const API_BASE = 'http://localhost:3001/api'

function PlayerEntry({ onPlayerCreated }) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [entryMode, setEntryMode] = useState('manual') // manual, qr, or tablet

  const handleManualEntry = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE}/player/manual`, {
        name: name.trim(),
        country: country.trim() || null,
      })

      onPlayerCreated(response.data.player)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create player')
    } finally {
      setLoading(false)
    }
  }

  const handleQREntry = async (e) => {
    e.preventDefault()
    if (!qrCode.trim()) {
      setError('Please scan a QR code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE}/player/scan`, {
        confirmation_number: qrCode.trim(),
      })

      onPlayerCreated(response.data.player)
    } catch (err) {
      setError(err.response?.data?.message || 'Player not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="player-entry">
      <video
        autoPlay
        loop
        muted
        className="video-player"
        src="http://localhost:3001/loginvideo.mp4"
      />
      <div className="video-tint" />

      <div className="entry-container">
        <div className="entry-header">
          <h1>Extreme Agent One</h1>
          <p>Agent One is ready. Let's go!</p>
        </div>

        <div className="mode-switcher">
          <button
            className={`mode-btn ${entryMode === 'manual' ? 'active' : ''}`}
            onClick={() => {
              setEntryMode('manual')
              setError('')
            }}
          >
            Manual Entry
          </button>
          <button
            className={`mode-btn ${entryMode === 'qr' ? 'active' : ''}`}
            onClick={() => {
              setEntryMode('qr')
              setError('')
            }}
          >
            QR Code
          </button>
          <button
            className={`mode-btn ${entryMode === 'tablet' ? 'active' : ''}`}
            onClick={() => {
              setEntryMode('tablet')
              setError('')
            }}
          >
            Tablet Check-In
          </button>
        </div>

        {entryMode === 'tablet' ? (
          <TabletCheckinPicker apiBase={API_BASE} onPlayerCreated={onPlayerCreated} />
        ) : entryMode === 'manual' ? (
          <form onSubmit={handleManualEntry} className="entry-form">
            <div className="form-group">
              <label htmlFor="name">Your Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country (Optional)</label>
              <input
                id="country"
                type="text"
                placeholder="Enter your country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !name.trim()}
            >
              {loading ? <span className="spin">⟳</span> : ''}
              {loading ? 'Starting Game...' : 'Start Game'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleQREntry} className="entry-form">
            <div className="form-group">
              <label htmlFor="qr">Scan QR Code *</label>
              <input
                id="qr"
                type="text"
                placeholder="QR code will appear here"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !qrCode.trim()}
            >
              {loading ? <span className="spin">⟳</span> : ''}
              {loading ? 'Verifying...' : 'Verify & Start'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default PlayerEntry
