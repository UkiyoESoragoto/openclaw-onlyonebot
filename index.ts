import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";

import { onlyOneBotPlugin } from "./src/channel.js";

const plugin = {
  id: "openclaw-onlyonebot",
  name: "Only OneBot",
  description: "占位 OneBot 渠道插件（验证安装与 WebUI）",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerChannel({ plugin: onlyOneBotPlugin as any });
  },
};

export default plugin;

export { onlyOneBotPlugin } from "./src/channel.js";
export { onlyOneBotOnboardingAdapter } from "./src/onboarding.js";
