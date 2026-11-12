import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const phpPath = process.env.PHP_CLI || 'C:\\Program Files\\XAMPP\\php\\php.exe'
const children = []
let stopping = false

function stop(code) {
  if (stopping) {
    return
  }

  stopping = true
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill()
    }
  }
  process.exitCode = code
}

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  children.push(child)

  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`)
    stop(1)
  })

  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`[${name}] stopped${code === null ? '' : ` with exit code ${code}`}`)
      stop(code ?? 1)
    }
  })

  return child
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

start('PHP API', phpPath, [
  '-S',
  '127.0.0.1:8081',
  '-t',
  resolve(root, 'API'),
])
start('Vite', process.execPath, [
  resolve(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  ...process.argv.slice(2),
])
