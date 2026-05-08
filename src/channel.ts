import {
  createChatChannelPlugin,
  createChannelPluginBase,
} from "openclaw/plugin-sdk/channel-core";
import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
import { onlyOneBotApi } from "./client.js"; // your platform API client

type ResolvedAccount = {
  accountId: string | null;
  token: string;
  allowFrom: string[];
  dmPolicy: string | undefined;
};

function resolveAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedAccount {
  const section = (cfg.channels as Record<string, any>)?.["onlyonebot"];
  const token = section?.token;
  if (!token) throw new Error("onlyonebot: token is required");
  return {
    accountId: accountId ?? null,
    token,
    allowFrom: section?.allowFrom ?? [],
    dmPolicy: section?.dmSecurity,
  };
}

function normalizeSetupInput(input: Record<string, unknown>): {
  token?: string;
  allowFrom?: string[];
} {
  const token =
    typeof input.token === "string" && input.token.trim()
      ? input.token.trim()
      : undefined;
  const allowFrom = Array.isArray(input.allowFrom)
    ? input.allowFrom.filter((v): v is string => typeof v === "string")
    : undefined;
  return { token, allowFrom };
}

export const onlyOneBotPlugin = createChatChannelPlugin<ResolvedAccount>({
  base: createChannelPluginBase({
    id: "onlyonebot",
    config: {
      listAccountIds(cfg: OpenClawConfig) {
        const section = (cfg.channels as Record<string, any>)?.onlyonebot;
        return section ? ["default"] : [];
      },
      resolveAccount,
      inspectAccount(cfg: OpenClawConfig, accountId?: string | null) {
        const section = (cfg.channels as Record<string, any>)?.onlyonebot;
        return {
          enabled: Boolean(section?.enabled ?? section?.token),
          configured: Boolean(section?.token),
          accountId: accountId ?? "default",
          tokenStatus: section?.token ? "available" : "missing",
        };
      },
    } as any,
    setup: {
      resolveAccountId({ accountId }: { accountId?: string }) {
        return accountId && accountId.trim() ? accountId.trim() : "default";
      },
      applyAccountConfig({ cfg, input }: { cfg: OpenClawConfig; input: unknown }) {
        const setupInput = normalizeSetupInput(
          (input ?? {}) as Record<string, unknown>,
        );
        const prevChannel = (cfg.channels as Record<string, unknown>)?.[
          "onlyonebot"
        ] as Record<string, unknown> | undefined;
        const nextChannel: Record<string, unknown> = {
          ...(prevChannel ?? {}),
        };
        if (setupInput.token) {
          nextChannel.token = setupInput.token;
        }
        if (setupInput.allowFrom) {
          nextChannel.allowFrom = setupInput.allowFrom;
        }
        return {
          ...cfg,
          channels: {
            ...(cfg.channels ?? {}),
            onlyonebot: nextChannel,
          },
        };
      },
      validateInput({ input }: { input: unknown }) {
        const setupInput = normalizeSetupInput(
          (input ?? {}) as Record<string, unknown>,
        );
        if (!setupInput.token) {
          return "token is required";
        }
        return null;
      },
    },
    capabilities: {} as any,
  } as any),

  // DM security: who can message the bot
  security: {
    dm: {
      channelKey: "onlyonebot",
      resolvePolicy: (account: ResolvedAccount) => account.dmPolicy,
      resolveAllowFrom: (account: ResolvedAccount) => account.allowFrom,
      defaultPolicy: "allowlist",
    },
  },

  // Pairing: approval flow for new DM contacts
  pairing: {
    text: {
      idLabel: "Only OneBot username",
      message: "Send this code to verify your identity:",
      notify: async ({ message }: { message?: string }) => {
        const target = String(message ?? "");
        await onlyOneBotApi.sendDm(target, `Pairing request: ${message ?? ""}`);
      },
    },
  },

  // Threading: how replies are delivered
  threading: { topLevelReplyToMode: "reply" },

  // Outbound: send messages to the platform
  outbound: {
    attachedResults: {
      channel: "onlyonebot",
      sendText: async (params: any) => {
        const result = await onlyOneBotApi.sendMessage(
          params.to,
          params.text,
        );
        return { messageId: result.id };
      },
    },
    base: {} as any,
  },
} as any);