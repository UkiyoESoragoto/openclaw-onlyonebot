import type {
  ChannelOnboardingAdapter,
  ChannelOnboardingConfigureContext,
  ChannelOnboardingStatus,
  ChannelOnboardingStatusContext,
  ChannelOnboardingResult,
  OpenClawConfig,
} from "openclaw/plugin-sdk";

import {
  DEFAULT_ACCOUNT_ID,
  listOnlyonebotAccountIds,
  resolveDefaultOnlyonebotAccountId,
  resolveOnlyonebotAccount,
} from "./config.js";

interface Prompter {
  note: (message: string, title?: string) => Promise<void>;
  confirm: (opts: { message: string; initialValue?: boolean }) => Promise<boolean>;
  text: (opts: {
    message: string;
    placeholder?: string;
    initialValue?: string;
    validate?: (value: string) => string | undefined;
  }) => Promise<string>;
}

function cfgFromCtx(ctx: ChannelOnboardingStatusContext | ChannelOnboardingConfigureContext): OpenClawConfig {
  const raw = ctx as { cfg?: OpenClawConfig; config?: OpenClawConfig };
  return (raw.cfg ?? raw.config ?? {}) as OpenClawConfig;
}

/**
 * 为 `openclaw onboard` 提供最小可用的交互式配置引导（占位实现，无真实连接逻辑）。
 */
export const onlyOneBotOnboardingAdapter: ChannelOnboardingAdapter = {
  channel: "onlyonebot" as any,

  getStatus: async (ctx: ChannelOnboardingStatusContext): Promise<ChannelOnboardingStatus> => {
    const cfg = cfgFromCtx(ctx);
    const configured = listOnlyonebotAccountIds(cfg).some((accountId) => {
      const account = resolveOnlyonebotAccount(cfg, accountId);
      return Boolean(account.token?.trim());
    });

    return {
      channel: "onlyonebot" as any,
      configured,
      statusLines: [`Only OneBot: ${configured ? "已填写 token" : "需要 token（可为任意占位字符串）"}`],
      selectionHint: configured ? "已配置" : "安装验证用占位渠道",
      quickstartScore: configured ? 1 : 15,
    };
  },

  configure: async (ctx: ChannelOnboardingConfigureContext): Promise<ChannelOnboardingResult> => {
    let cfg = cfgFromCtx(ctx);
    const prompter = ctx.prompter as Prompter;
    const accountId = resolveDefaultOnlyonebotAccountId(cfg);
    const resolved = resolveOnlyonebotAccount(cfg, accountId);

    await prompter.note(
      [
        "此为占位渠道插件，用于验证 OpenClaw 安装与 WebUI 展示。",
        "以下 token 仅写入本地配置，不会连接真实 OneBot 服务。",
        "",
        "文档: https://docs.openclaw.ai/plugins/sdk-channel-plugins",
      ].join("\n"),
      "Only OneBot",
    );

    let token = resolved.token?.trim() ?? "";
    if (!token) {
      token = String(
        await prompter.text({
          message: "请输入占位 token（任意非空字符串即可）",
          placeholder: "stub-token",
          validate: (value: string) => (value?.trim() ? undefined : "不能为空"),
        }),
      ).trim();
    } else {
      const keep = await prompter.confirm({
        message: "已存在 token，是否保留当前配置？",
        initialValue: true,
      });
      if (!keep) {
        token = String(
          await prompter.text({
            message: "请输入新的占位 token",
            placeholder: "stub-token",
            validate: (value: string) => (value?.trim() ? undefined : "不能为空"),
          }),
        ).trim();
      }
    }

    const prev = (cfg.channels?.onlyonebot as Record<string, unknown>) || {};
    cfg = {
      ...cfg,
      channels: {
        ...cfg.channels,
        onlyonebot: {
          ...prev,
          enabled: true,
          token,
        },
      },
    };

    return { success: true, cfg: cfg as any, accountId };
  },

  disable: (cfg: unknown) => {
    const config = cfg as OpenClawConfig;
    return {
      ...config,
      channels: {
        ...config.channels,
        onlyonebot: {
          ...((config.channels?.onlyonebot as Record<string, unknown>) || {}),
          enabled: false,
        },
      },
    } as any;
  },
};
