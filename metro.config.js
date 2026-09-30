const { getDefaultConfig } = require('expo/metro-config');

/** 默认配置足以处理 expo 包的 TS 入口，这里仅做显式声明 */
const config = getDefaultConfig(__dirname);

module.exports = config;
