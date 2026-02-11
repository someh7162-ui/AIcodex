import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // 若用 Vue2 则是 import vue from '@vitejs/plugin-vue2'

// https://vitejs.dev/config/
export default defineConfig({
  // 关键：部署到 520 端口根路径，publicPath 设为 '/'
  base: '/', // Vite 中用 base 对应 Vue CLI 的 publicPath，作用完全一致
  plugins: [vue()], // 必须配置 vue 插件（否则无法解析 Vue 文件）
  build: {
    outDir: 'dist', // 打包输出目录（默认就是 dist，可省略）
    assetsDir: 'static' // 静态资源目录（可选，优化文件结构）
  },
  server: {
    port: 3000, // 修改端口号，避开默认端口权限问题
    host: true,
    open: true // 本地开发时自动打开浏览器（可选）
  }
});