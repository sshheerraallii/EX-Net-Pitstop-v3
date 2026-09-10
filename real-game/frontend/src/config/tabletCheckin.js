// Points the kiosk at the tablet-checkin relay (deployed on Hostinger).
// The two values below are the defaults baked into the build; a deployment
// can override them at build time with VITE_TABLET_CHECKIN_API /
// VITE_TABLET_CHECKIN_KEY without touching this file.
export const TABLET_CHECKIN_API =
  import.meta.env.VITE_TABLET_CHECKIN_API ||
  'https://antiquewhite-jay-310571.hostingersite.com/checkin'

export const TABLET_CHECKIN_KEY =
  import.meta.env.VITE_TABLET_CHECKIN_KEY || 'sharg768906543786898787654'

export const TABLET_CHECKIN_CONFIGURED =
  !TABLET_CHECKIN_API.includes('REPLACE_ME') && !TABLET_CHECKIN_KEY.includes('REPLACE_ME')

// How often the idle kiosk polls the relay for a new check-in. Kept short so
// the kiosk countdown lines up closely with the tablet's.
export const TABLET_CHECKIN_POLL_MS = 2000

// Fallback countdown length if a check-in row has no server-set start_at
// (old row, or the DB column hasn't been added yet). The real value comes
// from CHECKIN_COUNTDOWN_SECONDS in the relay's config.php.
export const TABLET_CHECKIN_COUNTDOWN_SECONDS = 20
