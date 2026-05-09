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

const pluginCore = createChatChannelPlugin<ResolvedAccount>({
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
    capabilities: {
      chatTypes: ["direct", "group"],
      reply: true,
      media: true,
    } as any,
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
});

export const onlyOneBotPlugin = {
  ...(pluginCore as Record<string, unknown>),
  status: {
    defaultRuntime: {
      accountId: "default",
      name: "OnlyOneBot",
      enabled: true,
      configured: false,
    },
    probeAccount: async ({
      cfg,
    }: {
      account: ResolvedAccount;
      timeoutMs: number;
      cfg: OpenClawConfig;
    }) => {
      const section = (cfg.channels as Record<string, unknown>)?.onlyonebot as
        | Record<string, unknown>
        | undefined;
      const token = section?.token;
      if (typeof token !== "string" || !token.trim()) {
        return { ok: false as const, error: "token missing" };
      }
      return { ok: true as const };
    },
    buildAccountSnapshot: async ({
      account,
      cfg,
    }: {
      account: ResolvedAccount;
      cfg: OpenClawConfig;
    }) => {
      const section = (cfg.channels as Record<string, unknown>)?.onlyonebot as
        | Record<string, unknown>
        | undefined;
      const configured = typeof section?.token === "string" && !!section.token;
      return {
        accountId: String(account.accountId ?? "default"),
        name: "OnlyOneBot",
        enabled: true,
        configured,
        statusState: configured ? "ready" : "unconfigured",
        connected: configured,
        running: configured,
      };
    },
    formatCapabilitiesProbe: ({
      probe,
    }: {
      probe: { ok: boolean; error?: unknown };
    }) => {
      if (probe.ok) {
        return [{ text: "OnlyOneBot token present", tone: "success" as const }];
      }
      return [
        {
          text:
            typeof probe.error === "string"
              ? probe.error
              : "OnlyOneBot not configured",
          tone: "warn" as const,
        },
      ];
    },
  },
} as any;