import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Share, ChevronLeft, ChevronRight, 
  Edit3, BookOpen, Calendar, Target, Award, Sparkles, Loader2, Clock,
  FileText, Flame
} from 'lucide-react';
import { MoodStat, DiaryEntry } from '../types';
import { getAllEntries, getStats } from '../services/storage';
import { getMoodColor, MOOD_OPTIONS } from '../constants/options';
import { isAIAvailable, analyzeEmotionTrend } from '../services/ai';

interface InsightsProps {
  onBack: () => void;
  onEntryClick?: (entry: DiaryEntry) => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

// 工具函数放在组件外部
const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode; fallback?: React.ReactNode}> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Insights Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-red-500">
          <p>页面出错了</p>
          <p className="text-sm opacity-70">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Insights: React.FC<InsightsProps> = ({ onBack, onEntryClick }) => {
  const entries = getAllEntries();
  const stats = useMemo(() => getStats(), [entries.length]);
  
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'month' | 'year'>('month');
  const [aiTrendAnalysis, setAiTrendAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const shareRef = useRef<HTMLDivElement>(null);

  // 写作习惯分析
  const writingHabits = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

    entries.forEach(e => {
      if (e && e.fullDate) {
        const date = new Date(e.fullDate);
        if (!isNaN(date.getTime())) {
          dayOfWeekCounts[date.getDay()]++;
        }
      }
    });

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const maxCount = Math.max(...dayOfWeekCounts);
    const maxIndex = maxCount > 0 ? dayOfWeekCounts.indexOf(maxCount) : 0;
    const mostActiveDay = dayNames[maxIndex];

    const totalWords = entries.reduce((sum, e) => sum + (e?.content?.length || 0), 0);
    const avgWords = Math.round(totalWords / entries.length);

    let weeklyAvg = 0;
    if (entries.length > 1) {
      const sortedEntries = [...entries].sort((a, b) => {
        const dateA = a?.fullDate ? new Date(a.fullDate).getTime() : 0;
        const dateB = b?.fullDate ? new Date(b.fullDate).getTime() : 0;
        return dateB - dateA;
      });
      
      const firstEntry = sortedEntries[sortedEntries.length - 1];
      const lastEntry = sortedEntries[0];
      
      if (firstEntry?.fullDate && lastEntry?.fullDate) {
        const startDate = new Date(firstEntry.fullDate);
        const endDate = new Date(lastEntry.fullDate);
        const weeks = Math.max(1, (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        weeklyAvg = Math.round((entries.length / weeks) * 10) / 10;
      }
    }

    let longestEntry: DiaryEntry | null = null;
    if (entries.length > 0) {
      longestEntry = entries.reduce((max, e) => {
        const maxLen = max?.content?.length || 0;
        const currLen = e?.content?.length || 0;
        return currLen > maxLen ? e : max;
      }, entries[0]);
    }

    return {
      mostActiveDay,
      avgWords,
      weeklyAvg,
      longestEntry,
      dayOfWeekCounts,
      totalWords,
    };
  }, [entries]);

  // 成就系统
  const achievements = useMemo((): Achievement[] => {
    const totalEntries = stats.totalEntries || 0;
    const currentStreak = stats.currentStreak || 0;
    const longestStreak = stats.longestStreak || 0;
    const totalWords = writingHabits?.totalWords || 0;

    return [
      { id: 'first_entry', name: '初心', description: '写下第一篇日记', icon: '✨', unlocked: totalEntries >= 1 },
      { id: 'week_streak', name: '七日坚持', description: '连续7天写日记', icon: '🔥', unlocked: longestStreak >= 7, progress: Math.min(currentStreak, 7), total: 7 },
      { id: 'month_streak', name: '月度坚持', description: '连续30天写日记', icon: '🏆', unlocked: longestStreak >= 30, progress: Math.min(currentStreak, 30), total: 30 },
      { id: 'entries_10', name: '初级作者', description: '累计写满10篇日记', icon: '📝', unlocked: totalEntries >= 10, progress: Math.min(totalEntries, 10), total: 10 },
      { id: 'entries_50', name: '勤奋作者', description: '累计写满50篇日记', icon: '📚', unlocked: totalEntries >= 50, progress: Math.min(totalEntries, 50), total: 50 },
      { id: 'entries_100', name: '资深作者', description: '累计写满100篇日记', icon: '🎖️', unlocked: totalEntries >= 100, progress: Math.min(totalEntries, 100), total: 100 },
      { id: 'words_10k', name: '万字里程碑', description: '累计写满1万字', icon: '💎', unlocked: totalWords >= 10000, progress: Math.min(totalWords, 10000), total: 10000 },
      { id: 'words_50k', name: '五万字大关', description: '累计写满5万字', icon: '👑', unlocked: totalWords >= 50000, progress: Math.min(totalWords, 50000), total: 50000 },
    ];
  }, [stats, writingHabits]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // 词云数据
  const wordCloudData = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const wordCounts: Record<string, number> = {};
    
    entries.forEach(e => {
      if (e?.mood) {
        wordCounts[e.mood] = (wordCounts[e.mood] || 0) + 1;
      }
      e?.tags?.forEach(tag => {
        wordCounts[tag] = (wordCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count], index) => ({
        word,
        count,
        size: Math.min(32, 12 + count * 2),
      }));
  }, [entries]);

  // 热力图数据
  const heatmapData = useMemo((): MoodStat[] => {
    const data: MoodStat[] = [];
    const today = new Date();
    
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateStr(date);
      
      const dayEntries = entries.filter(e => e?.fullDate === dateStr);
      
      if (dayEntries.length === 0) {
        data.push({ color: 'transparent', opacity: 0 });
      } else {
        const mood = dayEntries[0]?.mood || '平静';
        const color = getMoodColor(mood);
        data.push({ color, opacity: 0.4 + Math.min(dayEntries.length * 0.2, 0.6) });
      }
    }
    
    return data;
  }, [entries]);

  const topTags = useMemo(() => {
    const tagCounts = stats.tagDistribution || {};
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count], index) => ({
        text: tag,
        count,
        size: index < 2 ? 'large' : index < 5 ? 'medium' : 'small',
      }));
  }, [stats]);

  const moodStats = useMemo(() => {
    const moodDist = stats.moodDistribution || {};
    return Object.entries(moodDist).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stats]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekDay = firstDay.getDay();
    
    const days: { day: number; isCurrentMonth: boolean; entries: DiaryEntry[] }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, entries: [] });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEntries = entries.filter(e => e?.fullDate === dateStr);
      days.push({ day: i, isCurrentMonth: true, entries: dayEntries });
    }
    
    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, entries: [] });
    }
    
    return days;
  }, [currentMonth, entries]);

  const selectedEntry = useMemo(() => {
    if (!selectedDate) return null;
    return entries.find(e => e?.fullDate === selectedDate);
  }, [selectedDate, entries]);

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: typeof calendarData[0]) => {
    if (!day.isCurrentMonth) return;
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleAIAnalysis = async () => {
    if (!isAIAvailable() || !entries || entries.length < 3) return;
    
    setAiLoading(true);
    try {
      const analysis = await analyzeEmotionTrend(entries);
      setAiTrendAnalysis(analysis);
    } catch {
      setAiTrendAnalysis('AI 分析暂时不可用，请稍后再试。');
    }
    setAiLoading(false);
  };

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodName: string;

    if (reportType === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodName = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      periodName = `${now.getFullYear()}年`;
    }

    const periodEntries = entries.filter(e => {
      if (!e?.fullDate) return false;
      const date = new Date(e.fullDate);
      return date >= startDate && date <= endDate;
    });

    const totalEntries = periodEntries.length;
    const totalWords = periodEntries.reduce((sum, e) => sum + (e?.content?.length || 0), 0);
    
    const moodCounts: Record<string, number> = {};
    periodEntries.forEach(e => {
      if (e?.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });
    const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const activeDays = new Set(periodEntries.map(e => e?.fullDate).filter(Boolean)).size;

    return { periodName, totalEntries, totalWords, topMoods, activeDays };
  }, [entries, reportType]);

  const handleShare = async () => {
    const shareText = `📔 我的宁静日记统计
📝 总日记：${stats.totalEntries} 篇
🔥 连续写作：${stats.currentStreak} 天
📊 平均字数：${stats.averageLength} 字
🏆 已解锁成就：${unlockedCount}/${achievements.length}

#宁静日记 #SerenityJournal`;

    try {
      await navigator.clipboard.writeText(shareText);
      alert('统计信息已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const getTagStyle = (size: string, index: number): string => {
    const colors = [
      'bg-primary/10 text-primary border-primary/20',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-purple-100 text-purple-700 border-purple-200',
    ];
    const colorStyle = colors[index % colors.length];
    
    switch (size) {
      case 'large': return `${colorStyle} h-12 px-8 text-base font-bold`;
      case 'medium': return `${colorStyle} h-10 px-6 text-sm font-bold`;
      default: return 'bg-gray-100 dark:bg-gray-800 text-[#111318] dark:text-gray-100 h-8 px-4 text-sm font-medium';
    }
  };

  // 空状态
  if (!entries || entries.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 font-sans">
        <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
          <button onClick={onBack} className="text-[#111318] dark:text-gray-100 flex size-12 shrink-0 items-center justify-center -ml-2 hover:bg-black/5 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-[#111318] dark:text-gray-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">情感洞察</h2>
          <div className="flex w-12 items-center justify-end">
            <button onClick={handleShare} className="flex items-center justify-center rounded-lg h-12 text-[#111318] dark:text-gray-100"><Share size={24} /></button>
          </div>
        </div>
        <main className="max-w-md mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">还没有日记数据</h3>
            <p className="text-gray-500 dark:text-gray-500 text-sm">开始写日记后，这里将展示你的情感分析</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 font-sans">
      <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="text-[#111318] dark:text-gray-100 flex size-12 shrink-0 items-center justify-center -ml-2 hover:bg-black/5 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[#111318] dark:text-gray-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">情感洞察</h2>
        <div className="flex w-12 items-center justify-end">
          <button onClick={handleShare} className="flex items-center justify-center rounded-lg h-12 text-[#111318] dark:text-gray-100"><Share size={24} /></button>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 py-6" ref={shareRef}>
        {/* 快速统计 */}
        <section className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalEntries}</p>
            <p className="text-[10px] text-gray-500">总日记</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
            <p className="text-[10px] text-gray-500">连续天</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.averageLength}</p>
            <p className="text-[10px] text-gray-500">平均字数</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-2xl font-bold text-purple-500">{unlockedCount}</p>
            <p className="text-[10px] text-gray-500">成就</p>
          </div>
        </section>

        {/* 写作习惯 */}
        {writingHabits && (
          <section className="mb-6">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3 flex items-center gap-2">
              <Clock size={20} /> 写作习惯
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">最活跃日</p><p className="text-lg font-bold text-primary">{writingHabits.mostActiveDay}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">周均频率</p><p className="text-lg font-bold text-green-500">{writingHabits.weeklyAvg} 篇/周</p></div>
                <div><p className="text-xs text-gray-500 mb-1">平均字数</p><p className="text-lg font-bold text-orange-500">{writingHabits.avgWords} 字</p></div>
                <div><p className="text-xs text-gray-500 mb-1">累计字数</p><p className="text-lg font-bold text-purple-500">{writingHabits.totalWords.toLocaleString()} 字</p></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-2">一周写作分布</p>
                <div className="flex justify-between items-end h-16">
                  {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => {
                    const count = writingHabits.dayOfWeekCounts[i];
                    const max = Math.max(...writingHabits.dayOfWeekCounts, 1);
                    const height = (count / max) * 100;
                    return (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <div className="w-6 bg-primary/20 rounded-t relative" style={{ height: '40px' }}>
                          <div className="absolute bottom-0 w-full bg-primary rounded-t transition-all" style={{ height: `${Math.max(height, 5)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* AI 分析 */}
        <section className="mb-6">
          <div className="flex justify-between items-center pb-3">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight flex items-center gap-2">
              <Sparkles size={20} /> AI 情感分析
            </h2>
            <button onClick={handleAIAnalysis} disabled={aiLoading || !isAIAvailable() || entries.length < 3} className="text-xs text-primary flex items-center gap-1 disabled:opacity-50">
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}分析
            </button>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
            {!isAIAvailable() && <p className="text-sm text-gray-500">请配置 Gemini API Key 以启用 AI 分析功能</p>}
            {isAIAvailable() && entries.length < 3 && <p className="text-sm text-gray-500">需要至少3篇日记才能进行情感分析</p>}
            {isAIAvailable() && entries.length >= 3 && !aiTrendAnalysis && !aiLoading && <p className="text-sm text-gray-500">点击"分析"按钮，AI 将分析你近期的情感变化趋势</p>}
            {aiLoading && <div className="flex items-center gap-2 text-primary"><Loader2 size={16} className="animate-spin" /><span className="text-sm">AI 正在分析...</span></div>}
            {aiTrendAnalysis && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiTrendAnalysis}</p>}
          </div>
        </section>

        {/* 热力图 */}
        <section className="mb-6">
          <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-2">心情热力图</h2>
          <p className="text-[#616f89] dark:text-gray-400 text-sm mb-4">过去12周的情感波动趋势</p>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2 hide-scrollbar">
              {heatmapData.map((stat, idx) => (
                <div key={idx} className={`aspect-square w-4 rounded-sm ${stat.color === 'transparent' ? 'bg-gray-100 dark:bg-gray-800' : ''}`} style={{ backgroundColor: stat.color !== 'transparent' ? stat.color : undefined, opacity: stat.opacity || 1 }} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] tracking-wider text-[#616f89] font-medium">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm"></div><span>无</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FFD700] rounded-sm"></div><span>开心</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#87CEEB] rounded-sm"></div><span>平静</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#9370DB] rounded-sm"></div><span>沉思</span></div>
            </div>
          </div>
        </section>

        {/* 成就 */}
        <section className="mb-6">
          <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3 flex items-center gap-2">
            <Award size={20} /> 成就徽章 <span className="text-sm font-normal text-gray-500">({unlockedCount}/{achievements.length})</span>
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {achievements.map(achievement => (
              <div key={achievement.id} className={`relative p-3 rounded-xl text-center transition-all ${achievement.unlocked ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-900 opacity-50'}`}>
                <span className={`text-2xl ${achievement.unlocked ? '' : 'grayscale'}`}>{achievement.icon}</span>
                <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 mt-1 line-clamp-1">{achievement.name}</p>
                {achievement.progress !== undefined && !achievement.unlocked && (
                  <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 词云 */}
        {wordCloudData.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3 flex items-center gap-2">
              <FileText size={20} /> 词云
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap justify-center gap-2 items-center min-h-[100px]">
                {wordCloudData.map((item, index) => (
                  <span key={item.word} className="transition-transform hover:scale-110" style={{ fontSize: `${item.size}px`, color: getMoodColor(item.word) || ['#135bec', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index % 5], fontWeight: item.size > 20 ? 'bold' : 'normal' }}>
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 心情分布 */}
        {moodStats.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3">心情分布</h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
              {moodStats.map(([mood, count]) => {
                const percentage = Math.round((count / entries.length) * 100);
                const color = getMoodColor(mood);
                const emoji = MOOD_OPTIONS.find(m => m.name === mood)?.emoji || '😊';
                return (
                  <div key={mood} className="flex items-center gap-3 py-2">
                    <span className="text-xl">{emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{mood}</span>
                        <span className="text-gray-500">{count} 篇 ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 报告 */}
        <section className="mb-6">
          <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3 flex items-center gap-2">
            <Target size={20} /> 定期报告
          </h2>
          <div className="flex gap-3">
            <button onClick={() => { setReportType('month'); setShowReportModal(true); }} className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-center hover:border-primary transition-colors">
              <Calendar size={24} className="mx-auto text-primary mb-2" />
              <p className="font-medium text-gray-800 dark:text-gray-200">月度报告</p>
            </button>
            <button onClick={() => { setReportType('year'); setShowReportModal(true); }} className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-center hover:border-primary transition-colors">
              <Flame size={24} className="mx-auto text-orange-500 mb-2" />
              <p className="font-medium text-gray-800 dark:text-gray-200">年度报告</p>
            </button>
          </div>
        </section>

        {/* 热门标签 */}
        {topTags.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight pb-3">热门标签</h2>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag, i) => (
                <div key={tag.text} className={`flex items-center justify-center rounded-xl border border-transparent ${getTagStyle(tag.size, i)}`}>
                  #{tag.text}<span className="ml-1 text-xs opacity-60">({tag.count})</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 日历 */}
        <section className="mb-6">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-[#111318] dark:text-gray-100 text-[20px] font-bold leading-tight tracking-tight">日历回顾</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#111318] dark:text-gray-100">{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月</span>
              <div className="flex gap-2">
                <button onClick={goToPrevMonth} className="p-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500"><ChevronLeft size={16} /></button>
                <button onClick={goToNextMonth} className="p-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#616f89] mb-4">
              {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
              {calendarData.map((day, index) => {
                const dateStr = day.isCurrentMonth ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}` : null;
                const isSelected = dateStr === selectedDate;
                const hasEntries = day.entries.length > 0;
                const moodColor = hasEntries && day.entries[0]?.mood ? getMoodColor(day.entries[0].mood) : null;
                return (
                  <button key={index} onClick={() => handleDayClick(day)} disabled={!day.isCurrentMonth} className={`relative py-2 font-medium rounded-lg transition-colors ${!day.isCurrentMonth ? 'text-gray-300 dark:text-gray-700 cursor-default' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'} ${isSelected ? 'bg-primary/10 text-primary font-bold' : ''}`}>
                    {day.day}
                    {hasEntries && !isSelected && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: moodColor || '#135bec' }} />}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedEntry && (
            <div className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onEntryClick?.(selectedEntry)}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">日记回顾：{selectedEntry.date}</p>
                <Edit3 className="text-primary" size={18} />
              </div>
              {selectedEntry.title && <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{selectedEntry.title}</h4>}
              <p className="text-[#111318] dark:text-gray-100 text-base leading-relaxed font-display line-clamp-3">{selectedEntry.content}</p>
            </div>
          )}
          {selectedDate && !selectedEntry && <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"><p className="text-gray-500 dark:text-gray-400 text-sm">这一天还没有日记</p></div>}
        </section>
      </main>

      {/* 报告弹窗 */}
      {showReportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30" onClick={() => setShowReportModal(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">{reportData.periodName}报告</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-center"><p className="text-3xl font-bold text-primary">{reportData.totalEntries}</p><p className="text-sm text-gray-500">篇日记</p></div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-center"><p className="text-3xl font-bold text-green-500">{reportData.activeDays}</p><p className="text-sm text-gray-500">活跃天数</p></div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-center"><p className="text-3xl font-bold text-orange-500">{reportData.totalWords.toLocaleString()}</p><p className="text-sm text-gray-500">累计字数</p></div>
              {reportData.topMoods.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2 text-center">主要心情</p>
                  <div className="flex justify-center gap-4">
                    {reportData.topMoods.map(([mood, count]) => (
                      <div key={mood} className="text-center"><span className="text-2xl">{MOOD_OPTIONS.find(m => m.name === mood)?.emoji}</span><p className="text-xs text-gray-600 dark:text-gray-400">{mood}</p><p className="text-xs text-gray-400">{count}次</p></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowReportModal(false)} className="w-full mt-6 px-4 py-3 bg-primary text-white rounded-xl font-medium">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 导出包装了错误边界的版本
export const InsightsWithBoundary: React.FC<InsightsProps> = (props) => (
  <ErrorBoundary fallback={
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 font-sans">
      <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={props.onBack} className="flex size-12 shrink-0 items-center justify-center hover:bg-black/5 rounded-full">
          <ArrowLeft size={24} className="text-[#111318] dark:text-white" />
        </button>
        <h2 className="text-lg font-bold text-[#111318] dark:text-white font-display">情感洞察</h2>
        <div className="w-12" />
      </div>
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">加载出错</p>
          <button onClick={() => window.location.reload()} className="text-primary">刷新页面</button>
        </div>
      </main>
    </div>
  }>
    <Insights {...props} />
  </ErrorBoundary>
);