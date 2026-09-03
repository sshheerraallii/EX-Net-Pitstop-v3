// Points the kiosk at the tablet-checkin relay (deployed on Hostinger).
// Fill these in after deploying the tablet-checkin/ folder — see its
// README.md. Until then, the "Tablet Check-In" tab on the entry screen
// will show a friendly "not configured" state instead of erroring.
export const TABLET_CHECKIN_API = 'https://antiquewhite-jay-310571.hostingersite.com/checkin';
export const TABLET_CHECKIN_KEY = 'sharg768906543786898787654';

export const TABLET_CHECKIN_CONFIGURED =
  !TABLET_CHECKIN_API.includes('REPLACE_ME') && !TABLET_CHECKIN_KEY.includes('REPLACE_ME');

// How often the kiosk polls the relay for new check-ins.
export const TABLET_CHECKIN_POLL_MS = 4000;