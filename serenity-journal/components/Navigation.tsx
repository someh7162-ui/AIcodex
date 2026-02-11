import React from 'react';
import { BookOpen, Calendar, BarChart2, Settings, Image as ImageIcon, Plus } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onAdd: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, onAdd }) => {
  const getIconClass = (view: ViewState) => 
    `flex flex-col items-center gap-1 transition-colors ${
      currentView === view ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
    }`;

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40 md:hidden">
        <button 
          onClick={onAdd}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform duration-100 hover:bg-primary-dark"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-6 pb-8 pt-3 z-50">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <button onClick={() => onNavigate('TIMELINE')} className={getIconClass('TIMELINE')}>
            <BookOpen size={24} strokeWidth={currentView === 'TIMELINE' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">时光轴</span>
          </button>
          
          <button onClick={() => onNavigate('CALENDAR')} className={getIconClass('CALENDAR')}>
            <Calendar size={24} strokeWidth={currentView === 'CALENDAR' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">日历</span>
          </button>

          {/* Center Space for Desktop/Tablet visual balance, or could be the FAB location in some designs */}
           <div className="relative -top-5 hidden md:block">
            <button 
              onClick={onAdd}
              className="bg-primary size-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors"
            >
              <Plus size={32} />
            </button>
          </div>

          <button onClick={() => onNavigate('INSIGHTS')} className={getIconClass('INSIGHTS')}>
            <BarChart2 size={24} strokeWidth={currentView === 'INSIGHTS' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">洞察</span>
          </button>
          
          <button onClick={() => onNavigate('SETTINGS')} className={getIconClass('SETTINGS')}>
            <Settings size={24} strokeWidth={currentView === 'SETTINGS' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">设置</span>
          </button>
        </div>
      </nav>
    </>
  );
};
