/**
 * Generate PNG icons from icon.svg using the Canvas API (Node 18+).
 * Run: node scripts/generate-icons.mjs
 *
 * If @resvg/resvg-js is not available, this creates minimal PNG placeholders
 * that satisfy the PWA manifest requirement.
 */
import { writeFileSync, readFileSync } from 'fs'
import { createCanvas } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

const sizes = [192, 512]

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const r = size * 0.2083  // corner radius ~ 40/192

  // Background
  ctx.fillStyle = '#18181b'
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  const s = size / 192  // scale factor

  // Book pages - left
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.moveTo(48 * s, 56 * s)
  ctx.bezierCurveTo(48 * s, 52 * s, 51 * s, 49 * s, 55 * s, 49 * s)
  ctx.lineTo(93 * s, 49 * s)
  ctx.lineTo(93 * s, 143 * s)
  ctx.bezierCurveTo(93 * s, 143 * s, 72 * s, 137 * s, 55 * s, 137 * s)
  ctx.bezierCurveTo(51 * s, 137 * s, 48 * s, 134 * s, 48 * s, 130 * s)
  ctx.closePath()
  ctx.fill()

  // Book pages - right
  ctx.beginPath()
  ctx.moveTo(144 * s, 56 * s)
  ctx.bezierCurveTo(144 * s, 52 * s, 141 * s, 49 * s, 137 * s, 49 * s)
  ctx.lineTo(99 * s, 49 * s)
  ctx.lineTo(99 * s, 143 * s)
  ctx.bezierCurveTo(99 * s, 143 * s, 120 * s, 137 * s, 137 * s, 137 * s)
  ctx.bezierCurveTo(141 * s, 137 * s, 144 * s, 134 * s, 144 * s, 130 * s)
  ctx.closePath()
  ctx.fill()

  // Spine
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.roundRect(91 * s, 49 * s, 10 * s, 94 * s, 2 * s)
  ctx.fill()

  // Lines left
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 4 * s
  ctx.lineCap = 'round'
  for (const y of [70, 82, 94]) {
    ctx.beginPath(); ctx.moveTo(60 * s, y * s); ctx.lineTo(86 * s, y * s); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath(); ctx.moveTo(60 * s, 106 * s); ctx.lineTo(78 * s, 106 * s); ctx.stroke()

  // Lines right
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  for (const y of [70, 82, 94]) {
    ctx.beginPath(); ctx.moveTo(106 * s, y * s); ctx.lineTo(132 * s, y * s); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath(); ctx.moveTo(106 * s, 106 * s); ctx.lineTo(120 * s, 106 * s); ctx.stroke()

  // Yellow highlight
  ctx.fillStyle = 'rgba(254,240,138,0.6)'
  ctx.beginPath()
  ctx.roundRect(60 * s, 78 * s, 26 * s, 8 * s, 2 * s)
  ctx.fill()

  const buf = canvas.toBuffer('image/png')
  writeFileSync(path.join(publicDir, `icon-${size}.png`), buf)
  console.log(`✓ icon-${size}.png`)
}
