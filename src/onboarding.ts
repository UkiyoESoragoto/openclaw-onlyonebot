type AnyRecord = Record<string, any>;

export const onlyOneBotOnboardingAdapter: AnyRecord = {
  buildExampleConfig(): AnyRecord {
    return {
      channels: {
        onebot: {
          accounts: {
            default: {
              enabled: true,
              baseUrl: "http://127.0.0.1:5700",
              accessToken: "",
            },
          },
        },
      },
    };
  },
};
