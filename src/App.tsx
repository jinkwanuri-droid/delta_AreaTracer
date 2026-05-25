import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/useAppStore';
import DetailTable from '@/components/DetailTable';
import DepartmentSummary from '@/components/DepartmentSummary';
import Dashboard from '@/components/Dashboard';
import PrintableReport from '@/components/report/PrintableReport';
import ReportCover from '@/components/report/ReportCover';
import { initAuth } from '@/lib/auth';

export default function App() {
  const { fetchData, fetchGlobalSettings, activeTab, isPdfExportMode, pdfExportTargets } = useAppStore();

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

  // Determine if components should be printed
  const printCover = isPdfExportMode && pdfExportTargets?.includes('cover');
  const printDashboard = isPdfExportMode && pdfExportTargets?.includes('dashboard');

  return (
    <Layout>
      {isPdfExportMode ? (
        <>
          {printCover && <ReportCover />}
          {printDashboard && <Dashboard />}
          <PrintableReport />
        </>
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
