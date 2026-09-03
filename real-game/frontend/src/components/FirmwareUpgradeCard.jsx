import './FirmwareUpgradeCard.css'

// Firmware's narration is a software-staging story, not a geography one
// ("I have downloaded and staged the firmware upgrade to version 9.3.0.0,
// let me know when you want to execute the upgrade") - so unlike Branch's
// map/link diagram, this is a pure CSS/HTML animation: a package that's
// already landed (bounce-in + checkmark), a shimmering "staged" progress
// bar, a version chip pulsing to show it's ready to apply, and the 3
// switches queued for the same upgrade. The target version is parsed out
// of the message itself rather than hardcoded, so it stays correct if the
// copy ever changes.
function parseFirmwareVersion(message) {
  const match = (message || '').match(/version ([\d.]+)/i)
  return match ? match[1] : null
}

// The current firmware (9.2.2.0) and the 3 device names are baked into the
// background screenshot itself (Extreme Platform One's device table), not
// in the DB - all 3 Firmware variants show the same table, so it's safe to
// mirror it here rather than invent generic placeholders.
const CURRENT_VERSION = '9.2.2.0'
const STAGED_SWITCHES = ['HC-FabEng-08', 'HC-FabEng-09', 'HC-FabEng-02']

function SwitchGlyph() {
  return (
    <svg viewBox="0 0 40 24" className="firmware-switch-icon" aria-hidden="true">
      <rect x="1" y="1" width="38" height="22" rx="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={5 + i * 5.5} y="16" width="3.5" height="4" rx="0.5" fill="var(--text-faint)" />
      ))}
    </svg>
  )
}

function FirmwareUpgradeCard({ message }) {
  const version = parseFirmwareVersion(message)

  return (
    <div className="firmware-card">
      <div className="firmware-label">
        <span className="firmware-label-dot"></span>
        Firmware Upgrade Status
      </div>

      <div className="firmware-body">
        <div className="firmware-package">
          <div className="firmware-package-icon-wrap">
            <svg viewBox="0 0 60 60" className="firmware-package-icon" aria-hidden="true">
              <path d="M30 6 L52 18 V42 L30 54 L8 42 V18 Z" fill="var(--surface-raised)" stroke="var(--highlight)" strokeWidth="2" />
              <path d="M30 6 L52 18 L30 30 L8 18 Z" fill="rgba(251,191,36,0.14)" stroke="var(--highlight)" strokeWidth="1.5" />
              <line x1="30" y1="30" x2="30" y2="54" stroke="var(--highlight)" strokeWidth="1.2" opacity="0.5" />
            </svg>
            <span className="firmware-package-check">&#10003;</span>
          </div>

          <div className="firmware-package-text">
            <span className="firmware-package-label">Downloaded &amp; Staged</span>
            <div className="firmware-progress-track">
              <div className="firmware-progress-fill"></div>
            </div>
          </div>
        </div>

        <div className="firmware-version-row">
          <span className="firmware-version-chip old">v{CURRENT_VERSION}</span>
          <span className="firmware-version-arrow">&#8594;</span>
          <span className="firmware-version-chip new">v{version || 'Latest'}</span>
        </div>

        <div className="firmware-switch-row">
          {STAGED_SWITCHES.map((name) => (
            <div className="firmware-switch-chip" key={name}>
              <SwitchGlyph />
              <span className="firmware-switch-name">
                {name}
                <span className="firmware-switch-dot"></span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="firmware-caption">Staged on all 3 switches &mdash; awaiting your command to execute</div>
    </div>
  )
}

export default FirmwareUpgradeCard
