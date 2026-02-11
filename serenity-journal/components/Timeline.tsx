import React, { useState } from 'react';
import { Search, Bell, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { DiaryEntry } from '../types';
import { getGreeting } from '../constants/options';

interface TimelineProps {
  entries: DiaryEntry[];
  onSearch?: (query: string) => void;
  onEntryClick?: (entry: DiaryEntry) => void;
  onDeleteEntry?: (id: string) => void;
  userName?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  entries, 
  onSearch, 
  onEntryClick,
  onDeleteEntry,
  userName = '朋友'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleEntryClick = (entry: DiaryEntry, e: React.MouseEvent) => {
    // 如果点击的是菜单按钮，不触发编辑
    if ((e.target as HTMLElement).closest('.entry-menu')) return;
    onEntryClick?.(entry);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteEntry?.(id);
    setActiveMenu(null);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex flex-col gap-2 p-4 pb-4 max-w-md mx-auto">
          <div className="flex items-center h-12 justify-between">
            <div className="flex size-10 shrink-0 items-center">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-white dark:border-gray-700 shadow-sm"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCpZoNRKDRrwUs9IscxQT6db8EX5TDlnP_mbnhME8pFV1P_3jqk97vaG9tpxWk4yPuAM2Yg9wG8uxJFRpbmEZYkqhVXL71Mt7ZsSigqsH8eiZJ0zxtQegS1BiASenaWGeKq6P1FlvTiCvktK1VGQ26lgSq1Q0oK_OGJdiTy_vM8NpK0SJxyJoStgVcas83bdaIUimQS4NhRmQ7RD9TkEBvvfGWLT-NrP5AHMlg1bTkmcU7snEafxvGKhfwY35fBTzUeQwihB177YK6-")' }}
              />
            </div>
            <div className="flex w-12 items-center justify-end">
              <button className="flex items-center justify-center rounded-full h-10 w-10 bg-white dark:bg-gray-800 shadow-sm text-[#111318] dark:text-white hover:bg-gray-50">
                <Bell size={20} />
              </button>
            </div>
          </div>
          <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-bold leading-tight mt-2 font-display">
            {greeting}，{userName}<br />今天想记录什么？
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Search */}
        <div className="px-4 py-4">
          <div className="relative flex items-center w-full h-12 rounded-xl focus-within:shadow-lg bg-white dark:bg-gray-800 shadow-sm transition-shadow duration-200">
            <div className="grid place-items-center h-full w-12 text-gray-400">
              <Search size={20} />
            </div>
            <input
              className="peer h-full w-full outline-none text-sm text-gray-700 dark:text-gray-100 pr-2 bg-transparent placeholder-gray-400"
              type="text"
              id="search"
              placeholder="搜索日记..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); onSearch?.(''); }}
                className="pr-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchQuery ? '没有找到日记' : '开始你的日记之旅'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? '试试其他关键词' 
                : '点击下方的 + 按钮，写下你的第一篇日记'
              }
            </p>
          </div>
        )}

        {/* Feed */}
        <div className="flex flex-col space-y-4 px-4">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              onClick={(e) => handleEntryClick(entry, e)}
              className="group flex flex-col items-stretch justify-start rounded-xl shadow-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden transition-transform duration-200 hover:scale-[1.01] cursor-pointer"
            >
              {entry.imageUrl && (
                <div 
                  className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover"
                  style={{ backgroundImage: `url("${entry.imageUrl}")` }}
                />
              )}
              <div className="flex w-full grow flex-col items-stretch justify-center gap-2 p-5 relative">
                {/* 更多菜单按钮 */}
                <div className="entry-menu absolute top-4 right-4">
                  <button 
                    onClick={(e) => toggleMenu(entry.id, e)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {activeMenu === entry.id && (
                    <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 min-w-[100px] z-10">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEntryClick?.(entry); setActiveMenu(null); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit2 size={14} /> 编辑
                      </button>
                      <button 
                        onClick={(e) => handleDelete(entry.id, e)}
                        className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#616f89] dark:text-gray-400 text-sm font-medium">
                    {entry.weather} {entry.weatherEmoji} · {entry.mood} {entry.moodEmoji}
                  </span>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {entry.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                      {entry.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{entry.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
                <h2 className="text-[#111318] dark:text-white text-2xl font-bold leading-tight tracking-tight font-display">
                  {entry.title || entry.date}
                </h2>
                {entry.title && (
                  <p className="text-gray-400 text-sm">{entry.date}</p>
                )}
                <div className="flex flex-col gap-3">
                  <p className="text-[#616f89] dark:text-gray-300 text-lg font-normal leading-relaxed line-clamp-2 font-display">
                    {entry.content}
                  </p>
                  {entry.imageUrl && (
                    <div className="flex justify-end mt-2">
                      <button className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-semibold tracking-wide shadow-sm transition-colors">
                        <span>阅读全文</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 点击其他地方关闭菜单 */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
};
