<script setup>
import { provide } from 'vue';
import { profileData, skillsData, projectsData, honorsData } from './data.js';

// Inject global data
provide('profileKey', profileData);
provide('skillsKey', skillsData);
provide('projectsKey', projectsData);
provide('honorsKey', honorsData);
</script>

<template>
  <div class="bg-black text-white min-h-screen selection:bg-purple-500 selection:text-white">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
