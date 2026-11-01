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

  return {
    ...config,
    name: config.name ?? 'PrettyCash',
    slug: config.slug ?? 'prettycash',
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
