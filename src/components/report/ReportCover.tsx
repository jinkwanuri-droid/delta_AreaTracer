import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ReportCover() {
  const coverInfo = useAppStore(state => state.coverInfo);
  const stages = useAppStore(state => state.stages);
  const comparison = useAppStore(state => state.comparison);
  
  // Find target stage name
  const targetStage = stages.find(s => s.id === comparison.targetId) || stages[stages.length - 1];
  const stageName = targetStage ? targetStage.name : '진행단계';

  return (
    <div className="w-full bg-white relative font-['Pretendard_Variable',Pretendard,sans-serif]" style={{ height: '185mm', pageBreakAfter: 'always', breakAfter: 'page', overflow: 'hidden' }}>
      
      {/* Container to enforce center alignment without page margins breaking absolute positioning */}
      <div className="absolute inset-0 w-full h-full flex flex-col justify-between" style={{ padding: '20mm 40mm' }}>
        
        {/* Top spacer */}
        <div />

        {/* Center Group (approx 40% from top adjusted by spacer) */}
        <div className="flex flex-col items-center justify-center w-full mt-[-20mm]">
          <h1 className="text-[44px] font-[700] tracking-tight text-slate-900 mb-6 text-center leading-none">
            경상남도 서부의료원 건립사업
          </h1>
          <div className="mb-12">
            <h2 className="text-[44px] font-[700] tracking-tight text-slate-900 text-center leading-none">
              {coverInfo.title}
            </h2>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="px-6 py-2 rounded-full border border-slate-300 font-[300] text-[20px] text-slate-800 text-center shadow-sm">
              {stageName}
            </div>
            <div className="px-6 py-1 font-[300] text-[20px] text-slate-800 text-center">
              {coverInfo.date}
            </div>
          </div>
        </div>

        {/* Bottom Row Group */}
        <div className="flex justify-between items-end w-full mb-[10mm]">
          <div className="font-[500] text-[16px] text-slate-800 text-center">
            {coverInfo.client}
          </div>
          <div className="font-[500] text-[16px] text-slate-800 tracking-wide text-center">
            해안건축
          </div>
        </div>
        
      </div>
    </div>
  );
}
