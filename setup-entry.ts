import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { onlyOneBotPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(onlyOneBotPlugin);