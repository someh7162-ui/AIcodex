import localAvatar from './assets/rose.jpg'
import iconProject1 from './assets/物理实验数据分析系统.png';
import iconProject2 from './assets/Rose.png';
import iconProject3 from './assets/记录当下.png';
import iconProject4 from './assets/套娃.png';

// 个人信息数据
export const profileData = {
    name: '魏韬',
    title: '学生',
    bio: '喜欢唱、跳、Rap、篮球。专注于前端技术应用，具备基础的 Python 和 Web 开发能力。', 
    avatar: localAvatar 
};

// 技能数据 
export const skillsData = [
    { name: 'HTML5', level: 70 },
    { name: 'Python ', level: 50 },
    { name: 'CSS 3', level: 80 },
    { name: 'Tomcat', level: 22 },
];

// 荣誉数据
export const honorsData = [
    {
        id: 1,
        title: '校级优秀学生干部',
        date: '2023.06',
        description: '在校期间表现优异，组织多次校园活动，被评为校级优秀学生干部。'
    },
    {
        id: 2,
        title: '计算机设计大赛二等奖',
        date: '2024.05',
        description: '负责团队项目的前端开发工作，项目获得省级二等奖。'
    }
];

// 项目数据
export const projectsData = [
    { 
        id: 1, 
        title: '物理实验数据分析系统', 
        description: '基于 HTML 和 Python 的实验数据分析系统。主要实现数据的录入、处理和可视化展示。', 
        image: iconProject1, 
        link: 'http://1.95.165.41/',
        tags: ['Python', 'HTML', '数据处理']
    },
    { 
        id: 2, 
        title: 'Rose (静态展示网页)', 
        description: '一个基于 HTML 的静态展示网页，用于展示个人喜好和主题内容。', 
        image: iconProject2, 
        link: 'http://47.96.76.28:60808/',
        tags: ['HTML', '静态页面', 'CSS']
    },
    { 
        id: 3, 
        title: '当下记录 (API集成)', 
        description: '记录心情与日常的网页应用，使用了外部 API 接口进行数据的获取和展示。', 
        image: iconProject3, 
        link: 'http://47.96.76.28/',
        tags: ['HTML', 'API集成', '交互']
    },
    { 
        id: 4, 
        title: '个人介绍网页 (Vue3)', 
        description: '基于 Vue 3 开发的个人介绍页面，使用了组件化和响应式设计，体现了现代前端工程化能力。', 
        image: iconProject4, 
        link: 'http://47.96.76.28:520/',
        tags: ['Vue3', '组件化', '响应式']
    }
];