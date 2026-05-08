export const onlyOneBotApi = {
  async sendDm(_target: string, _text: string): Promise<void> {
    // TODO: implement OneBot DM API call.
  },

  async sendMessage(
    _to: string,
    _text: string,
  ): Promise<{ id: string }> {
    // TODO: implement OneBot message API call.
    return { id: crypto.randomUUID() };
  },

  async sendFile(_to: string, _filePath: string): Promise<void> {
    // TODO: implement OneBot file API call.
  },
};
