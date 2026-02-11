import React, { useState, useMemo, useRef, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Edit3, Plus, Calendar as CalendarIcon, List } from 'lucide-react';
import { DiaryEntry } from '../types';
import { getMoodColor, MOOD_OPTIONS } from '../constants/options';

interface CalendarProps {
  entries: DiaryEntry[];
  onBack?: () => void;
  onEntryClick?: (entry: DiaryEntry) => void;
  onDateClick?: (date: Date) => void;
  onCreateEntry?: (date: Date) => void;
}

type ViewMode = 'month' | 'week';

export const Calendar: React.FC<CalendarProps> = ({ 
  entries, 
  onBack, 
  onEntryClick,
  onDateClick,
  onCreateEntry
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // 滑动手势支持
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 月份统计摘要
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthEntries = entries.filter(e => {
      if (!e.fullDate) return false;
      const entryDate = new Date(e.fullDate);
      return entryDate.getFullYear() === year && entryDate.getMonth() === month;
    });

    const totalEntries = monthEntries.length;
    const totalWords = monthEntries.reduce((sum, e) => sum + e.content.length, 0);
    const daysWithEntries = new Set(monthEntries.map(e => e.fullDate)).size;
    
    // 主要心情
    const moodCounts: Record<string, number> = {};
    monthEntries.forEach(e => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalEntries,
      totalWords,
      daysWithEntries,
      topMood: topMood ? { name: topMood[0], count: topMood[1] } : null,
    };
  }, [currentDate, entries]);

  // 获取当月日历数据
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekDay = firstDay.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean; entries: DiaryEntry[] }[] = [];
    
    // 上月填充
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = formatDateStr(date);
      const dayEntries = entries.filter(e => e.fullDate === dateStr);
      days.push({ date, isCurrentMonth: false, entries: dayEntries });
    }
    
    // 当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = formatDateStr(date);
      const dayEntries = entries.filter(e => e.fullDate === dateStr);
      days.push({ date, isCurrentMonth: true, entries: dayEntries });
    }
    
    // 下月填充
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = formatDateStr(date);
      const dayEntries = entries.filter(e => e.fullDate === dateStr);
      days.push({ date, isCurrentMonth: false, entries: dayEntries });
    }
    
    return days;
  }, [currentDate, entries]);

  // 周视图数据
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const days: { date: Date; entries: DiaryEntry[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDateStr(date);
      const dayEntries = entries.filter(e => e.fullDate === dateStr);
      days.push({ date, entries: dayEntries });
    }
    
    return days;
  }, [currentDate, entries]);

  const goToPrevMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateStr(new Date()));
  };

  const handleDateClick = (date: Date, entriesCount: number) => {
    const dateStr = formatDateStr(date);
    setSelectedDate(dateStr);
  };

  const handleCreateEntry = (date: Date) => {
    if (onCreateEntry) {
      onCreateEntry(date);
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  // 滑动手势处理
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNextMonth();
      } else {
        goToPrevMonth();
      }
    }
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const allDays = viewMode === 'month' ? calendarData : weekData;
    return allDays.find(d => formatDateStr(d.date) === selectedDate);
  }, [selectedDate, calendarData, weekData, viewMode]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthName = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
  const today = formatDateStr(new Date());

  // 获取周范围显示
  const getWeekRange = () => {
    if (weekData.length === 0) return '';
    const start = weekData[0].date;
    const end = weekData[6].date;
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-white dark:bg-gray-800 shadow-sm"
          >
            <ChevronLeft size={20} className="text-[#111318] dark:text-white" />
          </button>
          <h1 className="text-xl font-bold text-[#111318] dark:text-white font-display">
            {viewMode === 'month' ? monthName : getWeekRange()}
          </h1>
          <button 
            onClick={goToToday}
            className="text-primary text-sm font-medium"
          >
            今天
          </button>
        </div>
      </header>

      <main 
        className="max-w-md mx-auto px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 视图切换 & 月份导航 */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button 
              onClick={goToPrevMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button 
              onClick={goToNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          {/* 视图模式切换 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'month' 
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarIcon size={14} /> 月
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'week' 
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} /> 周
            </button>
          </div>
        </div>

        {/* 月份统计摘要 */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-primary">{monthStats.totalEntries}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">篇日记</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-500">{monthStats.daysWithEntries}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">活跃天</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-orange-500">{monthStats.totalWords}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">总字数</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
              {monthStats.topMood ? (
                <>
                  <p className="text-2xl">{MOOD_OPTIONS.find(m => m.name === monthStats.topMood?.name)?.emoji || '😊'}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{monthStats.topMood.name}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl">-</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">主心情</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - 月视图 */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((day, index) => {
              const dateStr = formatDateStr(day.date);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasEntries = day.entries.length > 0;
              const entryCount = day.entries.length;
              const primaryMood = hasEntries ? day.entries[0].mood : null;
              const moodColor = primaryMood ? getMoodColor(primaryMood) : undefined;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day.date, entryCount)}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative
                    transition-all duration-200
                    ${!day.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                  `}
                >
                  <span className={isSelected ? 'font-bold' : ''}>
                    {day.date.getDate()}
                  </span>
                  {hasEntries && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : ''}`}
                        style={{ backgroundColor: isSelected ? undefined : moodColor }}
                      />
                      {entryCount > 1 && (
                        <span className={`text-[8px] ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          +{entryCount - 1}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Calendar Grid - 周视图 */}
        {viewMode === 'week' && (
          <div className="space-y-2">
            {weekData.map((day, index) => {
              const dateStr = formatDateStr(day.date);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasEntries = day.entries.length > 0;

              return (
                <div 
                  key={index}
                  onClick={() => handleDateClick(day.date, day.entries.length)}
                  className={`
                    p-4 rounded-xl border transition-all cursor-pointer
                    ${isSelected 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary/50'
                    }
                    ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>
                        {day.date.getDate()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        周{weekDays[day.date.getDay()]}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">今天</span>
                      )}
                    </div>
                    {hasEntries && (
                      <span className="text-sm text-gray-500">{day.entries.length}篇</span>
                    )}
                  </div>
                  
                  {hasEntries ? (
                    <div className="space-y-2">
                      {day.entries.slice(0, 2).map(entry => (
                        <div 
                          key={entry.id}
                          onClick={(e) => { e.stopPropagation(); onEntryClick?.(entry); }}
                          className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span>{entry.moodEmoji}</span>
                            <span>{entry.weatherEmoji}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                            {entry.title || entry.content}
                          </p>
                        </div>
                      ))}
                      {day.entries.length > 2 && (
                        <p className="text-xs text-gray-400 text-center">还有 {day.entries.length - 2} 篇...</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">暂无日记</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Day Entries - 仅月视图显示 */}
        {viewMode === 'month' && selectedDate && selectedDayData && (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {selectedDayData.date.getMonth() + 1}月{selectedDayData.date.getDate()}日
                {selectedDayData.entries.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({selectedDayData.entries.length}篇日记)
                  </span>
                )}
              </h3>
              <button 
                onClick={() => handleCreateEntry(selectedDayData.date)}
                className="flex items-center gap-1 text-primary text-sm font-medium hover:text-primary-dark"
              >
                <Plus size={16} /> 写日记
              </button>
            </div>
            
            {selectedDayData.entries.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-gray-500 mb-3">这一天还没有日记</p>
                <button 
                  onClick={() => handleCreateEntry(selectedDayData.date)}
                  className="text-primary text-sm font-medium flex items-center gap-1 mx-auto"
                >
                  <Edit3 size={14} /> 写一篇
                </button>
              </div>
            ) : (
              selectedDayData.entries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => onEntryClick?.(entry)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{entry.moodEmoji} {entry.mood}</span>
                      <span>·</span>
                      <span>{entry.weatherEmoji} {entry.weather}</span>
                    </div>
                    {entry.imageUrl && (
                      <span className="text-xs text-gray-400">有图片</span>
                    )}
                  </div>
                  {entry.title && (
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{entry.title}</h4>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">{entry.content}</p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.map(tag => (
                        <span key={tag} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Calendar Legend */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">心情图例</h4>
          <div className="flex flex-wrap gap-3">
            {[
              { name: '开心', color: '#FFD700' },
              { name: '平静', color: '#87CEEB' },
              { name: '感恩', color: '#90EE90' },
              { name: '沉思', color: '#9370DB' },
              { name: '疲惫', color: '#A9A9A9' },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 滑动提示 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          ← 左右滑动切换{viewMode === 'month' ? '月份' : '周'} →
        </p>
      </main>
    </div>
  );
};
