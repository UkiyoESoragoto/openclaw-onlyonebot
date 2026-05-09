type AnyRecord = Record<string, any>;

interface OneBotAccount {
  accountId: string;
  enabled: boolean;
  baseUrl: string;
  accessToken?: string;
}

function getAccounts(config: AnyRecord): Record<string, AnyRecord> {
  return config?.channels?.onlyonebot?.accounts ?? config?.channels?.onebot?.accounts ?? {};
}

function toAccount(accountId: string, raw: AnyRecord | undefined): OneBotAccount | undefined {
  if (!raw || !raw.baseUrl) return undefined;
  return {
    accountId,
    enabled: raw.enabled ?? true,
    baseUrl: String(raw.baseUrl),
    accessToken: raw.accessToken ? String(raw.accessToken) : undefined,
  };
}

function buildSendPayload(target: AnyRecord, text: string): AnyRecord {
  const isGroup = target?.chatType === "group" || target?.isGroup === true;
  if (isGroup) {
    return {
      message_type: "group",
      group_id: Number(target.id) || target.id,
      message: text,
    };
  }
  return {
    message_type: "private",
    user_id: Number(target?.id) || target?.id,
    message: text,
  };
}

export const onlyOneBotPlugin = {
  id: "onlyonebot",
  meta: {
    id: "onlyonebot",
    label: "Only OneBot",
    selectionLabel: "Only OneBot (HTTP API)",
    docsPath: "/channels/onlyonebot",
    blurb: "Minimal OneBot channel plugin.",
    aliases: ["ob", "onebot"],
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    supports: {
      mentions: false,
      threads: false,
      reactions: false,
      edits: false,
      deletions: false,
    },
  },
  config: {
    listAccountIds: (cfg: AnyRecord): string[] => {
      const ids = Object.keys(getAccounts(cfg));
      return ids.length > 0 ? ids : ["default"];
    },
    resolveAccount: (cfg: AnyRecord, accountId: string | undefined): OneBotAccount | undefined => {
      const accounts = getAccounts(cfg);
      const resolvedId = accountId ?? "default";
      const fromConfig = toAccount(resolvedId, accounts[resolvedId]);
      if (fromConfig) return fromConfig;
      return {
        accountId: resolvedId,
        enabled: true,
        baseUrl: "http://127.0.0.1:5700",
        accessToken: "",
      };
    },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text, target, account }: AnyRecord): Promise<AnyRecord> => {
      if (!account?.baseUrl) {
        return { ok: false, error: "Missing account.baseUrl in channel config." };
      }
      if (!target?.id) {
        return { ok: false, error: "Missing target.id." };
      }

      const url = `${String(account.baseUrl).replace(/\/$/, "")}/send_msg`;
      const payload = buildSendPayload(target, String(text ?? ""));
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (account.accessToken) {
        headers.authorization = `Bearer ${account.accessToken}`;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: `OneBot HTTP ${response.status} ${response.statusText}`,
          };
        }

        const data = (await response.json().catch(() => ({}))) as AnyRecord;
        return {
          ok: true,
          messageId: data?.data?.message_id ?? data?.message_id,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown send error",
        };
      }
    },
  },
};
