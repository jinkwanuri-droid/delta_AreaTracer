import { useEffect } from 'react';
import clsx from 'clsx';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/useAppStore';
import DetailTable, { FloorDetailPrintList } from '@/components/DetailTable';
import DepartmentSummary from '@/components/DepartmentSummary';
import Dashboard from '@/components/Dashboard';
import { initAuth } from '@/lib/auth';

export default function App() {
  const { fetchData, fetchGlobalSettings, activeTab, isPdfExportMode, pdfExportOptions } = useAppStore();

  useEffect(() => {
    // 1. Fetch Global Settings first for multi-device sync
    // 2. Then fetch data from Sheets
    const init = async () => {
      try {
        await fetchGlobalSettings();
        await fetchData();
      } catch (err) {
        console.warn("Initialization error caught in App.tsx:", err);
      }
    };
    init();
  }, [fetchGlobalSettings, fetchData]);

  useEffect(() => {
    // Initialize auth
    const unsubscribe = initAuth(
      () => fetchData(true), // Re-fetch when auth success
      () => {}
    );
    return () => unsubscribe();
  }, [fetchData]);

  return (
    <Layout>
      {isPdfExportMode ? (
        <div id="pdf-export-content" className="w-full bg-white text-slate-900 p-0 flex flex-col overflow-visible">
          {pdfExportOptions.dashboard && (
            <div className="w-full bg-white overflow-visible p-10 border-b border-slate-100">
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">1. 대시보드 요약분석</h2>
                <span className="text-xs font-bold text-slate-400 capitalize whitespace-nowrap">Hospital Area Plan Report</span>
              </div>
              <Dashboard />
            </div>
          )}
          
          {pdfExportOptions.summary && (
            <div className={clsx(
              "w-full bg-white overflow-visible p-10",
              pdfExportOptions.dashboard && "page-break"
            )}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">2. 부서별 총괄 면적분석표</h2>
                <span className="text-xs font-bold text-slate-400 capitalize whitespace-nowrap">Section Summary Table</span>
              </div>
              <DepartmentSummary />
            </div>
          )}
          
          {pdfExportOptions.detail && (
            <div className={clsx(
              "w-full bg-white overflow-visible p-10",
              (pdfExportOptions.dashboard || pdfExportOptions.summary) && "page-break"
            )}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">3. 세부 면적계획 (층별)</h2>
                <span className="text-xs font-bold text-slate-400 capitalize whitespace-nowrap">Detail Floor Plan Report</span>
              </div>
              <FloorDetailPrintList />
            </div>
          )}
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'detail' && <DetailTable />}
          {activeTab === 'summary' && <DepartmentSummary />}
        </>
      )}
    </Layout>
  );
}
