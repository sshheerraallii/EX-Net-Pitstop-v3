import './ScenarioDisplay.css'
import SwitchChassis from './SwitchChassis'
import AgentChatBubble from './AgentChatBubble'
import BranchLinkMap from './BranchLinkMap'
import FirmwareUpgradeCard from './FirmwareUpgradeCard'
import APRebootCard from './APRebootCard'
import DataCenterResilienceCard from './DataCenterResilienceCard'

function taskCopy(scenario) {
  if (scenario.name.includes('AP')) return 'reboot the Access Points'
  if (scenario.name.includes('Branch')) return 'bring the branch back online'
  if (scenario.name.includes('DataCenter')) return 'celebrate the resiliency of Extreme Fabric Connect'
  return 'upgrade the Firmware'
}

function ScenarioDisplay({ scenario, progress, requiredPorts }) {
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

        {/* Only renders for AP scenarios - turns "4x Access Points have gone
            offline, let's give them a reboot" into a live status readout:
            4 units mid-reboot-cycle instead of leaving it as text alone. */}
        {scenario.category === 'AP' && <APRebootCard message={scenario.agent_message} />}

        {/* Only renders for Branch scenarios - turns the "offline branch /
            staged failover" narration into an actual broken-link diagram
            instead of leaving it as text alone. Parses city names straight
            out of the scenario's own message, so it's correct for all 3
            Branch variants. */}
        {scenario.category === 'Branch' && <BranchLinkMap message={scenario.agent_message} />}

        {/* Only renders for DataCenter scenarios - the odd one out: nothing
            is currently broken here, the cable break already auto-failed-over
            with zero disruption, so unlike Branch this shows both racks
            online and a live (not staged) backup path already carrying
            traffic. */}
        {scenario.category === 'DataCenter' && <DataCenterResilienceCard />}

        {/* Only renders for Firmware scenarios - Firmware's story is a
            software-staging one (package downloaded, staged, waiting on
            approval), not a geography one, so it gets a CSS/HTML animation
            instead of an SVG diagram: a package drop-in, a shimmering
            "staged" progress bar, a pulsing version chip, and all 3
            switches shown queued for the same upgrade. */}
        {scenario.category === 'Firmware' && <FirmwareUpgradeCard message={scenario.agent_message} />}

        <div className="switch-panel-card">
          <div className="switch-panel-label">
            <span className="switch-panel-dot"></span>
            Network Switch &mdash; Live Port Status
          </div>
          <SwitchChassis requiredPorts={requiredPorts} />
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
