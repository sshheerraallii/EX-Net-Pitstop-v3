// Single place the app looks for the backend.
//
// Left empty (the default), every request is relative, so the app talks to
// whatever origin served it - which in the shipped kiosk build is the Node
// backend itself (it serves this bundle). No host is baked into the build.
//
// Set VITE_BACKEND_URL at build time only if the UI must reach a backend on
// a different host, e.g. a standalone leaderboard screen pointed at the
// kiosk over the LAN:  VITE_BACKEND_URL=http://192.168.1.50:3001
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

// API root, e.g. "" -> "/api", or "http://192.168.1.50:3001" -> "http://192.168.1.50:3001/api"
export const API_BASE = `${BACKEND_URL}/api`

// Build a URL for a backend-served media/asset path ("/loginvideo.mp4", a
// "/uploads/..." path, etc). Pass the leading slash.
export const backendUrl = (path) => `${BACKEND_URL}${path}`
