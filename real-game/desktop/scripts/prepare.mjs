// Assembles everything electron-builder needs, without touching the working
// copies of the backend or frontend:
//
//   1. build the React frontend  -> ../frontend/dist
//   2. stage a clean backend     -> ./build-staging/backend  (no db, no .env)
//   3. install its prod deps there
//   4. rebuild better-sqlite3 in the staged copy for this Electron version
//
// electron-builder then ships build-staging/backend + ../frontend/dist as
// resources. Run automatically by `npm run dist` (via predist).

import { execSync } from 'node:child_process'
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const desktopDir = join(here, '..')
const repoRealGame = join(desktopDir, '..')
const frontendDir = join(repoRealGame, 'frontend')
const backendDir = join(repoRealGame, 'backend')
const stageDir = join(desktopDir, 'build-staging', 'backend')

const run = (cmd, cwd) => {
  console.log(`\n$ ${cmd}   (cwd: ${cwd})`)
  execSync(cmd, { cwd, stdio: 'inherit', shell: true })
}

const electronVersion = JSON.parse(
  readFileSync(join(desktopDir, 'node_modules', 'electron', 'package.json'), 'utf8')
).version

console.log(`Preparing payload for Electron ${electronVersion}`)

// 1. Frontend build ---------------------------------------------------------
run('npm install --no-audit --no-fund', frontendDir)
run('npm run build', frontendDir)
if (!existsSync(join(frontendDir, 'dist', 'index.html'))) {
  throw new Error('frontend build did not produce dist/index.html')
}

// 2. Stage a clean backend ------------------------------------------------------
rmSync(join(desktopDir, 'build-staging'), { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

const SKIP = new Set([
  'node_modules',
  'uploads',
  '.env',
  '.git',
  'pitstop.db',
  'pitstop.db-shm',
  'pitstop.db-wal',
])
cpSync(backendDir, stageDir, {
  recursive: true,
  filter: (src) => {
    const base = src.split(/[\\/]/).pop()
    if (SKIP.has(base)) return false
    if (base.endsWith('.db') || base.endsWith('.db-shm') || base.endsWith('.db-wal')) {
      return false
    }
    return true
  },
})

// 3. Prod deps in the staged copy ----------------------------------------------
const hasLock = existsSync(join(stageDir, 'package-lock.json'))
run(
  `${hasLock ? 'npm ci' : 'npm install'} --omit=dev --no-audit --no-fund`,
  stageDir
)

// 4. Rebuild native modules for Electron --------------------------------------
run(
  `npx electron-rebuild --version ${electronVersion} --module-dir "${stageDir}" --which-module better-sqlite3`,
  desktopDir
)

console.log('\nPayload ready:')
console.log(`  backend  -> ${stageDir}`)
console.log(`  frontend -> ${join(frontendDir, 'dist')}`)
