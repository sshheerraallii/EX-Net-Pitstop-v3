const db = require("./database");

const scenarios = [
  {
    name: "APScenario1",
    category: "AP",
    variant: 1,
    agent_message: "4x Access Points (AP1, AP2, AP3 and AP4) have gone offline, I can see that the AP's are not connected to Extreme Platform One, let's give them a reboot first",
    required_ports: [1, 2, 4, 6],
    success_message: "The Access Points have been rebooted successfully!",
    background_image: "APScenario1.png",
    success_image: "APScenarioSuccessPage.png",
  },
  {
    name: "APScenario2",
    category: "AP",
    variant: 2,
    agent_message: "4x Access Points (AP1, AP2, AP3 and AP4) have gone offline, I can see that the AP's are not connected to Extreme Platform One, let's give them a reboot first",
    required_ports: [2, 3, 5, 6],
    success_message: "The Access Points have been rebooted successfully!",
    background_image: "APScenario2.png",
    success_image: "APScenarioSuccessPage.png",
  },
  {
    name: "APScenario3",
    category: "AP",
    variant: 3,
    agent_message: "4x Access Points (AP1, AP2, AP3 and AP4) have gone offline, I can see that the AP's are not connected to Extreme Platform One, let's give them a reboot first",
    required_ports: [1, 4, 5, 6],
    success_message: "The Access Points have been rebooted successfully!",
    background_image: "APScenario3.png",
    success_image: "APScenarioSuccessPage.png",
  },
  {
    name: "BranchScenario1",
    category: "Branch",
    variant: 1,
    agent_message: "The Abu Dhabi branch shows offline in Extreme Platform One while Dubai is still reporting in fine, I have staged the failover, but need your approval to bring the link back online",
    required_ports: [7, 10, 11, 12],
    success_message: "The Abu Dhabi branch is back online!",
    background_image: "BranchScenario1.png",
    success_image: "BranchScenarioSuccessPage.png",
  },
  {
    name: "BranchScenario2",
    category: "Branch",
    variant: 2,
    agent_message: "The Cape Town branch shows offline in Extreme Platform One while Johannesburg is still reporting in fine, I have staged the failover, but need your approval to bring the link back online",
    required_ports: [8, 9, 11, 12],
    success_message: "The Cape Town branch is back online!",
    background_image: "BranchScenario2.png",
    success_image: "BranchScenarioSuccessPage.png",
  },
  {
    name: "BranchScenario3",
    category: "Branch",
    variant: 3,
    agent_message: "The Chennai branch shows offline in Extreme Platform One while Mumbai is still reporting in fine, I have staged the failover, but need your approval to bring the link back online",
    required_ports: [7, 9, 10, 11],
    success_message: "The Chennai branch is back online!",
    background_image: "BranchScenario3.png",
    success_image: "BranchScenarioSuccessPage.png",
  },
  {
    name: "DataCenterScenario1",
    category: "DataCenter",
    variant: 1,
    agent_message: "There was a cable break between the racks, I have staged and implemented the failover to another link automatically. There was no service disruption in your Fabric network.",
    required_ports: [13, 15, 16, 17],
    success_message: "The resilience of Extreme Fabric Connect is celebrated!",
    background_image: "DataCenterScenario1.png",
    success_image: "DataCenterScenarioSuccessPage.png",
  },
  {
    name: "DataCenterScenario2",
    category: "DataCenter",
    variant: 2,
    agent_message: "There was a cable break between the racks, I have staged and implemented the failover to another link automatically. There was no service disruption in your Fabric network.",
    required_ports: [14, 15, 16, 18],
    success_message: "The resilience of Extreme Fabric Connect is celebrated!",
    background_image: "DataCenterScenario2.png",
    success_image: "DataCenterScenarioSuccessPage.png",
  },
  {
    name: "DataCenterScenario3",
    category: "DataCenter",
    variant: 3,
    agent_message: "There was a cable break between the racks, I have staged and implemented the failover to another link automatically. There was no service disruption in your Fabric network.",
    required_ports: [13, 14, 16, 17],
    success_message: "The resilience of Extreme Fabric Connect is celebrated!",
    background_image: "DataCenterScenario3.png",
    success_image: "DataCenterScenarioSuccessPage.png",
  },
  {
    name: "FirmwareScenario1",
    category: "Firmware",
    variant: 1,
    agent_message: "These 3 switches are running an old firmware version, I have downloaded and staged the firmware upgrade to version 9.3.0.0, let me know when you want to execute the upgrade",
    required_ports: [19, 20, 22, 24],
    success_message: "The Firmware has been successfully upgraded!",
    background_image: "FirmwareScenario1.png",
    success_image: "FirmwareScenarioSuccessPage.png",
  },
  {
    name: "FirmwareScenario2",
    category: "Firmware",
    variant: 2,
    agent_message: "These 3 switches are running an old firmware version, I have downloaded and staged the firmware upgrade to version 9.3.0.0, let me know when you want to execute the upgrade",
    required_ports: [19, 21, 23, 24],
    success_message: "The Firmware has been successfully upgraded!",
    background_image: "FirmwareScenario2.png",
    success_image: "FirmwareScenarioSuccessPage.png",
  },
  {
    name: "FirmwareScenario3",
    category: "Firmware",
    variant: 3,
    agent_message: "These 3 switches are running an old firmware version, I have downloaded and staged the firmware upgrade to version 9.3.0.0, let me know when you want to execute the upgrade",
    required_ports: [20, 21, 22, 23],
    success_message: "The Firmware has been successfully upgraded!",
    background_image: "FirmwareScenario3.png",
    success_image: "FirmwareScenarioSuccessPage.png",
  },
];

function seedScenarios(database) {
  const dbInstance = database || db;
  try {
    const checkStmt = dbInstance.prepare(`SELECT COUNT(*) as count FROM scenarios`);
    const result = checkStmt.get();

    if (result.count > 0) {
      console.log(`✅ Scenarios already seeded (${result.count} scenarios found)`);
      return;
    }

    const insertStmt = dbInstance.prepare(`
      INSERT INTO scenarios (
        name,
        category,
        variant,
        agent_message,
        required_ports,
        success_message,
        background_image,
        success_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = dbInstance.transaction((scenariosToInsert) => {
      for (const scenario of scenariosToInsert) {
        insertStmt.run(
          scenario.name,
          scenario.category,
          scenario.variant,
          scenario.agent_message,
          JSON.stringify(scenario.required_ports),
          scenario.success_message,
          scenario.background_image,
          scenario.success_image
        );
      }
    });

    transaction(scenarios);
    console.log(`✅ Seeded ${scenarios.length} scenarios successfully`);
  } catch (error) {
    console.error("❌ Failed to seed scenarios:", error.message);
  }
}

module.exports = { seedScenarios };
