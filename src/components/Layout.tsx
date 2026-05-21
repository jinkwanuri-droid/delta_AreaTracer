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
  const pdfExportOptions = useAppStore(state => state.pdfExportOptions);
  const setPdfExportOptions = useAppStore(state => state.setPdfExportOptions);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState({
    dashboard: true,
    summary: true,
    detail: true
  });

  const handleExportPdf = async () => {
    // Apply options first
    setPdfExportOptions(localOptions);
    setIsModalOpen(false);
    setIsExporting(true);
    setIsPdfExportMode(true);
    
    // Allow React to re-render without virtualization etc
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const tableEl = document.getElementById('pdf-export-content');
      if (!tableEl) {
        alert('출력할 콘텐츠를 찾을 수 없습니다.');
        return;
      }
      
      const el = tableEl.cloneNode(true) as HTMLElement;
      
      // Remove interactive elements from cloned content to ensure clean PDF
      el.querySelectorAll('button, input, select, [role="button"]').forEach(item => {
        // If it's a checkbox we want to keep its state but hide the actual input element if possible
        // but for simplicity let's just hide common UI buttons
        if (item.tagName === 'BUTTON') item.remove();
      });

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          ${styles}
          <style>
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-gov.min.css');
            
            body { 
              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
              color: #1a202c !important;
            }
            
            @media print {
              @page {
                size: A4 landscape;
                margin: 0mm !important;
              }
              body { 
                background: white; 
                margin: 0; 
                padding: 0;
                font-family: 'Pretendard', sans-serif !important;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              
              #pdf-export-content {
                width: 297mm !important;
                background: white !important;
                container-type: inline-size;
              }

              .page-break {
                break-before: page !important;
                page-break-before: always !important;
                margin-top: 0 !important;
                padding-top: 20mm !important; /* Adding padding to top of new pages */
              }

              h2 {
                font-size: 16pt !important;
                color: #0f172a !important;
                font-weight: 900 !important;
              }

              .text-xs.font-bold.text-slate-400.capitalize {
                font-size: 8pt !important;
                color: #94a3b8 !important;
              }

              table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                font-size: 1.1cqw !important; /* Variable font size for table content */
              }

              th {
                font-size: 1.15cqw !important; /* Slightly larger for headers */
              }

              th, td {
                word-break: break-all !important;
                padding: 4px 6px !important;
              }

              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              thead {
                display: table-header-group !important;
              }

              /* Hide interactive elements and excess margins */
              .no-print, button, .lucide-rotate-ccw, .lucide-filter, .lucide-settings {
                display: none !important;
              }

              /* Flatten shadows for PDF */
              .shadow-sm, .shadow, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
                shadow: none !important;
                box-shadow: none !important;
              }

              /* Ensure chart containers keep aspect ratio */
              .recharts-responsive-container {
                width: 100% !important;
                height: 300px !important;
              }
            }
          </style>
        </head>
        <body class="bg-white">
          ${el.outerHTML}
        </body>
        </html>
      `;

      // Use modern A4 landscape dimensions
      const width = '297mm';
      const height = '210mm';

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent, width, height })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF from server');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hospital_area_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('PDF Export 중에 오류가 발생했습니다.');
    } finally {
      setIsPdfExportMode(false);
      setIsExporting(false);
    }
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
    </div>
  );
}
