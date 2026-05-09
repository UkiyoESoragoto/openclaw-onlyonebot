import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { onlyOneBotPlugin } from "./src/channel.js";

type OneBotWebhookEvent = Record<string, unknown>;

/** 写入插件根目录 plugin-diag.log；不依赖 podman logs 是否收集 stdout */
function appendPluginDiag(line: string): void {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pluginRoot = path.resolve(here, "..");
    fs.appendFileSync(
      path.join(pluginRoot, "plugin-diag.log"),
      `[${new Date().toISOString()}] ${line}\n`,
    );
  } catch {
    // ignore
  }
}

function parseWebhookPayload(req: unknown): OneBotWebhookEvent {
  if (req && typeof req === "object" && "body" in req) {
    const body = (req as { body?: unknown }).body;
    if (body && typeof body === "object") {
      return body as OneBotWebhookEvent;
    }
  }
  return {};
}

async function handleOnlyOneBotInbound(
  _api: unknown,
  _event: OneBotWebhookEvent,
): Promise<void> {
  // Placeholder for inbound dispatch wiring.
}

const plugin = {
  id: "onlyonebot",
  name: "Only OneBot",
  description: "Only OneBot channel plugin",
  register(api: any) {
    appendPluginDiag("register() called");
    console.log("[onlyonebot:diag] register() called");
    api.registerChannel({ plugin: onlyOneBotPlugin as any });
    console.log("[onlyonebot:diag] registerChannel() done", {
      pluginId: onlyOneBotPlugin?.id,
        metaId: (onlyOneBotPlugin as any)?.meta?.id,
    });
    appendPluginDiag("registerChannel() done");
    (api as any).registerCli?.(
      ({ program }: any) => {
        program
          .command("onlyonebot")
          .description("Only OneBot management");
      },
      {
        descriptors: [
          {
            name: "onlyonebot",
            description: "Only OneBot management",
            hasSubcommands: false,
          },
        ],
      },
    );
    (api as any).registerHttpRoute?.({
      path: "/onlyonebot/webhook",
      auth: "plugin", // plugin-managed auth (verify signatures yourself)
      handler: async (req: any, res: any) => {
        console.log("[onlyonebot:diag] webhook route hit");
        const event = parseWebhookPayload(req);
  
        // Your inbound handler dispatches the message to OpenClaw.
        // The exact wiring depends on your platform SDK -
        // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
        await handleOnlyOneBotInbound(api, event);
  
        res.statusCode = 200;
        res.end("ok");
        return true;
      },
    });
  },
};

export default plugin;