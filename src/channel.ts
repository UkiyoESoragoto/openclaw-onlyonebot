import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
import { onlyOneBotApi } from "./client.js"; // your platform API client

type ResolvedAccount = {
  accountId: string | null;
  token: string;
  allowFrom: string[];
  dmPolicy: string | undefined;
};

function getOnlyonebotSection(cfg: OpenClawConfig): Record<string, any> | undefined {
  const ch = cfg.channels as Record<string, unknown> | undefined;
  const section = ch?.onlyonebot;
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return undefined;
  }
  return section as Record<string, any>;
}

/** Token may live at `channels.onlyonebot.token` or `channels.onlyonebot.accounts.<id>.token`. */
function resolveTokenForAccount(
  section: Record<string, any> | undefined,
  accountId?: string | null,
): string {
  if (!section) return "";
  const id =
    accountId != null && String(accountId).trim() !== ""
      ? String(accountId).trim()
      : "default";
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const rec = accounts as Record<string, any>;
    const acct = rec[id] ?? rec.default;
    if (acct && typeof acct === "object" && typeof acct.token === "string") {
      return acct.token.trim();
    }
  }
  if (typeof section.token === "string") {
    return section.token.trim();
  }
  return "";
}

function resolveAllowFromForAccount(
  section: Record<string, any> | undefined,
  accountId?: string | null,
): string[] {
  if (!section) return [];
  const id =
    accountId != null && String(accountId).trim() !== ""
      ? String(accountId).trim()
      : "default";
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const rec = accounts as Record<string, any>;
    const acct = rec[id] ?? rec.default;
    if (acct && typeof acct === "object" && Array.isArray(acct.allowFrom)) {
      return acct.allowFrom.filter((v: unknown): v is string => typeof v === "string");
    }
  }
  if (Array.isArray(section.allowFrom)) {
    return section.allowFrom.filter((v: unknown): v is string => typeof v === "string");
  }
  return [];
}

function listOnlyonebotAccountIds(cfg: OpenClawConfig): string[] {
  const section = getOnlyonebotSection(cfg);
  if (!section) return [];
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const ids = Object.keys(accounts as Record<string, unknown>).filter(Boolean);
    if (ids.length > 0) return ids;
  }
  if (resolveTokenForAccount(section, "default")) return ["default"];
  return [];
}

function resolveAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedAccount {
  const section = getOnlyonebotSection(cfg);
  const id =
    accountId != null && String(accountId).trim() !== ""
      ? String(accountId).trim()
      : "default";
  const token = resolveTokenForAccount(section, id);
  const allowFrom = resolveAllowFromForAccount(section, id);
  const dmPolicy =
    section?.dmSecurity ?? section?.dmPolicy ?? undefined;
  return {
    accountId: id === "default" ? null : id,
    token,
    allowFrom,
    dmPolicy,
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

export const onlyOneBotPlugin = {
  id: "onlyonebot",
  meta: {
    id: "onlyonebot",
    label: "Only OneBot",
    selectionLabel: "OnlyOneBot",
    docsPath: "https://docs.openclaw.ai/plugins/sdk-channel-plugins",
    blurb: "Minimal OneBot v11 channel plugin for OpenClaw",
    order: 90,
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reply: true,
    media: true,
  },
  reload: { configPrefixes: ["channels.onlyonebot"] },
  config: {
    listAccountIds: listOnlyonebotAccountIds,
    resolveAccount,
    defaultAccountId: () => "default",
    describeAccount(account: ResolvedAccount) {
      const configured = Boolean(account.token?.trim());
      const id = account.accountId ?? "default";
      return {
        accountId: String(id),
        name: "OnlyOneBot",
        enabled: true,
        configured,
      };
    },
    isConfigured(account: ResolvedAccount) {
      return Boolean(account.token?.trim());
    },
    resolveAllowFrom: ({ cfg, accountId }: { cfg: OpenClawConfig; accountId?: string | null }) => {
      return resolveAllowFromForAccount(getOnlyonebotSection(cfg), accountId);
    },
  },
  setup: {
    resolveAccountId({ accountId }: { accountId?: string }) {
      return accountId && accountId.trim() ? accountId.trim() : "default";
    },
    applyAccountConfig({ cfg, input }: { cfg: OpenClawConfig; input: unknown }) {
      const setupInput = normalizeSetupInput((input ?? {}) as Record<string, unknown>);
      const prevChannel = (cfg.channels as Record<string, unknown>)?.onlyonebot as
        | Record<string, unknown>
        | undefined;
      const nextChannel: Record<string, unknown> = { ...(prevChannel ?? {}) };
      if (setupInput.token) nextChannel.token = setupInput.token;
      if (setupInput.allowFrom) nextChannel.allowFrom = setupInput.allowFrom;
      return {
        ...cfg,
        channels: {
          ...(cfg.channels ?? {}),
          onlyonebot: nextChannel,
        },
      };
    },
    validateInput({ input }: { input: unknown }) {
      const setupInput = normalizeSetupInput((input ?? {}) as Record<string, unknown>);
      if (!setupInput.token) return "token is required";
      return null;
    },
  },
  security: {
    dm: {
      channelKey: "onlyonebot",
      resolvePolicy: (account: ResolvedAccount) => account.dmPolicy,
      resolveAllowFrom: (account: ResolvedAccount) => account.allowFrom,
      defaultPolicy: "allowlist",
    },
  },
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
  outbound: {
    deliveryMode: "direct",
    sendText: async ({
      to,
      text,
      accountId,
      cfg,
    }: {
      to: string;
      text: string;
      accountId?: string | null;
      cfg: OpenClawConfig;
    }) => {
      const acc = resolveAccount(cfg, accountId);
      if (!acc.token?.trim()) throw new Error("onlyonebot: token is required to send");
      const result = await onlyOneBotApi.sendMessage(to, text);
      return {
        channel: "onlyonebot" as const,
        messageId: result.id,
      };
    },
  },
  gateway: {
    startAccount: async ({
      abortSignal,
      setStatus,
      getStatus,
    }: {
      abortSignal: AbortSignal;
      setStatus: (next: Record<string, unknown>) => void;
      getStatus: () => Record<string, unknown>;
    }) => {
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
    probeAccount: async ({
      account,
    }: {
      account: ResolvedAccount;
      timeoutMs: number;
      cfg: OpenClawConfig;
    }) => {
      const token = account.token?.trim();
      if (!token) {
        return { ok: false as const, error: "token missing" };
      }
      return { ok: true as const };
    },
    buildAccountSnapshot: async ({
      account,
    }: {
      account: ResolvedAccount;
      cfg: OpenClawConfig;
    }) => {
      const configured = Boolean(account.token?.trim());
      const id = account.accountId ?? "default";
      return {
        accountId: String(id),
        name: "OnlyOneBot",
        enabled: true,
        configured,
        statusState: configured ? "ready" : "unconfigured",
        connected: configured,
        running: configured,
      };
    },
    buildChannelSummary: ({
      snapshot,
    }: {
      snapshot: Record<string, unknown>;
    }) => ({
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