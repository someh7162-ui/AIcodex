将安卓发布所需图标放在此目录。

建议至少准备：
- app-icon.png          应用主图标，1024x1024
- splash.png            启动页图片，1242x2688 或相近竖屏比例
- adaptive-foreground.png  Android 前景图层
- adaptive-background.png  Android 背景图层

在 HBuilderX 中配置位置：
- manifest.json -> App图标配置
- manifest.json -> 启动界面配置
- 发行 -> 原生App-云打包 -> Android签名

说明：
- 当前项目已补齐代码层配置，但正式打包前仍需要你在 HBuilderX 中选择这些图片文件。
