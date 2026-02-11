import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js'; 
import 'tailwindcss/tailwind.css'; 

// 1. 创建 Vue 应用实例
const app = createApp(App);
app.use(router);
app.mount('#app');