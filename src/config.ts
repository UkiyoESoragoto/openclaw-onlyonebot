import type { OpenClawConfig } from "openclaw/plugin-sdk";

export const DEFAULT_ACCOUNT_ID = "default";

export type ResolvedOnlyonebotAccount = {
  accountId: string | null;
  token: string;
  enabled: boolean;
};

export function getOnlyonebotSection(
  cfg: OpenClawConfig,
): Record<string, unknown> | undefined {
  const ch = cfg.channels as Record<string, unknown> | undefined;
  const section = ch?.onlyonebot;
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return undefined;
  }
  return section as Record<string, unknown>;
}

export function resolveToken(
  section: Record<string, unknown> | undefined,
  accountId?: string | null,
): string {
  if (!section) return "";
  const id =
    accountId != null && String(accountId).trim() !== ""
      ? String(accountId).trim()
      : DEFAULT_ACCOUNT_ID;
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const rec = accounts as Record<string, unknown>;
    const acct = rec[id] ?? rec[DEFAULT_ACCOUNT_ID];
    if (acct && typeof acct === "object" && typeof (acct as { token?: unknown }).token === "string") {
      return String((acct as { token: string }).token).trim();
    }
  }
  if (typeof section.token === "string") {
    return section.token.trim();
  }
  return "";
}

export function listOnlyonebotAccountIds(cfg: OpenClawConfig): string[] {
  const section = getOnlyonebotSection(cfg);
  if (!section) return [];
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
    const ids = Object.keys(accounts as Record<string, unknown>).filter(Boolean);
    if (ids.length > 0) return ids;
  }
  if (resolveToken(section, DEFAULT_ACCOUNT_ID)) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return [];
}

export function resolveOnlyonebotAccount(
  cfg: OpenClawConfig,
  accountId?: string | null,
): ResolvedOnlyonebotAccount {
  const section = getOnlyonebotSection(cfg);
  const id =
    accountId != null && String(accountId).trim() !== ""
      ? String(accountId).trim()
      : DEFAULT_ACCOUNT_ID;
  const token = resolveToken(section, id);
  const sectionEnabled = section?.enabled;
  const accountEnabled =
    section?.accounts &&
    typeof section.accounts === "object" &&
    !Array.isArray(section.accounts) &&
    (section.accounts as Record<string, unknown>)[id] &&
    typeof (section.accounts as Record<string, unknown>)[id] === "object"
      ? ((
          (section.accounts as Record<string, Record<string, unknown>>)[id] as {
            enabled?: unknown;
          }
        ).enabled as boolean | undefined)
      : undefined;
  const enabled =
    typeof accountEnabled === "boolean"
      ? accountEnabled
      : typeof sectionEnabled === "boolean"
        ? sectionEnabled
        : true;
  return {
    accountId: id === DEFAULT_ACCOUNT_ID ? null : id,
    token,
    enabled,
  };
}

export function resolveDefaultOnlyonebotAccountId(cfg: OpenClawConfig): string {
  const ids = listOnlyonebotAccountIds(cfg);
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}
