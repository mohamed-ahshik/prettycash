export function getVisionConfig() {
  return {
    baseUrl: process.env.EXPO_PUBLIC_VISION_BASE_URL ?? '',
    apiKey: process.env.EXPO_PUBLIC_VISION_API_KEY ?? '',
  };
}
