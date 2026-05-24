import { ReactNode, useState } from 'react';
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
  const setPdfExportTargets = useAppStore(state => state.setPdfExportTargets);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [exportSummary, setExportSummary] = useState(true);
  const [exportDetail, setExportDetail] = useState(true);

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handleGeneratePrint = () => {
    const targets = [];
    if (exportSummary) targets.push('summary');
    if (exportDetail) targets.push('detail');
    
    if (targets.length === 0) {
      alert('출력할 대상을 최소 하나 이상 선택해 주세요.');
      return;
    }

    setPdfExportTargets(targets);
    setShowPrintModal(false);
    setIsPdfExportMode(true);

    // Wait for the DOM to update to the print layout
    setTimeout(() => {
      window.print();
      setIsPdfExportMode(false);
    }, 600);
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
                onClick={handlePrintClick}
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

      {/* Print Option Selection Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                PDF 인쇄 범위 설정
              </h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-normal">
                출력할 보고서를 선택하신 후 확인 버튼을 누르시면 인쇄 대화상자가 열립니다. (A4 가로 방향 출력 권장)
              </p>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSummary}
                    onChange={(e) => setExportSummary(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700">부서별 총괄 면적표</span>
                    <p className="text-[11px] text-slate-400">각 부서/부문별 설계 단계별 총괄 면적 대비 증감표</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportDetail}
                    onChange={(e) => setExportDetail(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700">층별 세부 면적계획</span>
                    <p className="text-[11px] text-slate-400">지하 1층 ~ 지상 7층 각 실별 세부 면적 계획 및 증감표</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                취소
              </button>
              <button
                onClick={handleGeneratePrint}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                출력 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
