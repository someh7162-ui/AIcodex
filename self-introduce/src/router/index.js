import { createRouter, createWebHistory } from 'vue-router';
import PortfolioView from '../components/PortfolioView.vue';
import ContactForm from '../components/ContactForm.vue';

// Vue Router
const routes = [
  {
    path: '/', 
    name: 'Portfolio',
    component: PortfolioView,
    meta: { title: '个人作品集' } 
  },
  {
    path: '/contact',
    name: 'Contact',
    component: ContactForm,
    meta: { title: '联系我' }
  }
];


const router = createRouter({
  history: createWebHistory(),
  routes
});



router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Vue 应用';
  next();
});

export default router;