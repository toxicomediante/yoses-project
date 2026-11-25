import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yose.project',
  appName: "YOSE'S PROJECT",
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SystemBars: { insetsHandling: 'disable', style: 'DARK', hidden: false },
  },
}

export default config
