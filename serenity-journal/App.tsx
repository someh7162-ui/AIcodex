import React, { useState, useEffect, useCallback } from 'react';
import { Timeline } from './components/Timeline';
import { Editor } from './components/Editor';
import { InsightsWithBoundary } from './components/Insights';
import { Calendar } from './components/Calendar';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';
import { ViewState, DiaryEntry } from './types';
import { 
  getAllEntries, 
  searchEntries, 
  deleteEntry,
  getSettings,
  createEntry,
  formatDate,
  formatFullDate,
} from './services/storage';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('TIMELINE');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [userName, setUserName] = useState('朋友');
  const [newEntryDate, setNewEntryDate] = useState<Date | null>(null);

  // 加载日记列表
  const loadEntries = useCallback(() => {
    if (searchQuery) {
      setEntries(searchEntries(searchQuery));
    } else {
      setEntries(getAllEntries());
    }
  }, [searchQuery]);

  // 加载设置
  const loadSettings = useCallback(() => {
    const settings = getSettings();
    setUserName(settings.userName);
  }, []);

  // 初始化
  useEffect(() => {
    loadEntries();
    loadSettings();
  }, [loadEntries, loadSettings]);

  // 搜索处理
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setEntries(searchEntries(query));
    } else {
      setEntries(getAllEntries());
    }
  };

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
  };

  const openEditor = (date?: Date) => {
    setEditingEntry(null);
    setNewEntryDate(date || null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingEntry(null);
    setNewEntryDate(null);
  };

  // 点击日记卡片进入编辑
  const handleEntryClick = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  // 保存日记后刷新列表
  const handleSaveEntry = (entry: DiaryEntry) => {
    loadEntries();
  };

  // 删除日记
  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
    loadEntries();
  };

  // 数据变化后的回调
  const handleDataChange = () => {
    loadEntries();
    loadSettings();
  };

  // 日历点击日期
  const handleDateClick = (date: Date) => {
    openEditor(date);
  };

  const renderView = () => {
    switch (currentView) {
      case 'TIMELINE':
        return (
          <Timeline 
            entries={entries} 
            onSearch={handleSearch}
            onEntryClick={handleEntryClick}
            onDeleteEntry={handleDeleteEntry}
            userName={userName}
          />
        );
      case 'INSIGHTS':
        return (
          <InsightsWithBoundary 
            onBack={() => setCurrentView('TIMELINE')} 
            onEntryClick={handleEntryClick}
          />
        );
      case 'CALENDAR':
        return (
          <Calendar 
            entries={entries}
            onBack={() => setCurrentView('TIMELINE')}
            onEntryClick={handleEntryClick}
            onDateClick={handleDateClick}
            onCreateEntry={handleDateClick}
          />
        );
      case 'SETTINGS':
        return (
          <Settings 
            onBack={() => setCurrentView('TIMELINE')}
            onDataChange={handleDataChange}
          />
        );
      default:
        return (
          <Timeline 
            entries={entries}
            onSearch={handleSearch}
            onEntryClick={handleEntryClick}
            onDeleteEntry={handleDeleteEntry}
            userName={userName}
          />
        );
    }
  };

  // 判断是否显示导航栏
  const showNavigation = !isEditorOpen && 
    currentView !== 'INSIGHTS' && 
    currentView !== 'SETTINGS';

  return (
    <div className="relative w-full h-full min-h-screen">
      
      {/* Main Content Area */}
      {renderView()}

      {/* Editor Modal Overlay */}
      {isEditorOpen && (
        <Editor 
          onClose={closeEditor}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          editingEntry={editingEntry}
          defaultDate={newEntryDate || undefined}
        />
      )}

      {/* Navigation */}
      {showNavigation && (
        <Navigation 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          onAdd={() => openEditor()} 
        />
      )}
    </div>
  );
}
