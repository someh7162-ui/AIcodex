<script setup>
import { ref } from 'vue';

const form = ref({
    name: '',
    email: '',
    message: ''
});
const submitStatus = ref('');

const handleSubmit = () => {
    submitStatus.value = 'Transmitting...';
    setTimeout(() => {
        submitStatus.value = '✅ Signal Received. Stand by.';
        form.value = { name: '', email: '', message: '' };
    }, 1500);
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 p-8 md:p-12 relative overflow-hidden group">
            <!-- Decorative Glow -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-[#ccff00]/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div class="relative z-10">
                <h2 class="text-4xl md:text-5xl font-['Syne'] font-bold text-white mb-2">INITIATE UPLINK</h2>
                <p class="text-white/40 font-['Outfit'] mb-12">Send a transmission to the developer.</p>
                
                <form @submit.prevent="handleSubmit" class="space-y-8">
                    <div class="group/input">
                        <label for="name" class="block text-xs font-bold text-[#ccff00] uppercase tracking-widest mb-2">Identity</label>
                        <input 
                            type="text" 
                            id="name" 
                            v-model="form.name" 
                            required 
                            class="w-full bg-transparent border-b border-white/20 py-4 text-xl text-white focus:outline-none focus:border-[#ccff00] transition-colors placeholder-white/10"
                            placeholder="Enter Name"
                        />
                    </div>

                    <div class="group/input">
                        <label for="email" class="block text-xs font-bold text-[#ccff00] uppercase tracking-widest mb-2">Frequency</label>
                        <input 
                            type="email" 
                            id="email" 
                            v-model="form.email" 
                            required 
                            class="w-full bg-transparent border-b border-white/20 py-4 text-xl text-white focus:outline-none focus:border-[#ccff00] transition-colors placeholder-white/10"
                            placeholder="Enter Email"
                        />
                    </div>

                    <div class="group/input">
                        <label for="message" class="block text-xs font-bold text-[#ccff00] uppercase tracking-widest mb-2">Payload</label>
                        <textarea 
                            id="message" 
                            v-model="form.message" 
                            rows="4" 
                            required 
                            class="w-full bg-transparent border-b border-white/20 py-4 text-xl text-white focus:outline-none focus:border-[#ccff00] transition-colors placeholder-white/10 resize-none"
                            placeholder="Enter Message"
                        ></textarea>
                    </div>

                    <button 
                        type="submit" 
                        class="w-full py-6 bg-white text-black font-['Syne'] font-bold text-xl uppercase tracking-wider hover:bg-[#ccff00] transition-colors duration-300"
                    >
                        Transmit
                    </button>
                </form>

                <p v-if="submitStatus" class="mt-8 text-center font-mono text-[#ccff00]">
                    {{ submitStatus }}
                </p>
                
                <div class="mt-12 text-center">
                    <router-link to="/" class="text-white/40 hover:text-white text-sm uppercase tracking-widest transition-colors">
                        ← Abort / Return to Base
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>
