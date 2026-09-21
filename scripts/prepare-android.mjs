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

// Stable release signing is injected only when CI explicitly enables it.
// Credentials remain in GitHub Actions secrets and are never written to the repository.
if (process.env.YOSE_SIGNING_ENABLED === 'true') {
  if (!appText.includes('signingConfigs {')) {
    appText = appText.replace(
      /\n\s*buildTypes\s*\{/,
      `
    signingConfigs {
        release {
            storeFile file(System.getenv("YOSE_SIGNING_STORE_FILE"))
            storePassword System.getenv("YOSE_SIGNING_STORE_PASSWORD")
            keyAlias System.getenv("YOSE_SIGNING_KEY_ALIAS")
            keyPassword System.getenv("YOSE_SIGNING_KEY_PASSWORD")
        }
    }

    buildTypes {`
    )
  }
  appText = appText.replace(
    /(buildTypes\s*\{\s*\n\s*release\s*\{\s*\n)(?!\s*signingConfig)/,
    '$1            signingConfig signingConfigs.release\n'
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

const ritualFrameCount = 36
const ritualMoonBase64 = readFileSync(path.join(root, 'src', 'assets', 'ritual-moon.png')).toString('base64')

function ritualDash(progress, delay) {
  const local = Math.max(0, Math.min(1, (progress - delay) / 0.24))
  return Math.round(300 * (1 - local))
}

for (let frame = 0; frame < ritualFrameCount; frame++) {
  const t = frame / (ritualFrameCount - 1)
  const progress = Math.min(1, t / 0.82)
  const eased = 1 - Math.pow(1 - progress, 3)
  const angle = Math.round(t * 360)
  const offsets = [0, .035, .065, .095, .125, .085, .11].map(delay => ritualDash(eased, delay))
  const coreOpacity = Math.max(0, Math.min(.82, (eased - .28) * 3))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="110 5 140 140">
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



const spotifyAstroSources = Array.from({ length: 4 }, (_, index) =>
  path.join(root, 'src', 'assets', `spotify-astro-${index + 1}.png`)
)
for (const source of spotifyAstroSources) {
  if (!existsSync(source)) throw new Error(`Falta el asset obligatorio de Spotify: ${path.basename(source)}`)
}

const spotifyShellXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F2050706"/>
    <stroke android:width="1dp" android:color="#443A4738"/>
    <corners android:radius="22dp"/>
</shape>`
const spotifyChipXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#55050706"/>
    <stroke android:width="1dp" android:color="#88D2FF1A"/>
    <corners android:radius="8dp"/>
    <padding android:left="6dp" android:top="3dp" android:right="6dp" android:bottom="3dp"/>
</shape>`
const spotifyButtonXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#66050706"/>
    <stroke android:width="1dp" android:color="#55616A61"/>
    <corners android:radius="18dp"/>
</shape>`
const spotifyButtonAccentXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#35D2FF1A"/>
    <stroke android:width="1dp" android:color="#A8D2FF1A"/>
    <corners android:radius="18dp"/>
</shape>`
const spotifyStopIconXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#F1F3EF" android:pathData="M7,7h10v10H7z"/>
</vector>`
writeFileSync(path.join(drawable, 'widget_spotify_shell.xml'), spotifyShellXml)
writeFileSync(path.join(drawable, 'widget_spotify_chip.xml'), spotifyChipXml)
writeFileSync(path.join(drawable, 'widget_spotify_button.xml'), spotifyButtonXml)
writeFileSync(path.join(drawable, 'widget_spotify_button_accent.xml'), spotifyButtonAccentXml)
writeFileSync(path.join(drawable, 'ic_spotify_stop.xml'), spotifyStopIconXml)

function roundedMask(width, height, radius) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`)
}

function compactShade() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">
    <defs>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050706" stop-opacity=".03"/>
        <stop offset=".48" stop-color="#050706" stop-opacity=".15"/>
        <stop offset=".70" stop-color="#050706" stop-opacity=".66"/>
        <stop offset="1" stop-color="#050706" stop-opacity=".98"/>
      </linearGradient>
      <radialGradient id="edge">
        <stop offset=".58" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".48"/>
      </radialGradient>
    </defs>
    <rect width="420" height="420" fill="url(#bottom)"/>
    <rect width="420" height="420" fill="url(#edge)"/>
    <rect x="1" y="1" width="418" height="418" rx="34" fill="none" stroke="#d2ff1a" stroke-opacity=".24" stroke-width="2"/>
    <path d="M24 42h72M24 42v38M396 340v38M324 378h72" stroke="#d2ff1a" stroke-opacity=".38" stroke-width="2"/>
  </svg>`)
}

function wideShade() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="840" height="420">
    <defs>
      <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#050706" stop-opacity=".995"/>
        <stop offset=".42" stop-color="#050706" stop-opacity=".96"/>
        <stop offset=".65" stop-color="#050706" stop-opacity=".46"/>
        <stop offset="1" stop-color="#050706" stop-opacity=".06"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset=".55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".48"/>
      </linearGradient>
    </defs>
    <rect width="840" height="420" fill="url(#side)"/>
    <rect width="840" height="420" fill="url(#bottom)"/>
    <rect x="1" y="1" width="838" height="418" rx="34" fill="none" stroke="#d2ff1a" stroke-opacity=".22" stroke-width="2"/>
    <path d="M34 42h104M34 42v42M806 336v42M702 378h104" stroke="#d2ff1a" stroke-opacity=".36" stroke-width="2"/>
    <circle cx="648" cy="210" r="142" fill="none" stroke="#d2ff1a" stroke-opacity=".08" stroke-width="1.5"/>
    <circle cx="648" cy="210" r="160" fill="none" stroke="#cbd2c9" stroke-opacity=".06" stroke-width="1"/>
  </svg>`)
}

for (let i = 1; i <= 4; i++) {
  const source = spotifyAstroSources[i - 1]
  const compactAstro = await sharp(source)
    .resize(392, 392, { fit: 'contain', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer()

  await sharp({ create: { width: 420, height: 420, channels: 4, background: '#050706ff' } })
    .composite([
      { input: compactAstro, left: 14, top: 2 },
      { input: compactShade(), left: 0, top: 0 },
      { input: roundedMask(420, 420, 34), blend: 'dest-in' }
    ])
    .png()
    .toFile(path.join(drawable, `widget_spotify_compact_astro_${i}.png`))

  const wideAstro = await sharp(source)
    .resize(404, 404, { fit: 'contain', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer()

  await sharp({ create: { width: 840, height: 420, channels: 4, background: '#050706ff' } })
    .composite([
      { input: wideAstro, left: 438, top: 8 },
      { input: wideShade(), left: 0, top: 0 },
      { input: roundedMask(840, 420, 34), blend: 'dest-in' }
    ])
    .png()
    .toFile(path.join(drawable, `widget_spotify_wide_astro_${i}.png`))
}

const spotifyPulseFrames = 24
for (let frame = 0; frame < spotifyPulseFrames; frame++) {
  const bars = Array.from({ length: 24 }, (_, index) => {
    const angle = index * 15
    const phase = (frame / spotifyPulseFrames) * Math.PI * 2 + index * .72
    const energy = Math.sin(phase) * .5 + .5
    const inner = 84
    const outer = inner + 7 + energy * 18
    const opacity = (.18 + energy * .62).toFixed(2)
    return `<line x1="120" y1="${120 - inner}" x2="120" y2="${120 - outer}" transform="rotate(${angle} 120 120)" stroke="#d2ff1a" stroke-width="4" stroke-linecap="round" opacity="${opacity}"/>`
  }).join('')
  const orbit = (frame / spotifyPulseFrames) * 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <circle cx="120" cy="120" r="78" fill="none" stroke="#d2ff1a" stroke-width="1.3" opacity=".18"/>
    <circle cx="120" cy="120" r="97" fill="none" stroke="#cbd2c9" stroke-width="1" opacity=".10"/>
    ${bars}
    <g transform="rotate(${orbit} 120 120)">
      <circle cx="120" cy="19" r="4" fill="#d2ff1a" opacity=".90"/>
      <circle cx="120" cy="221" r="2.5" fill="#cbd2c9" opacity=".60"/>
    </g>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(
    path.join(drawable, `widget_spotify_pulse_${String(frame).padStart(2, '0')}.png`)
  )
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

console.log('Android preparado: icono adaptativo full-bleed, puente nativo y 7 widgets YOSE.')
