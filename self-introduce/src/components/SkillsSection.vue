<script setup>
import { computed } from 'vue';

// 使用 props 接收数据
const props = defineProps({
    skills: {
        type: Array,
        default: () => []
    }
});

const processedSkills = computed(() => {
    if (!props.skills) return [];
    // map遍历数组，处理每一项
    return props.skills.map(skill => {
        let colorClass = '';
        const level = skill.level;

        // 根据分数区间判断颜色
        if (level >= 80) {
            colorClass = 'bg-green-500'; 
        } else if (level >= 60) {
            colorClass = 'bg-indigo-500'; 
        } else if (level >= 40) {
            colorClass = 'bg-yellow-400'; 
        } else {
            colorClass = 'bg-red-500';   
        }

        return {
            ...skill, //原有的属性
            colorClass // 新增的颜色类名
        };
    });
});
</script>

<template>
    <section class="bg-white p-6 md:p-10 rounded-xl shadow-xl">
        <h2 class="text-3xl font-bold text-gray-800 mb-8 border-b pb-3">专业技能</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="skill in processedSkills" :key="skill.name" class="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ skill.name }}</h3>
                <div class="text-sm text-gray-500 mb-1">熟练度: {{ skill.level }}%</div>
                <!-- 进度条 -->
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        class="h-2.5 rounded-full transition-all duration-700 ease-out" 
                        :class="skill.colorClass" 
                        :style="{ width: skill.level + '%' }"
                    ></div> 
                </div>
            </div>
        </div>
        <!-- 样式白名单 -->
        <div class="hidden bg-green-500 bg-indigo-500 bg-yellow-400 bg-red-500"></div>
    </section>
</template>