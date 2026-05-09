import { onlyOneBotPlugin } from "./src/channel.js";
import { onlyOneBotOnboardingAdapter } from "./src/onboarding.js";

const setupEntry: any = {
  plugin: onlyOneBotPlugin,
  onboarding: onlyOneBotOnboardingAdapter,
};

export default setupEntry;
export { onlyOneBotOnboardingAdapter };
