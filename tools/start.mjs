#!/usr/bin/env node
// Cross-platform launcher for the kiosk: starts the backend and serves the
// frontend with one command on Windows, macOS or Linux.
//
//   node tools/start.mjs          build the frontend, then serve it (booth)
//   node tools/start.mjs --dev    Vite dev server with hot reload (working)
//
// Deliberately dependency-free so it runs straight after `git clone` without
// installing anything at the repo root.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const backend = join(root, 'real-game', 'backend')
const frontend = join(root, 'real-game', 'frontend')

const dev = process.argv.includes('--dev')
// npm is a .cmd shim on Windows, which needs a shell to resolve.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const useShell = process.platform === 'win32'

const children = []

function run(label, cwd, args) {
  const child = spawn(npm, args, {
    cwd,
    shell: useShell,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const tag = (stream, prefix) => {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      chunk
        .split('\n')
        .filter((line) => line.trim())
        .forEach((line) => console.log(`[${label}] ${prefix}${line}`))
    })
  }

  tag(child.stdout, '')
  tag(child.stderr, '')

  child.on('exit', (code) => {
    console.log(`[${label}] exited with code ${code}`)
    // If one half dies the other is useless, so take the whole thing down
    // rather than leaving booth staff with a half-running kiosk.
    shutdown(code ?? 1)
  })

  children.push(child)
  return child
}

function shutdown(code) {
  children.forEach((c) => {
    if (!c.killed) {
      try {
        c.kill()
      } catch (_) {
        /* already gone */
      }
    }
  })
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

function ensureDeps(label, dir) {
  if (existsSync(join(dir, 'node_modules'))) return Promise.resolve()
  console.log(`[${label}] node_modules missing, installing...`)
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install'], { cwd: dir, shell: useShell, stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} npm install failed`))))
  })
}

const main = async () => {
  await ensureDeps('backend', backend)
  await ensureDeps('frontend', frontend)

  run('backend', backend, ['start'])

  if (dev) {
    run('frontend', frontend, ['run', 'dev'])
    console.log('\nDev mode. Open http://localhost:5173\n')
  } else {
    console.log('[frontend] building...')
    await new Promise((resolve, reject) => {
      const child = spawn(npm, ['run', 'build'], { cwd: frontend, shell: useShell, stdio: 'inherit' })
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('frontend build failed'))))
    })
    // `--host` so a second machine can open /leaderboard on the booth network.
    run('frontend', frontend, ['run', 'preview', '--', '--host', '--port', '4173'])
    console.log('\nKiosk build served on http://localhost:4173')
    console.log('Spectator board: http://localhost:4173/leaderboard\n')
  }
}

main().catch((err) => {
  console.error(err.message)
  shutdown(1)
})
