import { useAppStore } from '@/store/useAppStore';
import { LayoutDashboard, TableProperties, Sheet, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import React, { useState } from 'react';
import SettingsModal from './SettingsModal';
import { motion, AnimatePresence } from 'motion/react';

function MenuItem({ item, active, onClick }: { item: any; active: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex items-center justify-center w-full">
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={clsx(
          "p-2.5 transition-all duration-300 relative group",
          active 
            ? "text-indigo-600 bg-indigo-50/80 rounded-xl" 
            : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl"
        )}
      >
        <item.icon className="w-6 h-6 stroke-[2]" />
        {active && (
          <motion.div 
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-600 rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-extrabold rounded-md whitespace-nowrap z-[100] shadow-lg pointer-events-none border border-white/20"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  const menu = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'summary', label: '부서별 총괄', icon: TableProperties },
    { id: 'detail', label: '세부 면적계획', icon: Sheet },
  ] as const;

  return (
    <>
      <aside className="hidden md:flex w-20 flex-col items-center py-8 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[60] shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex flex-col items-center justify-center mb-12 shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
          <span className="text-white font-black text-xl tracking-tighter">D</span>
        </div>
        <nav className="flex flex-col gap-8 w-full items-center flex-1">
          {menu.map((item) => (
            <MenuItem 
              key={item.id} 
              item={item} 
              active={activeTab === item.id} 
              onClick={() => setActiveTab(item.id)} 
            />
          ))}
        </nav>
        <div className="mt-auto w-full flex items-center justify-center pt-8">
           <MenuItem 
             item={{ id: 'settings', label: '설정', icon: Settings }}
             active={false}
             onClick={() => setShowSettings(true)}
           />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] bg-white border-t border-slate-200 z-[60] flex justify-around items-center px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        {menu.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-indigo-600" : "text-slate-400 hover:text-indigo-500"
              )}
            >
              <item.icon className={clsx("w-5 h-5", isActive ? "stroke-[2]" : "stroke-2")} />
              <span className={clsx("text-[11px] font-medium", isActive ? "font-semibold" : "text-slate-400")}>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowSettings(true)}
          className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-slate-400 hover:text-indigo-500"
        >
          <Settings className="w-5 h-5 stroke-2" />
          <span className="text-[11px] font-medium text-slate-400">설정</span>
        </button>
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
