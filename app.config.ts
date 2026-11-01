import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_PLUGIN = '@react-native-google-signin/google-signin';

function getIosUrlScheme(): string | undefined {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!clientId) return undefined;
  return `com.googleusercontent.apps.${clientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== GOOGLE_PLUGIN;
  });
  const iosUrlScheme = getIosUrlScheme();
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_FILE?.trim() || config.android?.googleServicesFile || './google-services.json';
  const devLoginOffValue = (
    process.env.DEV_LOGIN_OFF ??
    process.env.dev_login_off ??
    process.env.EXPO_PUBLIC_DEV_LOGIN_OFF ??
    ''
  ).trim().toLowerCase();
  const devLoginOff = devLoginOffValue === 'true' || devLoginOffValue === '1';

  return {
    ...config,
    name: config.name ?? 'PrettyCash',
    slug: config.slug ?? 'prettycash',
    extra: {
      ...(config.extra ?? {}),
      devLoginOff,
    },
    android: {
      ...(config.android ?? {}),
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins: [
      ...plugins,
      ...(iosUrlScheme
        ? [[GOOGLE_PLUGIN, { iosUrlScheme }] as [string, { iosUrlScheme: string }]]
        : []),
    ],
  };
};
