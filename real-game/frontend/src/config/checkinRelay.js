import axios from 'axios'
import {
  TABLET_CHECKIN_API,
  TABLET_CHECKIN_KEY,
  TABLET_CHECKIN_CONFIGURED,
} from './tabletCheckin'

// MySQL NOW() on Hostinger is UTC; a timestamp string with no zone suffix is
// therefore UTC. Matches the parsing on the tablet side so both ends count
// down to the same instant.
export function parseServerTime(value) {
  if (!value) return null
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

const headers = { 'X-Checkin-Key': TABLET_CHECKIN_KEY }

// Oldest-first list of people the tablet has checked in that no kiosk has
// picked up yet. Returns [] (not an error) when the relay isn't configured.
export async function fetchPendingCheckins() {
  if (!TABLET_CHECKIN_CONFIGURED) return []
  const res = await axios.get(`${TABLET_CHECKIN_API}/checkin_list.php`, {
    headers,
    timeout: 6000,
  })
  if (res.data && res.data.success) return res.data.checkins || []
  return []
}

// Best-effort: tell the relay this check-in has been taken so it drops off
// every kiosk's list. Never throws.
export async function claimCheckin(id) {
  if (!TABLET_CHECKIN_CONFIGURED) return
  try {
    await axios.post(
      `${TABLET_CHECKIN_API}/checkin_claim.php`,
      { id },
      { headers, timeout: 6000 }
    )
  } catch (_) {
    /* staleness on the relay will clean it up */
  }
}
