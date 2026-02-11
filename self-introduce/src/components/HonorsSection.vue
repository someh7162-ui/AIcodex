<script setup>
defineProps({
    honors: Array
});
</script>

<template>
    <section class="bg-white p-6 md:p-10 rounded-xl shadow-xl hover:shadow-2xl transition duration-300">
        <h2 class="text-3xl font-bold text-gray-800 mb-8 border-b pb-3 flex items-center">
            <span class="mr-3">🏆</span> 荣誉奖项
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
                v-for="honor in honors" 
                :key="honor.id" 
                class="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-l-4 border-yellow-400 hover:scale-[1.02] transition-transform duration-200"
            >
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-800">{{ honor.title }}</h3>
                    <span class="text-sm font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">{{ honor.date }}</span>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">{{ honor.description }}</p>
            </div>
        </div>
    </section>
</template>
