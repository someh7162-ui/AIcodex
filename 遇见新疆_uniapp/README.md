# 云起天山 uni-app 项目

这是从原始 React/Vite UI 迁移出来的 uni-app 安卓项目，可直接用 HBuilderX 打开。

## 在 HBuilderX 中打开

1. 打开 HBuilderX。
2. 选择 `文件 -> 打开目录`。
3. 选中 `F:\AI编程\遇见新疆_uniapp`。
4. 通过 `运行 -> 运行到手机或模拟器 -> 运行到 Android App 基座` 预览。

## 安卓发布前必做

1. 打开 `manifest.json`，将 `appid` 改成你自己的正式应用标识。
2. 在 HBuilderX 里补充应用图标、启动图、版本号、证书签名信息。
3. 将高德 Web 服务 Key 填到 `config/amap.js` 的 `AMAP_WEB_KEY`。
4. 图标素材建议放到 `static/icons/`，说明见 `static/icons/README.txt`。
5. 完成后使用 `发行 -> 原生App-云打包` 生成安卓安装包。

## 页面文件

- 首页：`pages/home/index.vue`
- 目的地：`pages/destinations/index.vue`
- 指南：`pages/guides/index.vue`
- 我的：`pages/account/index.vue`
