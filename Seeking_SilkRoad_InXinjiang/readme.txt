项目名称：丝路疆寻 uni-app
一、使用 HBuilderX 启动前端
1. 打开 HBuilderX。
2. 选择“文件 -> 打开目录”。
3. 选择项目目录：F:\AI编程\遇见新疆_uniapp
4. 等待 HBuilderX 识别为 uni-app 项目。
5. 运行方式任选其一：
   - 运行 -> 运行到内置浏览器
   - 运行 -> 运行到 Chrome
   - 运行 -> 运行到 Android App 基座
二、首次依赖安装
由于 node_modules 已移出，如需运行服务端或重新安装依赖，请在项目根目录执行：
npm install
三、启动后端（如需联调）
项目根目录执行：
npm run api
默认会启动：
- Node/Express 后端
- 入口文件：server/index.js
四、项目主要源码目录
- pages/            页面源码
- components/       公共组件
- stores/           Pinia 状态管理
- services/         前后端请求封装
- common/           通用工具
- config/           配置文件
- static/           项目静态资源
- server/           Node 后端源码
五、补充说明
1. 如果 HBuilderX 提示缺少依赖，先执行 npm install 再运行。
2. 如果只看前端页面，可直接在 HBuilderX 中运行到浏览器或基座。
3. 如果要做 App 云打包/原生打包，manifest.json 中原来的部分打包产物路径已被清理；如需正式打包，请在 HBuilderX 的 manifest 可视化界面重新配置启动图标与应用图标。
