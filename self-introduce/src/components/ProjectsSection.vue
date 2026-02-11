<script setup>
// 使用 props 接收数据
defineProps({
    projects: Array
});

// 事件处理，点击跳转
const goToProject = (link) => {
    if (link) {
        window.open(link, '_blank');
    }
};
</script>

<template>
    <section class="bg-white p-6 md:p-10 rounded-xl shadow-xl">
        <h2 class="text-3xl font-bold text-gray-800 mb-8 border-b pb-3">项目经验</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- for 列表渲染 -->
            <div 
                v-for="project in projects" 
                :key="project.id" 
                class="bg-gray-50 rounded-xl overflow-hidden shadow-md border border-gray-100 flex flex-col transition duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                @click="goToProject(project.link)"
            >
                <img :src="project.image" :alt="project.title" class="w-full h-40 object-cover border-b">
                <div class="p-5 flex-grow">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ project.title }}</h3>
                    <p class="text-gray-600 mb-4 text-sm">{{ project.description }}</p>
                    
                    <!-- 标签 (Tags) -->
                    <div class="flex flex-wrap gap-2">
                        <!-- v-for 嵌套列表渲染 -->
                        <span v-for="tag in project.tags" :key="tag" class="text-xs font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                            {{ tag }}
                        </span>
                    </div>
                </div>
                <div class="p-5 pt-0">
                     <a  target="_blank" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        查看项目 →
                    </a>
                </div>
            </div>
        </div>
    </section>
</template>