import React, { useState, useEffect, useRef } from 'react';
import { Smile, Sun, Tag, Cloud, Bold, Italic, List, X, Check, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { DiaryEntry } from '../types';
import { MOOD_OPTIONS, WEATHER_OPTIONS, DEFAULT_TAGS } from '../constants/options';
import { formatDate, formatFullDate, createEntry, updateEntry, deleteEntry } from '../services/storage';
import { isAIAvailable, getWritingInspiration, suggestTags } from '../services/ai';

interface EditorProps {
  onClose: () => void;
  onSave?: (entry: DiaryEntry) => void;
  onDelete?: (id: string) => void;
  editingEntry?: DiaryEntry | null;
  defaultDate?: Date; // 新增：指定日期创建日记
}

export const Editor: React.FC<EditorProps> = ({ onClose, onSave, onDelete, editingEntry, defaultDate }) => {
  const isEditing = !!editingEntry;
  const targetDate = defaultDate || new Date();
  
  const [content, setContent] = useState(editingEntry?.content || '');
  const [title, setTitle] = useState(editingEntry?.title || '');
  const [mood, setMood] = useState(editingEntry?.mood || '平静');
  const [moodEmoji, setMoodEmoji] = useState(editingEntry?.moodEmoji || '😌');
  const [weather, setWeather] = useState(editingEntry?.weather || '晴天');
  const [weatherEmoji, setWeatherEmoji] = useState(editingEntry?.weatherEmoji || '☀️');
  const [tags, setTags] = useState<string[]>(editingEntry?.tags || []);
  const [imageUrl, setImageUrl] = useState(editingEntry?.imageUrl || '');
  
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInspirations, setAiInspirations] = useState<string[]>([]);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // 自动保存
  useEffect(() => {
    if (content || title) {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('saved');
      }, 1000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title, mood, weather, tags]);

  const handleSave = () => {
    if (!content.trim() && !title.trim()) {
      onClose();
      return;
    }

    const entryData = {
      date: editingEntry?.date || formatDate(targetDate),
      fullDate: editingEntry?.fullDate || formatFullDate(targetDate),
      content: content.trim(),
      title: title.trim() || undefined,
      mood,
      moodEmoji,
      weather,
      weatherEmoji,
      tags: tags.length > 0 ? tags : undefined,
      imageUrl: imageUrl || undefined,
    };

    let savedEntry: DiaryEntry;
    if (isEditing && editingEntry) {
      const updated = updateEntry(editingEntry.id, entryData);
      if (updated) savedEntry = updated;
      else return;
    } else {
      savedEntry = createEntry(entryData);
    }

    onSave?.(savedEntry);
    onClose();
  };

  const handleDelete = () => {
    if (editingEntry) {
      deleteEntry(editingEntry.id);
      onDelete?.(editingEntry.id);
      onClose();
    }
  };

  const handleMoodSelect = (moodOption: typeof MOOD_OPTIONS[0]) => {
    setMood(moodOption.name);
    setMoodEmoji(moodOption.emoji);
    setShowMoodPicker(false);
  };

  const handleWeatherSelect = (weatherOption: typeof WEATHER_OPTIONS[0]) => {
    setWeather(weatherOption.name);
    setWeatherEmoji(weatherOption.emoji);
    setShowWeatherPicker(false);
  };

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 富文本格式化
  const applyFormat = (format: 'bold' | 'italic' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case 'list':
        newText = `\n- ${selectedText}`;
        cursorOffset = selectedText ? 0 : 3;
        break;
    }

    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + newText.length - cursorOffset;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // AI 功能
  const handleGetInspiration = async () => {
    if (!isAIAvailable()) {
      setAiInspirations(['请在 .env.local 文件中配置 VITE_GEMINI_API_KEY']);
      return;
    }
    
    setAiLoading(true);
    try {
      const inspirations = await getWritingInspiration(mood, weather);
      setAiInspirations(inspirations);
    } catch (error) {
      setAiInspirations(['AI 服务暂时不可用，请稍后再试']);
    }
    setAiLoading(false);
  };

  const handleSuggestTags = async () => {
    if (!isAIAvailable() || !content.trim()) {
      return;
    }
    
    setAiLoading(true);
    try {
      const suggested = await suggestTags(content);
      setAiSuggestedTags(suggested);
    } catch (error) {
      console.error('AI tag suggestion failed:', error);
    }
    setAiLoading(false);
  };

  const applyInspiration = (inspiration: string) => {
    setContent(prev => prev + (prev ? '\n\n' : '') + inspiration);
    setShowAIPanel(false);
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return '保存中...';
      case 'saved': return '已保存';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-background-dark animate-in fade-in duration-300">
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-background-dark opacity-80" />

      {/* Top Bar Controls */}
      <div className="relative z-20 flex justify-center p-6 pt-12 md:pt-6">
        <div className="flex items-center gap-4 px-6 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 shadow-sm">
          <button 
            onClick={() => setShowMoodPicker(true)}
            className="flex items-center gap-2 text-[#111318] dark:text-white hover:text-primary transition-colors"
          >
            <span className="text-lg">{moodEmoji}</span>
            <span className="text-xs font-sans font-medium tracking-wider">{mood}</span>
          </button>
          <div className="h-4 w-[1px] bg-[#111318]/10 dark:bg-white/10"></div>
          <button 
            onClick={() => setShowWeatherPicker(true)}
            className="flex items-center gap-2 text-[#111318] dark:text-white hover:text-primary transition-colors"
          >
            <span className="text-lg">{weatherEmoji}</span>
            <span className="text-xs font-sans font-medium tracking-wider">{weather}</span>
          </button>
          <div className="h-4 w-[1px] bg-[#111318]/10 dark:bg-white/10"></div>
          <button 
            onClick={() => setShowTagPicker(true)}
            className="flex items-center gap-2 text-[#111318] dark:text-white hover:text-primary transition-colors"
          >
            <Tag size={18} />
            <span className="text-xs font-sans font-medium tracking-wider">
              {tags.length > 0 ? `${tags.length}个标签` : '标签'}
            </span>
          </button>
        </div>
      </div>

      {/* Cloud Status & Close Button */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-sans tracking-widest text-[#111318] dark:text-white hidden sm:block">
          {getSaveStatusText()}
        </span>
        <Cloud size={18} className={saveStatus === 'saved' ? 'text-green-500' : 'text-primary'} />
        {isEditing && (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-2 p-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button onClick={onClose} className="ml-2 p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
          <X size={16} />
        </button>
      </div>

      {/* Main Writing Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pt-4 pb-12 px-8 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 日期显示 */}
          <div className="text-sm text-gray-400 font-sans">
            {editingEntry?.date || formatDate(targetDate)}
          </div>
          
          {/* 标签显示 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-[#111318] dark:text-white tracking-tight text-[32px] font-semibold leading-tight placeholder:text-gray-300 focus:ring-0 focus:outline-none font-display"
            placeholder="标题..."
          />
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[50vh] resize-none bg-transparent border-none p-0 text-[#111318]/80 dark:text-white/80 text-[20px] font-normal leading-[1.8] text-justify placeholder:text-gray-300 focus:ring-0 focus:outline-none font-display"
            placeholder="开始记录此刻的心情..."
          />
        </div>
      </div>

      {/* Keyboard/Toolbar Area */}
      <div className="w-full bg-white/80 dark:bg-surface-dark/90 backdrop-blur-xl border-t border-[#111318]/5 dark:border-white/5 pb-8 pt-2 relative z-20">
        <div className="max-w-2xl mx-auto px-6 flex justify-between items-center h-12">
          <div className="flex gap-6">
            <button 
              onClick={() => applyFormat('bold')}
              className="text-[#111318]/60 dark:text-white/60 hover:text-primary transition-colors"
              title="加粗"
            >
              <Bold size={20} />
            </button>
            <button 
              onClick={() => applyFormat('italic')}
              className="text-[#111318]/60 dark:text-white/60 hover:text-primary transition-colors"
              title="斜体"
            >
              <Italic size={20} />
            </button>
            <button 
              onClick={() => applyFormat('list')}
              className="text-[#111318]/60 dark:text-white/60 hover:text-primary transition-colors"
              title="列表"
            >
              <List size={20} />
            </button>
            <div className="h-5 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
            <button 
              onClick={() => { setShowAIPanel(true); handleGetInspiration(); }}
              className="text-[#111318]/60 dark:text-white/60 hover:text-primary transition-colors flex items-center gap-1"
              title="AI 写作助手"
            >
              <Sparkles size={20} />
              <span className="text-xs hidden sm:inline">AI</span>
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="text-primary font-sans font-semibold text-sm tracking-wider flex items-center gap-1 hover:text-primary-dark"
          >
            {isEditing ? '更新' : '完成'} <Check size={16} />
          </button>
        </div>
      </div>

      {/* 心情选择弹窗 */}
      {showMoodPicker && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={() => setShowMoodPicker(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">选择心情</h3>
              <button onClick={() => setShowMoodPicker(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {MOOD_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleMoodSelect(option)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    mood === option.name 
                      ? 'bg-primary/10 ring-2 ring-primary' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 天气选择弹窗 */}
      {showWeatherPicker && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={() => setShowWeatherPicker(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">选择天气</h3>
              <button onClick={() => setShowWeatherPicker(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {WEATHER_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleWeatherSelect(option)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    weather === option.name 
                      ? 'bg-primary/10 ring-2 ring-primary' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 标签选择弹窗 */}
      {showTagPicker && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={() => setShowTagPicker(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">选择标签</h3>
              <button onClick={() => setShowTagPicker(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {DEFAULT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    tags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowTagPicker(false)}
                className="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 animate-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">删除日记</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">确定要删除这篇日记吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 助手面板 */}
      {showAIPanel && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={() => setShowAIPanel(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI 写作助手</h3>
              </div>
              <button onClick={() => setShowAIPanel(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* 写作灵感 */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">写作灵感</h4>
                <button 
                  onClick={handleGetInspiration}
                  disabled={aiLoading}
                  className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  换一批
                </button>
              </div>
              
              {aiLoading && aiInspirations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {aiInspirations.map((inspiration, index) => (
                    <button
                      key={index}
                      onClick={() => applyInspiration(inspiration)}
                      className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {inspiration}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI 标签建议 */}
            {content.trim() && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">智能标签建议</h4>
                  <button 
                    onClick={handleSuggestTags}
                    disabled={aiLoading}
                    className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
                    生成标签
                  </button>
                </div>
                
                {aiSuggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestedTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          tags.includes(tag)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary/20'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isAIAvailable() && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  AI 功能需要配置 Gemini API Key。
                  请在项目根目录的 <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">.env.local</code> 文件中设置：
                </p>
                <code className="block mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded">
                  VITE_GEMINI_API_KEY=your_api_key_here
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
