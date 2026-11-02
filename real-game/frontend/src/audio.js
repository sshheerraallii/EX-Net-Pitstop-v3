// Single owner of all sound in the kiosk.
//
// Browsers refuse to play audio until the page has had a real user gesture, so
// nothing here makes noise until unlock() has run once. At the booth the first
// gesture is the player touching the attract screen; until then every call is a
// no-op rather than an error, and the music starts the moment unlock happens.
//
// All files live in public/audio/ and came across from the V1 build.

const SOUNDS = {
  music: '/audio/music/f1audio.mp3',
  beep: '/audio/sfx/beep.mp3',
  beep5: '/audio/sfx/beep5.mp3',
  crowd: '/audio/sfx/crowd-cheering.mp3',
  whoosh: '/audio/ui/transition-whoosh.mp3',
  resultReveal: '/audio/ui/result-reveal.mp3',
  runComplete: '/audio/result/run-complete.mp3',
  celebration: '/audio/result/top10-celebration.mp3',
  takeover: '/audio/leaderboard/takeover.mp3',
}

// Per-sound mix. The music sits well under the effects so an agent message or a
// port confirmation is still audible over it on a noisy show floor.
const LEVELS = {
  music: 0.22,
  beep: 0.38,
  beep5: 0.5,
  crowd: 0.45,
  whoosh: 0.4,
  resultReveal: 0.55,
  runComplete: 0.6,
  celebration: 0.6,
  takeover: 0.5,
}

// Shortest gap between two plays of the SAME sound. Four cables going in
// within a second would otherwise stack four copies of the port beep on top
// of each other, which is mush rather than feedback.
const RETRIGGER_GAP_MS = 110

// Only one of these can be audible at a time - they are the "something just
// happened" cues, and two of them together never reads as two events, just
// as noise. A new one cuts the previous one off.
const EXCLUSIVE = new Set(['whoosh', 'resultReveal', 'runComplete', 'celebration', 'takeover'])

const MUTE_KEY = 'pitstop.muted'

let unlocked = false
let muted = false
let musicEl = null
const pools = new Map()
const lastPlayedAt = new Map()
let exclusiveEl = null

try {
  muted = window.localStorage.getItem(MUTE_KEY) === '1'
} catch (_) {
  muted = false
}

// Three elements per effect so rapid repeats (four ports plugged quickly) don't
// cut each other off the way a single shared element would.
function pool(name) {
  if (!pools.has(name)) {
    const els = []
    for (let i = 0; i < 3; i += 1) {
      const el = new Audio(SOUNDS[name])
      el.preload = 'auto'
      el.volume = LEVELS[name] ?? 0.5
      els.push(el)
    }
    pools.set(name, { els, next: 0 })
  }
  return pools.get(name)
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = Boolean(value)
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch (_) {
    /* kiosk may run with storage disabled; muting just won't persist */
  }
  if (musicEl) musicEl.muted = muted
  return muted
}

export function toggleMuted() {
  return setMuted(!muted)
}

// Call from a click/touch/keydown handler. Safe to call repeatedly.
export function unlockAudio({ startMusic = true } = {}) {
  if (unlocked) {
    if (startMusic) playMusic()
    return
  }
  unlocked = true

  // Warm the effect pools while we have a gesture, so the first beep of the
  // run isn't delayed by a cold fetch.
  Object.keys(SOUNDS).forEach((name) => {
    if (name !== 'music') pool(name)
  })

  if (startMusic) playMusic()
}

export function playMusic() {
  if (!unlocked) return
  if (!musicEl) {
    musicEl = new Audio(SOUNDS.music)
    musicEl.loop = true
    musicEl.volume = LEVELS.music
  }
  musicEl.muted = muted
  const attempt = musicEl.play()
  if (attempt && typeof attempt.catch === 'function') {
    // Autoplay still refused (no gesture yet, or policy). Not an error worth
    // surfacing at a booth; the next gesture retries.
    attempt.catch(() => {})
  }
}

export function stopMusic() {
  if (!musicEl) return
  musicEl.pause()
  musicEl.currentTime = 0
}

// Drop the music under a stinger, then bring it back. Used around the result
// reveal and celebration so they land clearly.
export function duckMusic(seconds = 3, level = 0.06) {
  if (!musicEl) return
  const original = LEVELS.music
  musicEl.volume = level
  window.setTimeout(() => {
    if (musicEl) musicEl.volume = original
  }, seconds * 1000)
}

export function playSfx(name, { volume } = {}) {
  if (!unlocked || muted || !SOUNDS[name]) return

  const now = Date.now()
  if (now - (lastPlayedAt.get(name) || 0) < RETRIGGER_GAP_MS) return
  lastPlayedAt.set(name, now)

  const p = pool(name)
  const el = p.els[p.next]
  p.next = (p.next + 1) % p.els.length

  try {
    if (EXCLUSIVE.has(name)) {
      if (exclusiveEl && exclusiveEl !== el) {
        exclusiveEl.pause()
        exclusiveEl.currentTime = 0
      }
      exclusiveEl = el
    }
    el.currentTime = 0
    if (typeof volume === 'number') el.volume = volume
    const attempt = el.play()
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {})
  } catch (_) {
    /* a sound failing to play must never interrupt gameplay */
  }
}

export const SOUND_NAMES = Object.keys(SOUNDS)
