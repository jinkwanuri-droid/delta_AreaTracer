import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store/useAppStore';

import SelectorPopover from './SelectorPopover';
import { Layers, RefreshCw, Loader2, Download } from 'lucide-react';
import { clsx } from 'clsx';

export default function Layout({ children }: { children: ReactNode }) {
  const project = useAppStore(state => state.project);
  const activeTab = useAppStore(state => state.activeTab);
  const stages = useAppStore(state => state.stages);
  const comparison = useAppStore(state => state.comparison);
  const setComparisonStages = useAppStore(state => state.setComparisonStages);
  const fetchData = useAppStore(state => state.fetchData);
  const isLoading = useAppStore(state => state.isLoading);
  const isPdfExportMode = useAppStore(state => state.isPdfExportMode);
  const setIsPdfExportMode = useAppStore(state => state.setIsPdfExportMode);

  const handlePrint = () => {
    setIsPdfExportMode(true);
    // Wait for the DOM to update to the print layout
    setTimeout(() => {
      window.print();
      setIsPdfExportMode(false);
    }, 500);
  };

  if (isPdfExportMode) {
    return (
      <div className="w-full bg-white">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-[#1E293B] font-['Pretendard','Inter',sans-serif] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10 w-full relative">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {project?.name || 'Loading...'} 
              <span className="text-slate-400 font-normal mx-2">|</span> 
              <span className="text-indigo-600">
                {activeTab === 'detail' ? '세부 면적계획' : 
                 activeTab === 'summary' ? '부서별 총괄' : '대시보드'}
              </span>
            </h1>

            <SelectorPopover
              label="CURRENT"
              options={stages}
              value={comparison.targetId || ""}
              onChange={(val) => setComparisonStages(comparison.baseId, val)}
              icon={<Layers size={14} />}
              className="bg-indigo-50/50 border-indigo-100 shadow-indigo-100/20 w-[190px] shrink-0"
            />
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={() => fetchData(true)}
                disabled={isLoading}
                className={clsx(
                   "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center justify-center shrink-0 border border-slate-200 hover:border-indigo-200 shadow-sm bg-white",
                   isLoading && "opacity-50 cursor-not-allowed"
                )}
                title="데이터 새로고침 (DB 데이터 다시 읽기)"
              >
                {isLoading ? (
                   <Loader2 size={16} className="animate-spin text-indigo-400" />
                ) : (
                   <RefreshCw size={16} />
                )}
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all ml-2"
                title="PDF 인쇄 메뉴 열기 (A4 가로 권장)"
              >
                <Download size={16} strokeWidth={2.5} />
                <span>PDF 출력</span>
              </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
