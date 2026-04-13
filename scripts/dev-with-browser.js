#!/usr/bin/env node

/**
 * Skript pro spuštění dev serveru s automatickým otevřením prohlížeče
 * Spustí Next.js dev server a po jeho naběhnutí otevře prohlížeč
 */

const { spawn } = require('child_process')
const { exec } = require('child_process')

// URL aplikace
const APP_URL = 'http://localhost:3000'

// Funkce pro otevření prohlížeče
function openBrowser(url) {
  const platform = process.platform
  let command

  // Detekce operačního systému
  if (platform === 'win32') {
    // Windows
    command = `start ${url}`
  } else if (platform === 'darwin') {
    // macOS
    command = `open ${url}`
  } else {
    // Linux
    command = `xdg-open ${url}`
  }

  exec(command, (error) => {
    if (error) {
      console.error('Nepodařilo se otevřít prohlížeč:', error)
    } else {
      console.log(`Prohlížeč otevřen: ${url}`)
    }
  })
}

// Spusť Next.js dev server
console.log('Spouštím dev server...')
const devProcess = spawn('npm', ['run', 'dev:only'], {
  stdio: 'inherit',
  shell: true,
})

// Počkej 3 sekundy a otevři prohlížeč
setTimeout(() => {
  console.log('Otevírám prohlížeč...')
  openBrowser(APP_URL)
}, 3000)

// Při ukončení skriptu ukončit i dev server
process.on('SIGINT', () => {
  devProcess.kill('SIGINT')
  process.exit()
})

process.on('SIGTERM', () => {
  devProcess.kill('SIGTERM')
  process.exit()
})
