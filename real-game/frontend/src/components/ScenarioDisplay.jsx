import './ScenarioDisplay.css'
import SwitchChassis from './SwitchChassis'
import AgentChatBubble from './AgentChatBubble'

function taskCopy(scenario) {
  if (scenario.name.includes('AP')) return 'reboot the Access Points'
  if (scenario.name.includes('Branch')) return 'bring the branch back online'
  if (scenario.name.includes('DataCenter')) return 'celebrate the resiliency of Extreme Fabric Connect'
  return 'upgrade the Firmware'
}

function ScenarioDisplay({ scenario, progress, requiredPorts, pluggedPorts }) {
  const imageUrl = `/scenarios/${scenario.background_image}`

  return (
    <div className="scenario-display">
      <div className="progress-badge">
        <span className="progress-label">Scenario {progress.current}/{progress.total}</span>
      </div>

      <div className="scenario-body">
        <div className="scenario-image-container">
          <img
            src={imageUrl}
            alt={scenario.name}
            className="scenario-image"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML =
                '<div class="image-placeholder">Scenario image not loaded</div>'
            }}
          />

          {/* Anchored to the photo area specifically (not the whole screen)
              so the popup can never drift over the switch panel below and
              cover the exact ports the player needs to read. */}
          <AgentChatBubble
            messageKey={scenario.id}
            message={scenario.agent_message}
            taskText={
              <>
                Plug in ports <b>{requiredPorts.join(', ')}</b> to {taskCopy(scenario)}
              </>
            }
          />
        </div>

        {/* The per-category cards (AP reboot, Branch link map, DataCenter
            resilience, Firmware upgrade) used to sit here. Removed at the
            client's request: on the booth screen they pushed the switch
            faceplate down into the bottom strip, and the ports are the thing
            players actually need to read. The space they freed goes to the
            switch panel below. */}

        <div className="switch-panel-card">
          <div className="switch-panel-label">
            <span className="switch-panel-dot"></span>
            Network Switch &mdash; Live Port Status
          </div>
          <SwitchChassis requiredPorts={requiredPorts} pluggedPorts={pluggedPorts || []} />
        </div>

        <div className="waiting-message">
          <div className="spinner"></div>
          <p>Waiting for ports to be plugged in...</p>
        </div>
      </div>
    </div>
  )
}

export default ScenarioDisplay
