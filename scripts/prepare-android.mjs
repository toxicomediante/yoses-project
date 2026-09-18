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
  await sharp(iconSource).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher.png'))
  await sharp(iconSource).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher_round.png'))
}
const adaptive = path.join(mainRoot, 'res', 'mipmap-anydpi-v26')
rmSync(path.join(adaptive, 'ic_launcher.xml'), { force: true })
rmSync(path.join(adaptive, 'ic_launcher_round.xml'), { force: true })

console.log('Android preparado: icono, puente nativo y 4 widgets YOSE.')
