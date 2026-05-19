import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/useAppStore';
import DetailTable from '@/components/DetailTable';
import DepartmentSummary from '@/components/DepartmentSummary';
import { initAuth } from '@/lib/auth';

export default function App() {
  const { fetchData, activeTab } = useAppStore();

  useEffect(() => {
    // Initialize auth
    const unsubscribe = initAuth(
      () => fetchData(true), // Re-fetch when auth success
      () => {}
    );
    return () => unsubscribe();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Layout>
      {activeTab === 'detail' && <DetailTable />}
      {activeTab === 'summary' && <DepartmentSummary />}
      {activeTab === 'dashboard' && <div className="p-4 bg-white rounded shadow-sm">대시보드 (예정)</div>}
    </Layout>
  );
}
