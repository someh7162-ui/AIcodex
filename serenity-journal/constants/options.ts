// 心情选项配置
export interface MoodOption {
  id: string;
  name: string;
  emoji: string;
  color: string; // 用于热力图和统计
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'happy', name: '开心', emoji: '😊', color: '#FFD700' },
  { id: 'calm', name: '平静', emoji: '😌', color: '#87CEEB' },
  { id: 'grateful', name: '感恩', emoji: '🙏', color: '#90EE90' },
  { id: 'excited', name: '兴奋', emoji: '🤩', color: '#FF69B4' },
  { id: 'content', name: '满足', emoji: '☺️', color: '#98FB98' },
  { id: 'thoughtful', name: '沉思', emoji: '🤔', color: '#9370DB' },
  { id: 'tired', name: '疲惫', emoji: '😴', color: '#A9A9A9' },
  { id: 'anxious', name: '焦虑', emoji: '😰', color: '#FFA07A' },
  { id: 'sad', name: '难过', emoji: '😢', color: '#6495ED' },
  { id: 'angry', name: '生气', emoji: '😠', color: '#FF6347' },
  { id: 'inspired', name: '灵感', emoji: '💡', color: '#FFEB3B' },
  { id: 'love', name: '爱', emoji: '❤️', color: '#FF1493' },
];

// 天气选项配置
export interface WeatherOption {
  id: string;
  name: string;
  emoji: string;
}

export const WEATHER_OPTIONS: WeatherOption[] = [
  { id: 'sunny', name: '晴天', emoji: '☀️' },
  { id: 'cloudy', name: '多云', emoji: '☁️' },
  { id: 'partly_cloudy', name: '晴转多云', emoji: '⛅' },
  { id: 'rainy', name: '雨天', emoji: '🌧️' },
  { id: 'stormy', name: '暴风雨', emoji: '⛈️' },
  { id: 'snowy', name: '下雪', emoji: '❄️' },
  { id: 'windy', name: '微风', emoji: '🌬️' },
  { id: 'foggy', name: '雾天', emoji: '🌫️' },
  { id: 'hot', name: '炎热', emoji: '🥵' },
  { id: 'cold', name: '寒冷', emoji: '🥶' },
  { id: 'rainbow', name: '彩虹', emoji: '🌈' },
  { id: 'night', name: '夜晚', emoji: '🌙' },
];

// 默认标签
export const DEFAULT_TAGS = [
  '感恩',
  '灵感',
  '宁静',
  '成长',
  '日常',
  '工作',
  '家庭',
  '健康',
  '旅行',
  '美食',
  '学习',
  '运动',
];

// 获取心情颜色（用于热力图）
export const getMoodColor = (moodName: string): string => {
  const mood = MOOD_OPTIONS.find(m => m.name === moodName);
  return mood?.color || '#87CEEB';
};

// 获取心情 emoji
export const getMoodEmoji = (moodName: string): string => {
  const mood = MOOD_OPTIONS.find(m => m.name === moodName);
  return mood?.emoji || '😊';
};

// 获取天气 emoji
export const getWeatherEmoji = (weatherName: string): string => {
  const weather = WEATHER_OPTIONS.find(w => w.name === weatherName);
  return weather?.emoji || '☀️';
};

// 根据时间返回问候语
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早安';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
};
