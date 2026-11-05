/* 前端可调配置 */
window.APP_CONFIG = {
  /* DeepSeek 后端地址（server.js 默认 4190） */
  CHAT_ENDPOINT: "http://127.0.0.1:4190/api/chat",

  /* ---------- 地图 ---------- */
  /* 地图提供方：
     "amap-tiles" = 高德栅格瓦片 + MapLibre 渲染（默认，免 Key，开箱即用）
     "amap"       = 高德官方 JS API（需自行申请 Key）
     "tencent"    = 腾讯（WorkBuddy 预览环境自动走代理，零 Key） */
  MAP_PROVIDER: "amap-tiles",

  /* 高德开放平台 Key —— 占位符，请替换为你自己申请的 Key。
     申请入口：https://console.amap.com/dev/key/app
     步骤：注册/登录高德开放平台 → 应用管理 → 创建新应用 → 添加 Key →
           服务平台选「Web端(JS API)」→ 提交后得到 Key 与安全密钥(securityJsCode)。
     注意：JS API 2.0 必须同时配置安全密钥，否则会报 INVALID_USER_SCODE。 */
  AMAP_KEY: "请到高德开放平台自行申请key并替换此占位符",
  AMAP_SECURITY_CODE: "请到高德开放平台自行申请安全密钥并替换此占位符",

  /* 可选：腾讯位置服务 Key（MAP_PROVIDER 为 tencent，或非预览环境时的回退）。
     在 WorkBuddy 预览中会自动走代理，无需填写。 */
  TENCENT_MAP_KEY: ""
};
