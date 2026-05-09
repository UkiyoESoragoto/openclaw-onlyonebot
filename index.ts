import { onlyOneBotPlugin } from "./src/channel.js";

const plugin = {
  id: "openclaw-onlyonebot",
  name: "Only OneBot",
  description: "占位 OneBot 渠道插件（验证安装与 WebUI）",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  register(api: any) {
    console.info("[openclaw-onlyonebot] register channel plugin", {
      pluginId: "openclaw-onlyonebot",
      channelId: onlyOneBotPlugin.id,
      registrationMode: api?.registrationMode ?? "unknown",
    });
    api.registerChannel({ plugin: onlyOneBotPlugin as any });
  },
};

export default plugin;

export { onlyOneBotPlugin } from "./src/channel.js";
export { onlyOneBotOnboardingAdapter } from "./src/onboarding.js";
