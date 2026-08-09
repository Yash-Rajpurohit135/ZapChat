import 'dotenv/config';
import process from 'process';

export default {
  expo: {
    name: 'ZapChat',
    slug: 'ZapChat',
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'src/assets/logo.png',
    userInterfaceStyle: 'light',
    entryPoint: './src/App.js',
    splash: {
      image: 'src/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: 'src/assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.ctere1.reactnativechat',
    },
    web: {
      favicon: 'src/assets/favicon.png',
    },
    plugins: ['expo-font'],
    newArchEnabled: true,
    extra: {
      apiKey: process.env.EXPO_PUBLIC_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
      EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    },
  },
};
