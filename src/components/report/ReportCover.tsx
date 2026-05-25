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
    <div className="print-page relative w-full flex flex-col bg-white printable-container font-['Pretendard_Variable',Pretendard,sans-serif]" style={{ minHeight: '175mm', boxSizing: 'border-box' }}>
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        .printable-container { width: 100%; max-width: none; padding: 0; margin: 0; }
        .print-page { page-break-after: always; page-break-inside: avoid; }
      `}</style>

      {/* Center Group */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-[28px] font-black tracking-tight text-slate-900 mb-3">
          경상남도 서부의료원 건립사업
        </h1>
        <div className="bg-[#cdcdcd] px-8 py-3 mb-10 w-fit shadow-sm">
          <h2 className="text-[36px] font-black tracking-tight text-slate-900 text-center leading-none">
            {coverInfo.title}
          </h2>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-[#cdcdcd] px-8 py-1.5 w-fit font-bold text-[18px] text-slate-900 text-center shadow-sm">
            {stageName}
          </div>
          <div className="bg-[#cdcdcd] px-8 py-1.5 w-fit font-bold text-[18px] text-slate-900 text-center shadow-sm">
            {coverInfo.date}
          </div>
        </div>
      </div>

      {/* Bottom Row Group */}
      <div className="absolute bottom-[30mm] left-[60mm] right-[60mm] flex justify-between items-end">
        <div className="bg-[#cdcdcd] px-8 py-1.5 w-fit font-bold text-[20px] text-slate-900 text-center shadow-sm">
          {coverInfo.client}
        </div>
        <div className="text-slate-900 font-extrabold text-[22px] tracking-norm">
          해안건축
        </div>
      </div>
    </div>
  );
}
