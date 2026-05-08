declare module "openclaw/plugin-sdk/channel-core" {
  export type OpenClawConfig = {
    channels?: Record<string, unknown>;
    [key: string]: unknown;
  };

  export function defineChannelPluginEntry(options: unknown): unknown;
  export function defineSetupPluginEntry(plugin: unknown): unknown;

  export function createChannelPluginBase(options: unknown): unknown;
  export function createChatChannelPlugin<TResolvedAccount = unknown>(params: unknown): unknown;
}
