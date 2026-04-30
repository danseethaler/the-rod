import {ConfigContext, ExpoConfig} from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Krumb (Dev)' : 'Krumb',
  slug: 'krumb',
  scheme: 'krumb',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#18181b',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'app.krumb.ios.dev' : 'app.krumb.ios',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#18181b',
      dark: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#18181b',
      },
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: ['expo-router'],
  runtimeVersion: {
    policy: 'appVersion',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    simulator: {
      name: 'Krumb',
      deviceType: 'iPhone-17-Pro',
      runtime: 'iOS-26-4',
    },
  },
});
