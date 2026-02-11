<script setup>
import { inject, computed } from 'vue';
// 导入路由相关功能
import { useRoute } from 'vue-router'; 

// --- Inject (注入) ---
const profileData = inject('profileKey');

// --- 获取当前路由信息 ---
const route = useRoute();

// 计算属性：判断当前激活的路由
const isCurrentRoute = (routeName) => {
    // 使用计算属性判断当前路由名称是否匹配
    return route.name === routeName ? 'text-indigo-600 border-indigo-600' : 'text-gray-600 border-transparent hover:text-indigo-600 hover:border-indigo-300';
};
</script>

<template>
    <header class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
            <!-- 网站标题/名称 -->
            <h1 class="text-2xl font-bold text-gray-800">
                {{ profileData.name }}
            </h1>
            
            <!-- 导航栏 -->
            <nav class="flex space-x-4">
            <!-- 使用 <router-link> 代替 <a> 标签 -->                
                <!-- 导航项 1: 作品集 (Portfolio) -->
                <router-link   
                    to="/" 
                    class="py-2 px-3 border-b-2 font-medium transition duration-150 ease-in-out"
                    :class="isCurrentRoute('Portfolio')"
                >
                    作品集
                </router-link>
                
                <!-- 导航项 2: 联系我 (Contact) -->
                <router-link 
                    to="/contact" 
                    class="py-2 px-3 border-b-2 font-medium transition duration-150 ease-in-out"
                    :class="isCurrentRoute('Contact')"
                >
                    联系我
                </router-link>

                <!-- 演示外部链接 -->
                <a href="https://www.douyin.com/user/MS4wLjABAAAAH8UWXLFyjYIwU_KKNY4AO4TM_NlXTgn2epQSSGO4Qw8?from_tab_name=main" target="_blank" class="py-2 px-3 text-gray-600 hover:text-gray-800 transition duration-150 ease-in-out">
                    Douyin
                </a>
            </nav>
        </div>
    </header>
</template>