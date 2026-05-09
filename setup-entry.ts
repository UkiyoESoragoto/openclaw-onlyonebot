import { onlyOneBotPlugin } from "./src/channel.js";
import { onlyOneBotOnboardingAdapter } from "./src/onboarding.js";

console.info("[openclaw-onlyonebot] setup-entry module loaded");

const setupEntry: any = {
  plugin: onlyOneBotPlugin,
  onboarding: onlyOneBotOnboardingAdapter,
};

export default setupEntry;
export { onlyOneBotOnboardingAdapter };
