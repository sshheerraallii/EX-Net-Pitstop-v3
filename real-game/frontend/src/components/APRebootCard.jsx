import './APRebootCard.css'

// AP's narration is a live-fault story ("4x Access Points ... have gone
// offline ... let's give them a reboot first") - so like Branch, this reads
// as something currently wrong rather than something already staged. Unlike
// Branch's two-site map, there's no geography here, just 4 identical units
// in a row, so this shows each one mid-reboot-cycle: signal lost (red,
// pulsing) with a spinning reboot badge, staggered per unit so it reads as
// an active process rather than a static error state. AP names are parsed
// out of the message itself (falls back to AP1-4) so it stays correct if
// the copy ever changes which units are affected.
function parseAPNames(message) {
  const matches = (message || '').match(/AP\d+/g)
  return matches && matches.length ? [...new Set(matches)] : ['AP1', 'AP2', 'AP3', 'AP4']
}

function APGlyph({ delay = '0s' }) {
  return (
    <svg viewBox="0 0 40 40" className="ap-glyph" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--surface-raised)" stroke="var(--error)" strokeWidth="2">
        <animate attributeName="stroke-opacity" values="1;0.4;1" dur="1.3s" begin={delay} repeatCount="indefinite" />
      </rect>
      <path d="M13 16 A 9.5 9.5 0 0 1 27 16" stroke="var(--error)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M16.5 19.5 A 5.5 5.5 0 0 1 23.5 19.5" stroke="var(--error)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="25" r="2.4" fill="var(--error)" />
    </svg>
  )
}

function RebootBadge({ delay = '0s' }) {
  return (
    <svg viewBox="0 0 24 24" className="ap-reboot-badge" style={{ animationDelay: delay }} aria-hidden="true">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.8-6.3" fill="none" stroke="var(--steel)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20.5 3.5v4.6h-4.6" fill="none" stroke="var(--steel)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function APRebootCard({ message }) {
  const apNames = parseAPNames(message)

  return (
    <div className="ap-reboot-card">
      <div className="ap-reboot-label">
        <span className="ap-reboot-label-dot"></span>
        Access Point Status
      </div>

      <div className="ap-reboot-row">
        {apNames.map((name, i) => (
          <div className="ap-reboot-chip" key={name}>
            <div className="ap-reboot-icon-wrap">
              <APGlyph delay={`${i * 0.15}s`} />
              <RebootBadge delay={`${i * 0.15}s`} />
            </div>
            <span className="ap-reboot-name">{name}</span>
            <span className="ap-reboot-status">Rebooting&hellip;</span>
          </div>
        ))}
      </div>

      <div className="ap-reboot-caption">
        Signal lost on all {apNames.length} access points &mdash; plug in the ports to bring them back online
      </div>
    </div>
  )
}

export default APRebootCard
