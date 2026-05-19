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
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    setIsPdfExportMode(true);
    
    // Allow React to re-render without virtualization etc
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const tableEl = document.getElementById('pdf-export-table');
      if (!tableEl) {
        alert('출력할 표를 찾을 수 없습니다.');
        return;
      }
      
      const el = tableEl.parentElement as HTMLElement;
      if (!el) return;

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
            body { background: white; margin: 0; padding: 20px; font-family: 'Inter', sans-serif; }
            #pdf-export-table { width: 100% !important; max-width: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .sticky { position: static !important; }
          </style>
        </head>
        <body>
          ${el.outerHTML}
        </body>
        </html>
      `;

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
      a.download = `export_${activeTab}_${Date.now()}.pdf`;
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
              label="CURRENT STAGE"
              options={stages}
              value={comparison.targetId || ""}
              onChange={(val) => setComparisonStages(comparison.baseId, val)}
              icon={<Layers size={14} />}
              className="bg-indigo-50/50 border-indigo-100 shadow-indigo-100/20"
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
                onClick={handleExportPdf} 
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
    </div>
  );
}
