import { ReactNode, useState, useRef } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store/useAppStore';

import SelectorPopover from './SelectorPopover';
import { Layers, RefreshCw, Loader2, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { useReactToPrint } from 'react-to-print';
import PrintableReport from './report/PrintableReport';

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
  const pdfExportOptions = useAppStore(state => state.pdfExportOptions);
  const setPdfExportOptions = useAppStore(state => state.setPdfExportOptions);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState({
    dashboard: false,
    summary: false,
    detail: true // Defaulted to true as we implemented Detail PDF layout first securely
  });

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `hospital_area_report_${Date.now()}`,
    onBeforePrint: async () => {
      // Just in case we need anything explicitly set before the dialog popups
    },
    onAfterPrint: () => {
      setIsPdfExportMode(false);
      setIsExporting(false);
    },
  });

  const handleExportPdf = async () => {
    // Apply options first
    setPdfExportOptions(localOptions);
    setIsModalOpen(false);
    setIsExporting(true);
    setIsPdfExportMode(true);
    
    // Give enough time for Recharts to render fully in the hidden div
    // Complex charts can take a bit to stabilize layout
    setTimeout(() => {
      if (handlePrint) {
         handlePrint();
      } else {
         setIsPdfExportMode(false);
         setIsExporting(false);
      }
    }, 1500);
  };

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
                onClick={() => setIsModalOpen(true)} 
                disabled={isExporting}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all ml-2",
                  isExporting && "opacity-70 cursor-not-allowed"
                )}
             >
               {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
               PDF Export
             </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>

      {/* PDF Export Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Download size={18} className="text-indigo-500" />
              PDF 내보내기 범위 선택
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              저장할 보고서의 범위를 선택하세요. 체크된 항목들을 하나로 취합하여 가로형 A4 리포트로 출력합니다.
            </p>
            
            <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={localOptions.dashboard}
                  onChange={(e) => setLocalOptions({ ...localOptions, dashboard: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">대시보드</span>
                  <span className="text-[10px] text-slate-400">종합 면적 분석 대시보드 차트</span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={localOptions.summary}
                  onChange={(e) => setLocalOptions({ ...localOptions, summary: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">총괄면적표</span>
                  <span className="text-[10px] text-slate-400">부서별 면적 대비 요약 소계표</span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={localOptions.detail}
                  onChange={(e) => setLocalOptions({ ...localOptions, detail: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">층별면적표</span>
                  <span className="text-[10px] text-slate-400">세부면적계획의 B1~7F 각 층별 상세 테이블 (층별 새 페이지 구분)</span>
                </div>
              </label>
            </div>
            
            <div className="flex items-center gap-2 justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleExportPdf}
                disabled={!localOptions.dashboard && !localOptions.summary && !localOptions.detail}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                확인 (PDF 저장)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden layout for PDF Export - using absolute off-screen instead of hidden for Recharts sizing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
         <PrintableReport ref={componentRef} />
      </div>
    </div>
  );
}
