import type { ChannelPlugin } from "openclaw/plugin-sdk";

import {
  type ResolvedOnlyonebotAccount,
  listOnlyonebotAccountIds,
  resolveDefaultOnlyonebotAccountId,
  resolveOnlyonebotAccount,
} from "./config.js";
import { onlyOneBotOnboardingAdapter } from "./onboarding.js";

export const onlyOneBotPlugin: ChannelPlugin<ResolvedOnlyonebotAccount> = {
  id: "onlyonebot",
  meta: {
    id: "onlyonebot",
    label: "Only OneBot",
    selectionLabel: "OnlyOneBot",
    docsPath: "https://docs.openclaw.ai/plugins/sdk-channel-plugins",
    blurb: "占位 OneBot 渠道插件（用于验证安装与 UI）",
    order: 95,
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reply: true,
    media: false,
  },
  reload: { configPrefixes: ["channels.onlyonebot"] },
  onboarding: onlyOneBotOnboardingAdapter,

  config: {
    listAccountIds: listOnlyonebotAccountIds,
    resolveAccount: resolveOnlyonebotAccount,
    defaultAccountId: resolveDefaultOnlyonebotAccountId,
    describeAccount(account) {
      const configured = Boolean(account?.token?.trim());
      const id = account?.accountId ?? "default";
      return {
        accountId: String(id),
        name: "OnlyOneBot",
        enabled: account?.enabled ?? false,
        configured,
      };
    },
    isConfigured(account) {
      return Boolean(account?.token?.trim());
    },
  },

  setup: {
    resolveAccountId({ accountId }) {
      return accountId?.trim() || "default";
    },
    validateInput({ input }) {
      const token =
        input?.token != null && typeof input.token === "string" ? input.token.trim() : "";
      if (!token) return "token is required";
      return null;
    },
    applyAccountConfig({ cfg, accountId, input }) {
      const token =
        input?.token != null && typeof input.token === "string" ? input.token.trim() : "";
      const id = accountId?.trim() || "default";
      const prevRoot = (cfg.channels?.onlyonebot as Record<string, unknown>) || {};

      if (id === "default") {
        return {
          ...cfg,
          channels: {
            ...cfg.channels,
            onlyonebot: {
              ...prevRoot,
              token,
              enabled: true,
            },
          },
        };
      }

      const prevAccounts =
        prevRoot.accounts && typeof prevRoot.accounts === "object" && !Array.isArray(prevRoot.accounts)
          ? { ...(prevRoot.accounts as Record<string, unknown>) }
          : {};
      const prevAcct = (prevAccounts[id] as Record<string, unknown>) || {};

      return {
        ...cfg,
        channels: {
          ...cfg.channels,
          onlyonebot: {
            ...prevRoot,
            accounts: {
              ...prevAccounts,
              [id]: {
                ...prevAcct,
                token,
                enabled: true,
              },
            },
          },
        },
      };
    },
  },

  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({
      channel: "onlyonebot" as const,
      messageId: "stub",
    }),
  },

  gateway: {
    startAccount: async ({ abortSignal, setStatus, getStatus }) => {
      setStatus({
        ...getStatus(),
        running: true,
        connected: true,
        lastConnectedAt: Date.now(),
      });
      await new Promise<void>((resolve) => {
        if (abortSignal.aborted) {
          resolve();
          return;
        }
        const onAbort = () => {
          abortSignal.removeEventListener("abort", onAbort);
          resolve();
        };
        abortSignal.addEventListener("abort", onAbort, { once: true });
      });
      setStatus({
        ...getStatus(),
        running: false,
        connected: false,
      });
    },
  },

  status: {
    defaultRuntime: {
      accountId: "default",
      name: "OnlyOneBot",
      enabled: true,
      configured: false,
    },
    probeAccount: async ({ account }: { account: ResolvedOnlyonebotAccount }) => {
      if (!account.token?.trim()) {
        return { ok: false as const, error: "token missing" };
      }
      return { ok: true as const };
    },
    buildAccountSnapshot: ({
      account,
    }: {
      account: ResolvedOnlyonebotAccount;
      runtime?: unknown;
    }) => {
      const configured = Boolean(account.token?.trim());
      const id = account.accountId ?? "default";
      return {
        accountId: String(id),
        name: "OnlyOneBot",
        enabled: account.enabled,
        configured,
        statusState: configured ? "ready" : "unconfigured",
        connected: configured,
        running: configured && account.enabled,
      };
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: Boolean(snapshot.configured),
      running: Boolean(snapshot.running),
      connected: Boolean(snapshot.connected),
      statusState: snapshot.statusState ?? "unknown",
    }),
    formatCapabilitiesProbe: ({
      probe,
    }: {
      probe: { ok: boolean; error?: unknown };
    }) => {
      if (probe.ok) {
        return [{ text: "token present", tone: "success" as const }];
      }
      return [
        {
          text: typeof probe.error === "string" ? probe.error : "not configured",
          tone: "warn" as const,
        },
      ];
    },
  },

  security: {
    dm: {
      channelKey: "onlyonebot",
      resolvePolicy: () => "open",
      resolveAllowFrom: () => [],
      defaultPolicy: "open",
    },
  },
};
