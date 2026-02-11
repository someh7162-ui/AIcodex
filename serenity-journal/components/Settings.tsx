import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Monitor, 
  Download, 
  Upload, 
  Trash2, 
  User, 
  Bell, 
  Shield,
  HelpCircle,
  ChevronRight,
  Check
} from 'lucide-react';
import { getSettings, saveSettings, exportData, importData, clearAllData, getAllEntries, AppSettings } from '../services/storage';

interface SettingsProps {
  onBack: () => void;
  onDataChange?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, onDataChange }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [userName, setUserName] = useState(settings.userName);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const entries = getAllEntries();

  useEffect(() => {
    // 应用主题
    applyTheme(settings.theme);
  }, [settings.theme]);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const updated = saveSettings({ theme });
    setSettings(updated);
  };

  const handleUserNameSave = () => {
    const updated = saveSettings({ userName: userName.trim() || '朋友' });
    setSettings(updated);
    showMessage('success', '昵称已更新');
    onDataChange?.();
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serenity-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('success', '数据已导出');
  };

  const handleImport = () => {
    try {
      const success = importData(importText);
      if (success) {
        showMessage('success', '数据导入成功');
        setShowImportModal(false);
        setImportText('');
        onDataChange?.();
        // 刷新设置
        setSettings(getSettings());
      } else {
        showMessage('error', '导入失败，请检查数据格式');
      }
    } catch (e) {
      showMessage('error', '导入失败，JSON 格式错误');
    }
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    showMessage('success', '所有数据已清除');
    onDataChange?.();
    setSettings(getSettings());
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center p-4 max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} className="text-[#111318] dark:text-white" />
          </button>
          <h1 className="text-xl font-bold text-[#111318] dark:text-white font-display ml-4">设置</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 消息提示 */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <Check size={18} />
            {message.text}
          </div>
        )}

        {/* 个人资料 */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">个人资料</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={32} className="text-primary" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">昵称</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="输入你的昵称"
                  />
                  <button 
                    onClick={handleUserNameSave}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 外观设置 */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">外观</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">选择主题</p>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    settings.theme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <option.icon 
                    size={24} 
                    className={settings.theme === option.value ? 'text-primary' : 'text-gray-400'} 
                  />
                  <span className={`text-sm font-medium ${
                    settings.theme === option.value ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 数据管理 */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">数据管理</h3>
          </div>
          <div>
            {/* 统计 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">日记数量</span>
                <span className="text-gray-500 dark:text-gray-400">{entries.length} 篇</span>
              </div>
            </div>

            {/* 导出 */}
            <button 
              onClick={handleExport}
              className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download size={20} className="text-primary" />
                <span className="text-gray-700 dark:text-gray-300">导出数据</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>

            {/* 导入 */}
            <button 
              onClick={() => setShowImportModal(true)}
              className="w-full p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Upload size={20} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">导入数据</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>

            {/* 清除数据 */}
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-red-500" />
                <span className="text-red-500">清除所有数据</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* 关于 */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">关于</h3>
          </div>
          <div>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">版本</span>
              <span className="text-gray-500 dark:text-gray-400">1.0.0</span>
            </div>
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">帮助与反馈</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-400 dark:text-gray-600 py-4">
          Serenity Journal - 宁静日记<br />
          用心记录每一天
        </div>
      </main>

      {/* 清除确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30" onClick={() => setShowClearConfirm(false)}>
          <div 
            className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 animate-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">清除所有数据</h3>
                <p className="text-sm text-gray-500">共 {entries.length} 篇日记</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              此操作将永久删除所有日记和设置，无法恢复。建议先导出备份。
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleClearData}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30" onClick={() => setShowImportModal(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 animate-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">导入数据</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              粘贴之前导出的 JSON 数据。注意：这将覆盖现有数据。
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-40 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent text-gray-800 dark:text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder='{"entries": [...], "settings": {...}}'
            />
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => { setShowImportModal(false); setImportText(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
