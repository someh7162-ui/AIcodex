import { DiaryEntry } from '../types';

const STORAGE_KEY = 'serenity_journal_entries';
const SETTINGS_KEY = 'serenity_journal_settings';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  userName: string;
  defaultTags: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  userName: '朋友',
  defaultTags: ['感恩', '灵感', '宁静', '成长', '日常', '工作', '家庭', '健康'],
};

// 日期格式化工具
export const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

export const formatFullDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseFullDate = (fullDate: string): Date => {
  return new Date(fullDate);
};

// 生成唯一 ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============ 日记 CRUD 操作 ============

// 获取所有日记
export const getAllEntries = (): DiaryEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const entries: DiaryEntry[] = JSON.parse(data);
    // 按日期排序，最新的在前面
    return entries.sort((a, b) => {
      const dateA = a.fullDate ? new Date(a.fullDate).getTime() : 0;
      const dateB = b.fullDate ? new Date(b.fullDate).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Failed to load entries:', error);
    return [];
  }
};

// 根据 ID 获取单个日记
export const getEntryById = (id: string): DiaryEntry | null => {
  const entries = getAllEntries();
  return entries.find(entry => entry.id === id) || null;
};

// 根据日期获取日记
export const getEntriesByDate = (fullDate: string): DiaryEntry[] => {
  const entries = getAllEntries();
  return entries.filter(entry => entry.fullDate === fullDate);
};

// 创建新日记
export const createEntry = (entry: Omit<DiaryEntry, 'id'>): DiaryEntry => {
  const newEntry: DiaryEntry = {
    ...entry,
    id: generateId(),
  };
  const entries = getAllEntries();
  entries.unshift(newEntry);
  saveAllEntries(entries);
  return newEntry;
};

// 更新日记
export const updateEntry = (id: string, updates: Partial<DiaryEntry>): DiaryEntry | null => {
  const entries = getAllEntries();
  const index = entries.findIndex(entry => entry.id === id);
  if (index === -1) return null;
  
  entries[index] = { ...entries[index], ...updates };
  saveAllEntries(entries);
  return entries[index];
};

// 删除日记
export const deleteEntry = (id: string): boolean => {
  const entries = getAllEntries();
  const filtered = entries.filter(entry => entry.id !== id);
  if (filtered.length === entries.length) return false;
  
  saveAllEntries(filtered);
  return true;
};

// 保存所有日记
const saveAllEntries = (entries: DiaryEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save entries:', error);
  }
};

// ============ 搜索功能 ============

export const searchEntries = (query: string): DiaryEntry[] => {
  if (!query.trim()) return getAllEntries();
  
  const lowerQuery = query.toLowerCase();
  const entries = getAllEntries();
  
  return entries.filter(entry => {
    const titleMatch = entry.title?.toLowerCase().includes(lowerQuery);
    const contentMatch = entry.content.toLowerCase().includes(lowerQuery);
    const tagMatch = entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    const moodMatch = entry.mood.toLowerCase().includes(lowerQuery);
    const weatherMatch = entry.weather.toLowerCase().includes(lowerQuery);
    const dateMatch = entry.date.includes(query);
    
    return titleMatch || contentMatch || tagMatch || moodMatch || weatherMatch || dateMatch;
  });
};

// ============ 设置管理 ============

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Partial<AppSettings>): AppSettings => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
  return updated;
};

// ============ 统计功能 ============

export interface DiaryStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  moodDistribution: Record<string, number>;
  tagDistribution: Record<string, number>;
  entriesByMonth: Record<string, number>;
  averageLength: number;
  mostActiveHour?: number;
}

export const getStats = (): DiaryStats => {
  const entries = getAllEntries();
  
  const stats: DiaryStats = {
    totalEntries: entries.length,
    currentStreak: 0,
    longestStreak: 0,
    moodDistribution: {},
    tagDistribution: {},
    entriesByMonth: {},
    averageLength: 0,
  };
  
  if (entries.length === 0) return stats;
  
  // 计算心情分布
  entries.forEach(entry => {
    stats.moodDistribution[entry.mood] = (stats.moodDistribution[entry.mood] || 0) + 1;
  });
  
  // 计算标签分布
  entries.forEach(entry => {
    entry.tags?.forEach(tag => {
      stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
    });
  });
  
  // 计算每月日记数量
  entries.forEach(entry => {
    if (entry.fullDate) {
      const month = entry.fullDate.substring(0, 7); // "2024-10"
      stats.entriesByMonth[month] = (stats.entriesByMonth[month] || 0) + 1;
    }
  });
  
  // 计算平均字数
  const totalLength = entries.reduce((sum, entry) => sum + entry.content.length, 0);
  stats.averageLength = Math.round(totalLength / entries.length);
  
  // 计算连续写作天数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dates = entries
    .filter(e => e.fullDate)
    .map(e => e.fullDate!)
    .filter((v, i, a) => a.indexOf(v) === i) // 去重
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // 降序
  
  if (dates.length > 0) {
    let streak = 0;
    let currentDate = today;
    
    for (const dateStr of dates) {
      const entryDate = new Date(dateStr);
      entryDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    stats.currentStreak = streak;
    
    // 计算最长连续天数
    let longest = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    stats.longestStreak = longest;
  }
  
  return stats;
};

// ============ 导出/导入功能 ============

export const exportData = (): string => {
  const data = {
    entries: getAllEntries(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.entries && Array.isArray(data.entries)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
    }
    if (data.settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
};
