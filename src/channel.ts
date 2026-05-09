type AnyRecord = Record<string, any>;

console.info("[openclaw-onlyonebot] channel module loaded");

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
      const finalIds = ids.length > 0 ? ids : ["default"];
      console.info("[openclaw-onlyonebot] listAccountIds", { ids: finalIds, sourceCount: ids.length });
      return finalIds;
    },
    resolveAccount: (cfg: AnyRecord, accountId: string | undefined): OneBotAccount | undefined => {
      const accounts = getAccounts(cfg);
      const resolvedId = accountId ?? "default";
      const fromConfig = toAccount(resolvedId, accounts[resolvedId]);
      if (fromConfig) {
        console.info("[openclaw-onlyonebot] resolveAccount from config", {
          accountId: resolvedId,
          baseUrl: fromConfig.baseUrl,
          enabled: fromConfig.enabled,
        });
        return fromConfig;
      }
      const fallback = {
        accountId: resolvedId,
        enabled: true,
        baseUrl: "http://127.0.0.1:5700",
        accessToken: "",
      };
      console.warn("[openclaw-onlyonebot] resolveAccount fallback", {
        accountId: resolvedId,
        baseUrl: fallback.baseUrl,
      });
      return fallback;
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
      console.info("[openclaw-onlyonebot] sendText request", {
        accountId: account?.accountId ?? "default",
        targetId: target?.id,
        messageType: payload.message_type,
        url,
      });
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
          console.error("[openclaw-onlyonebot] sendText failed", {
            status: response.status,
            statusText: response.statusText,
          });
          return {
            ok: false,
            error: `OneBot HTTP ${response.status} ${response.statusText}`,
          };
        }

        const data = (await response.json().catch(() => ({}))) as AnyRecord;
        console.info("[openclaw-onlyonebot] sendText ok", {
          messageId: data?.data?.message_id ?? data?.message_id ?? null,
        });
        return {
          ok: true,
          messageId: data?.data?.message_id ?? data?.message_id,
        };
      } catch (error) {
        console.error("[openclaw-onlyonebot] sendText exception", {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown send error",
        };
      }
    },
  },
};
