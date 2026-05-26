import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { QRCodeSVG } from 'qrcode.react';

export default function ReportCover() {
  const coverInfo = useAppStore(state => state.coverInfo);
  const stages = useAppStore(state => state.stages);
  const comparison = useAppStore(state => state.comparison);
  
  // Find target stage name
  const targetStage = stages.find(s => s.id === comparison.targetId) || stages[stages.length - 1];
  const stageName = targetStage ? targetStage.name : '진행단계';

  return (
    <div className="w-full bg-white relative font-['Pretendard_Variable',Pretendard,sans-serif]" style={{ height: '180mm', pageBreakAfter: 'always', breakAfter: 'page', overflow: 'hidden' }}>
      
      {/* Container to enforce alignment without page margins breaking layout */}
      <div className="absolute inset-0 w-full h-full" style={{ padding: '20mm 40mm' }}>
        
        {/* QR Code (Top Right) */}
        <div className="absolute top-[20mm] right-[calc(40mm-10px)] flex flex-col items-end gap-1.5">
          <QRCodeSVG value="https://delta-area.vercel.app" size={48} level="L" includeMargin={false} />
          <div className="font-[300] text-[7px] text-slate-500 tracking-wider">
            https://delta-area.vercel.app
          </div>
        </div>

        {/* Title Group (approx 35% from top) */}
        <div className="absolute top-[35%] left-0 w-full flex flex-col items-center justify-center">
          <h1 className="text-[35px] font-[900] tracking-tight text-slate-900 mb-6 text-center leading-none">
            경상남도 서부의료원 건립사업
          </h1>
          <div>
             <h2 className="text-[35px] font-[700] tracking-tight text-slate-900 text-center leading-none">
               {coverInfo.title}
             </h2>
          </div>
        </div>

        {/* Stage and Date (approx 65% from top) */}
        <div className="absolute top-[65%] left-0 w-full flex flex-col items-center gap-[6px]">
          <div className="px-5 font-[500] text-[16px] text-slate-800 text-center border border-slate-200 bg-slate-100 rounded-full" style={{ paddingTop: '5.5px', paddingBottom: '5.5px' }}>
            {stageName}
          </div>
          <div className="px-5 py-1 font-[300] text-[16px] text-slate-800 text-center">
            {coverInfo.date}
          </div>
        </div>

        {/* Client and Architect (15% from bottom -> 85% from top) */}
        <div className="absolute top-[85%] left-0 w-full flex justify-center items-center gap-4">
          <div className="font-[600] text-[16px] text-slate-800">
            {coverInfo.client}
          </div>
          <div className="w-[1px] h-[12px] bg-slate-400"></div>
          <div className="font-[600] text-[16px] text-slate-800 tracking-wide">
            해안건축
          </div>
        </div>
        
      </div>
    </div>
  );
}
