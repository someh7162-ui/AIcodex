<script setup>
// 使用 props 接收数据
defineProps({
    profile: Object 
});
</script>

<template>
    <section class="relative overflow-hidden bg-white rounded-3xl shadow-2xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] group border border-gray-100">
        <!-- 背景装饰 -->
        <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div class="absolute top-4 right-4 text-white/20 text-9xl font-black select-none pointer-events-none transform rotate-12 group-hover:rotate-6 transition-transform duration-500">
            DEV
        </div>

        <div class="relative px-8 pt-16 pb-8 md:px-12 md:pb-12 flex flex-col md:flex-row items-start md:items-end gap-6">
            <!-- 头像部分 -->
            <div class="relative flex-shrink-0">
                <div class="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-300 ease-out">
                    <img :src="profile.avatar" :alt="profile.name" class="w-full h-full object-cover">
                </div>
                <!-- 在线状态点 -->
                <span class="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></span>
            </div>

            <!-- 文本内容 -->
            <div class="flex-grow pt-2 md:pt-0">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 class="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-1">
                            {{ profile.name }}
                        </h1>
                        <p class="text-lg md:text-xl font-medium text-indigo-600 mb-4 flex items-center gap-2">
                            <span class="inline-block w-8 h-[2px] bg-indigo-600"></span>
                            {{ profile.title }}
                        </p>
                        <p class="text-gray-600 leading-relaxed max-w-2xl text-base md:text-lg">
                            {{ profile.bio }}
                        </p>
                    </div>

                    <!-- 社交链接/Github跳转 -->
                    <div class="flex-shrink-0 mt-4 md:mt-0">
                        <a 
                            href="https://github.com/someh7162-ui?tab=repositories" 
                            target="_blank" 
                            class="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-gray-900/30"
                        >
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                            </svg>
                            访问 GitHub 仓库
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
