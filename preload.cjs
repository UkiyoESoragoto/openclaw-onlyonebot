/**
 * 插件预加载入口（CJS 格式）。
 * 仅负责同步加载编译后的入口并展平 default export。
 */
"use strict";
 
// Node 22 原生支持 CJS require() 加载 ESM 模块。
const _pluginModule = require("./dist/index.js");
 
// 展平 default export，方便框架读取顶层 register/activate。
const _default = _pluginModule.default;
const merged = Object.assign({}, _pluginModule);
if (_default && typeof _default === "object") {
  for (const key of Object.keys(_default)) {
    if (!(key in merged)) {
      merged[key] = _default[key];
    }
  }
}

module.exports = merged;
