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
    <div className="w-full bg-white relative font-['Pretendard_Variable',Pretendard,sans-serif]" style={{ height: '185mm', pageBreakAfter: 'always', breakAfter: 'page', overflow: 'hidden' }}>
      
      {/* Container to enforce alignment without page margins breaking layout */}
      <div className="absolute inset-0 w-full h-full" style={{ padding: '20mm 40mm' }}>
        
        {/* QR Code (Top Right) */}
        <div className="absolute top-[20mm] right-[40mm] flex flex-col items-end gap-1.5">
          <QRCodeSVG value="https://delta-area.vercel.app" size={48} level="L" includeMargin={false} />
          <div className="font-[300] text-[8px] text-slate-500 tracking-wider">
            https://delta-area.vercel.app
          </div>
        </div>

        {/* Title Group (approx 40% from top) */}
        <div className="absolute top-[40%] left-0 w-full flex flex-col items-center justify-center">
          <h1 className="text-[44px] font-[700] tracking-tight text-slate-900 mb-6 text-center leading-none">
            경상남도 서부의료원 건립사업
          </h1>
          <div>
             <h2 className="text-[44px] font-[700] tracking-tight text-slate-900 text-center leading-none">
               {coverInfo.title}
             </h2>
          </div>
        </div>

        {/* Stage and Date (approx 60% from top, which is 40% from bottom) */}
        <div className="absolute top-[60%] left-0 w-full flex flex-col items-center gap-4">
          <div className="px-5 py-1.5 rounded-full bg-slate-100 font-[400] text-[16px] text-slate-800 text-center border border-slate-200">
            {stageName}
          </div>
          <div className="px-5 py-1 font-[400] text-[16px] text-slate-800 text-center">
            {coverInfo.date}
          </div>
        </div>

        {/* Client and Architect (20% from bottom -> 80% from top) */}
        <div className="absolute top-[80%] left-0 w-full flex justify-center items-center gap-4">
          <div className="font-[500] text-[14px] text-slate-800">
            {coverInfo.client}
          </div>
          <div className="w-[1px] h-[12px] bg-slate-300"></div>
          <div className="font-[500] text-[14px] text-slate-800 tracking-wide">
            해안건축
          </div>
        </div>
        
      </div>
    </div>
  );
}
