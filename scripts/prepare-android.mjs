import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const android = path.join(root, 'android')

function run(command) {
  execSync(command, { cwd: root, stdio: 'inherit' })
}

if (!existsSync(android)) run('npx cap add android')
else run('npx cap sync android')

const rootGradle = path.join(android, 'build.gradle')
let rootText = readFileSync(rootGradle, 'utf8')
if (!rootText.includes('kotlin-gradle-plugin')) {
  rootText = rootText.replace(
    /classpath ['"]com\.android\.tools\.build:gradle:[^'"]+['"]/,
    match => `${match}\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20"\n        classpath "org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:2.2.20"`
  )
  writeFileSync(rootGradle, rootText)
}

const appGradle = path.join(android, 'app', 'build.gradle')
let appText = readFileSync(appGradle, 'utf8')

// Give every CI APK a real higher Android version so installs cannot silently reuse an older build.
const ciBuildNumber = Number(process.env.GITHUB_RUN_NUMBER || 1)
appText = appText.replace(/versionCode\s+\d+/, `versionCode ${ciBuildNumber}`)
appText = appText.replace(/versionName\s+"[^"]+"/, `versionName "0.1.${ciBuildNumber}"`)
if (!appText.includes("apply plugin: 'kotlin-android'")) {
  appText = appText.replace(
    "apply plugin: 'com.android.application'",
    "apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'\napply plugin: 'org.jetbrains.kotlin.plugin.compose'"
  )
}
if (!appText.includes('compose true')) {
  appText = appText.replace(
    /\n\s*buildTypes\s*\{/,
    "\n    buildFeatures {\n        compose true\n    }\n\n    kotlinOptions {\n        jvmTarget = '21'\n    }\n\n    buildTypes {"
  )
}
if (!appText.includes('androidx.glance:glance-appwidget')) {
  appText = appText.replace(
    /dependencies\s*\{/,
    'dependencies {\n    implementation "androidx.glance:glance-appwidget:1.2.0"'
  )
}
writeFileSync(appGradle, appText)

const mainRoot = path.join(android, 'app', 'src', 'main')
cpSync(path.join(root, 'native', 'android-overlay', 'app', 'src', 'main'), mainRoot, { recursive: true, force: true })

const drawable = path.join(mainRoot, 'res', 'drawable')
mkdirSync(drawable, { recursive: true })
const moonRaw = await sharp(path.join(root, 'src', 'assets', 'ritual-moon.png'))
  .resize(360, 360, { fit: 'contain' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
for (let i = 3; i < moonRaw.data.length; i += moonRaw.info.channels) {
  moonRaw.data[i] = Math.round(moonRaw.data[i] * 0.16)
}
await sharp(moonRaw.data, { raw: moonRaw.info }).png().toFile(path.join(drawable, 'widget_moon.png'))

const ritualFrameCount = 18
const ritualMoonBase64 = readFileSync(path.join(root, 'src', 'assets', 'ritual-moon.png')).toString('base64')

function ritualDash(progress, delay) {
  const local = Math.max(0, Math.min(1, (progress - delay) / 0.24))
  return Math.round(300 * (1 - local))
}

for (let frame = 0; frame < ritualFrameCount; frame++) {
  const progress = frame / (ritualFrameCount - 1)
  const angle = Math.round(progress * 360)
  const offsets = [0, .035, .065, .095, .125, .085, .11].map(delay => ritualDash(progress, delay))
  const coreOpacity = Math.max(0, Math.min(.82, (progress - .28) * 3))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="300" viewBox="0 0 360 150">
    <defs>
      <filter id="moonGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.6" result="blur"/>
        <feFlood flood-color="#beff3c" flood-opacity=".13" result="glow"/>
        <feComposite in="glow" in2="blur" operator="in" result="softGlow"/>
        <feMerge><feMergeNode in="softGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <image href="data:image/png;base64,${ritualMoonBase64}" x="134" y="31" width="92" height="92" opacity=".96" filter="url(#moonGlow)" transform="rotate(${angle} 180 77)"/>
    <g fill="none" stroke="#cbd2c9" stroke-width=".75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M180 4v138" stroke-dasharray="300" stroke-dashoffset="${offsets[0]}"/>
      <path d="M90 86h180" stroke-dasharray="300" stroke-dashoffset="${offsets[1]}"/>
      <path d="M180 24 145 78l35 46 35-46Z" stroke-dasharray="300" stroke-dashoffset="${offsets[2]}"/>
      <circle cx="180" cy="77" r="46" stroke-dasharray="300" stroke-dashoffset="${offsets[3]}"/>
      <circle cx="180" cy="77" r="30" stroke-dasharray="300" stroke-dashoffset="${offsets[4]}"/>
      <path d="M144 20a50 50 0 0 0 72 0 43 43 0 0 1-72 0Z" stroke-dasharray="300" stroke-dashoffset="${offsets[5]}"/>
      <path d="M155 20c8 8 17 12 25 12s17-4 25-12" stroke-dasharray="300" stroke-dashoffset="${offsets[6]}"/>
    </g>
    <circle cx="180" cy="77" r="13" fill="none" stroke="#d2ff1a" stroke-width=".8" opacity="${coreOpacity.toFixed(2)}"/>
  </svg>`
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(drawable, `widget_ritual_${String(frame).padStart(2, '0')}.png`))
}

const iconSource = path.join(root, 'public', 'app-icon.png')
const densities = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
}
for (const [folder, size] of Object.entries(densities)) {
  const dir = path.join(mainRoot, 'res', folder)
  mkdirSync(dir, { recursive: true })

  // Legacy launchers: render the artwork full-bleed.
  await sharp(iconSource)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#050706' })
    .png()
    .toFile(path.join(dir, 'ic_launcher.png'))
  await sharp(iconSource)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#050706' })
    .png()
    .toFile(path.join(dir, 'ic_launcher_round.png'))

  // Adaptive launchers use a 108dp foreground canvas. Keep the artwork full-bleed;
  // the launcher itself applies the final circle/squircle mask.
  const adaptiveSize = Math.round(size * 2.25)
  await sharp(iconSource)
    .resize(adaptiveSize, adaptiveSize, { fit: 'cover' })
    .flatten({ background: '#050706' })
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'))
}

const valuesDir = path.join(mainRoot, 'res', 'values')
mkdirSync(valuesDir, { recursive: true })

// Capacitor/Android already creates ic_launcher_background.xml.
// Replace that resource instead of defining a second color with the same name.
writeFileSync(
  path.join(valuesDir, 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#050706</color>\n</resources>\n'
)
rmSync(path.join(valuesDir, 'launcher_icon_colors.xml'), { force: true })

const adaptive = path.join(mainRoot, 'res', 'mipmap-anydpi-v26')
mkdirSync(adaptive, { recursive: true })
const adaptiveXml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
writeFileSync(path.join(adaptive, 'ic_launcher.xml'), adaptiveXml)
writeFileSync(path.join(adaptive, 'ic_launcher_round.xml'), adaptiveXml)

console.log('Android preparado: icono adaptativo full-bleed, puente nativo y 5 widgets YOSE.')
