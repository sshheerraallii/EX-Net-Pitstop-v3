// Port Configuration - Define your ports here
// Format: { x: center x, y: center y, port: port number, status: "active|inactive" }
const PORT_CONFIG = [];

const PORT_SIZE = 40; // Size of the square (in SVG units)

// Initialize port overlay
function initPortOverlay() {
  const overlay = document.getElementById('portOverlay');
  if (!overlay) return;

  overlay.innerHTML = PORT_CONFIG.map(port => {
    const rectX = port.x - PORT_SIZE / 2;
    const rectY = port.y - PORT_SIZE / 2;

    return `
      <g class="port-group" data-port="${port.port}">
        <rect
          x="${rectX}"
          y="${rectY}"
          width="${PORT_SIZE}"
          height="${PORT_SIZE}"
          rx="6"
          class="port-led port-${port.status}"
          data-port="${port.port}"
        />
        <text
          x="${port.x}"
          y="${port.y}"
          text-anchor="middle"
          dy="0.3em"
          font-size="18"
          class="port-label"
          data-port="${port.port}"
        >
          ${port.port}
        </text>
      </g>
    `;
  }).join('');

  // Add click handlers
  document.querySelectorAll('.port-group').forEach(group => {
    group.addEventListener('click', togglePort);
    group.addEventListener('dblclick', showPortInfo);
  });
}

// Toggle port on/off
function togglePort(e) {
  e.stopPropagation();
  const group = e.target.closest('.port-group');
  if (!group) return;

  const rect = group.querySelector('rect');
  const port = rect.getAttribute('data-port');

  if (rect.classList.contains('port-active')) {
    rect.classList.remove('port-active');
    rect.classList.add('port-inactive');
    console.log(`Port ${port} disabled`);
  } else {
    rect.classList.remove('port-inactive');
    rect.classList.add('port-active');
    console.log(`Port ${port} enabled`);
  }
}

// Show port info on double-click
function showPortInfo(e) {
  e.stopPropagation();
  const group = e.target.closest('.port-group');
  if (!group) return;

  const rect = group.querySelector('rect');
  const port = rect.getAttribute('data-port');
  const status = rect.classList.contains('port-active') ? 'Active' : 'Inactive';
  console.log(`Port ${port}: ${status}`);
  alert(`Port ${port}\nStatus: ${status}`);
}

// Update port status programmatically
function setPortStatus(portNumber, status) {
  const group = document.querySelector(`[data-port="${portNumber}"]`);
  if (!group) return;

  const rect = group.querySelector('rect');

  if (status === 'active') {
    rect.classList.remove('port-inactive');
    rect.classList.add('port-active');
  } else {
    rect.classList.remove('port-active');
    rect.classList.add('port-inactive');
  }
}

// Get all port statuses
function getPortStatuses() {
  const statuses = {};
  document.querySelectorAll('.port-group').forEach(group => {
    const rect = group.querySelector('rect');
    const port = rect.getAttribute('data-port');
    statuses[port] = rect.classList.contains('port-active') ? 'active' : 'inactive';
  });
  return statuses;
}

// Enable all ports
function enableAllPorts() {
  document.querySelectorAll('.port-group rect').forEach(rect => {
    rect.classList.remove('port-inactive');
    rect.classList.add('port-active');
  });
  console.log('All ports enabled');
}

// Disable all ports
function disableAllPorts() {
  document.querySelectorAll('.port-group rect').forEach(rect => {
    rect.classList.remove('port-active');
    rect.classList.add('port-inactive');
  });
  console.log('All ports disabled');
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortOverlay);
} else {
  initPortOverlay();
}
