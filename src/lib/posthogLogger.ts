import { posthog } from './posthog';

type LogAttributes = Record<string, string | number | boolean | undefined>;

export const posthogLogger = {
  info(message: string, attributes: LogAttributes = {}) {
    posthog?.logger.info(message, attributes);
  },

  warn(message: string, attributes: LogAttributes = {}) {
    posthog?.logger.warn(message, attributes);
  },
};
