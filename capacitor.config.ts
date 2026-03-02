import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amoghahotels.kiosk',
  appName: 'Amogha Kiosk',
  webDir: 'kiosk-dist',
  server: {
    allowNavigation: [
      'www.gstatic.com',
      'checkout.razorpay.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'firebasestorage.googleapis.com'
    ],
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#080604',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080604'
    }
  }
};

export default config;
