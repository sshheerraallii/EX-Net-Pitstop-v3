# Switch Port Overlay - Complete Code

## Files Included

1. **switch-port-overlay.html** - HTML structure
2. **switch-styles.css** - CSS animations and styling
3. **switch-script.js** - JavaScript functionality
4. **SWITCH-OVERLAY-README.md** - This file

## Quick Start

### 1. Add to Your HTML

```html
<link rel="stylesheet" href="switch-styles.css">

<div class="switch-container">
  <img src="your-switch-image.jpg" alt="Network Switch" class="switch-image">
  <svg id="portOverlay" class="port-overlay" viewBox="0 0 1280 300"></svg>
</div>

<script src="switch-script.js"></script>
```

### 2. Configure Your Ports

Edit `switch-script.js` and update `PORT_CONFIG` with your actual port coordinates:

```javascript
const PORT_CONFIG = [
  { x: 90, y: 180, port: 1, status: 'active' },
  { x: 135, y: 180, port: 2, status: 'inactive' },
  // ... add more ports
];
```

**Finding Coordinates:**
- Use the interactive mapper to click on ports and get coordinates
- Or measure manually: each port position needs `x` (horizontal) and `y` (vertical) coordinates
- Coordinates are pixel values in the SVG viewBox (default: 1280x300)

### 3. Adjust Your SVG ViewBox

Change the `viewBox` value to match your image dimensions:

```html
<!-- For 1280x300 image -->
<svg id="portOverlay" class="port-overlay" viewBox="0 0 1280 300"></svg>

<!-- For 1600x400 image -->
<svg id="portOverlay" class="port-overlay" viewBox="0 0 1600 400"></svg>
```

## JavaScript API

### Initialize
```javascript
initPortOverlay() // Called automatically on page load
```

### Toggle Port Status
```javascript
setPortStatus(portNumber, 'active')   // Enable port
setPortStatus(portNumber, 'inactive') // Disable port
```

### Get All Statuses
```javascript
const statuses = getPortStatuses()
console.log(statuses) // { '1': 'active', '2': 'inactive', ... }
```

### Control All Ports
```javascript
enableAllPorts()  // Turn on all ports
disableAllPorts() // Turn off all ports
```

### User Interactions
- **Click** a port to toggle on/off
- **Double-click** a port to see its info

## Features

✅ **Responsive** - Scales with image size  
✅ **Green flashing animation** - CSS-based, no dependencies  
✅ **Click to toggle** - Turn ports on/off  
✅ **Hover effect** - Visual feedback on mouseover  
✅ **Programmatic control** - JavaScript API for external control  
✅ **Status tracking** - Get current port states  

## Customization

### Change Flash Speed
In `switch-styles.css`, modify the animation duration:

```css
.port-active {
  animation: flash 0.6s infinite; /* Change 0.6s to desired duration */
}
```

### Change Port Color
```css
.port-active {
  fill: #ff0000; /* Red instead of green */
}
```

### Add Port Labels
In `switch-script.js`, add to the SVG:

```javascript
circle.parentElement.innerHTML += `
  <text x="${port.x}" y="${port.y}" text-anchor="middle" dy="0.3em" 
        fill="#000" font-size="10" font-weight="bold">
    ${port.port}
  </text>
`;
```

### Disable Click Interactivity
Remove these lines from `switch-script.js`:

```javascript
// Remove this section to disable clicks:
circle.addEventListener('click', togglePort);
circle.addEventListener('dblclick', showPortInfo);
```

## Example: React Component

```jsx
import { useEffect } from 'react';
import './switch-styles.css';

export function SwitchMonitor({ ports = [] }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      require('./switch-script.js');
    }
  }, []);

  return (
    <div className="switch-container">
      <img src="switch.jpg" alt="Switch" />
      <svg id="portOverlay" className="port-overlay" viewBox="0 0 1280 300"></svg>
    </div>
  );
}
```

## Example: Controlling from Your App

```javascript
// Set port 1 to active
setPortStatus(1, 'active');

// Get current status
const status = getPortStatuses();
console.log(`Port 1 is ${status['1']}`);

// Update based on API data
fetch('/api/switch-status')
  .then(res => res.json())
  .then(data => {
    data.ports.forEach(port => {
      setPortStatus(port.number, port.status);
    });
  });
```

## Troubleshooting

**Ports not showing?**
- Check that `viewBox` matches your image dimensions
- Verify port coordinates (x, y) are within viewBox range
- Make sure CSS file is loaded

**Animation not flashing?**
- Verify CSS file is linked
- Check browser DevTools for CSS errors
- Ensure `port-active` class is applied

**Click not working?**
- Verify JavaScript file is loaded
- Check console for errors
- Make sure SVG has `id="portOverlay"`

## Notes

- Coordinates are always in SVG units (defined by viewBox)
- Image dimensions don't need to match viewBox - SVG scales automatically
- For responsive design, coordinates scale proportionally with the image
- No external dependencies required
