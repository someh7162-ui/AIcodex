<script setup>
import { inject } from 'vue';
import ProfileCard from './ProfileCard.vue';
import SkillsSection from './SkillsSection.vue';
import ProjectsSection from './ProjectsSection.vue';
import HonorsSection from './HonorsSection.vue';

const profileData = inject('profileKey');
const skillsData = inject('skillsKey');
const projectsData = inject('projectsKey');
const honorsData = inject('honorsKey');
</script>

<template>
    <div class="relative w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-12 md:py-24 space-y-32">
        <!-- Vertical Line Decoration -->
        <div class="fixed left-4 md:left-12 top-0 w-[1px] h-full bg-white/5 z-0 pointer-events-none hidden md:block"></div>
        <div class="fixed right-4 md:right-12 top-0 w-[1px] h-full bg-white/5 z-0 pointer-events-none hidden md:block"></div>

        <!-- 1. Hero / Profile -->
        <section class="relative z-10">
            <ProfileCard :profile="profileData" />
        </section>

        <!-- 2. Skills -->
        <section class="relative z-10 pl-0 md:pl-8">
            <SkillsSection :skills="skillsData" />
        </section>

        <!-- 3. Projects -->
        <section class="relative z-10 pl-0 md:pl-8">
            <ProjectsSection :projects="projectsData" />
        </section>

        <!-- 4. Honors -->
        <section class="relative z-10 pl-0 md:pl-8">
            <HonorsSection :honors="honorsData" />
        </section>
        
        <!-- Minimal Footer -->
        <footer class="relative z-10 border-t border-white/10 pt-12 pb-6 text-center md:text-left md:pl-8">
            <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 class="font-['Syne'] font-bold text-2xl text-white">WEI TAO</h2>
                    <p class="text-white/40 text-sm mt-1">© 2025 Digital Craftsman. All rights reserved.</p>
                </div>
                <div class="flex gap-6 text-sm font-['Outfit'] text-white/60">
                    <router-link to="/contact" class="hover:text-[#ccff00] transition-colors">Contact</router-link>
                    <a href="https://github.com" target="_blank" class="hover:text-[#ccff00] transition-colors">GitHub</a>
                    <a href="https://douyin.com" target="_blank" class="hover:text-[#ccff00] transition-colors">Douyin</a>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
/* Smooth scrolling for the whole page */
:global(html) {
    scroll-behavior: smooth;
}
</style>
