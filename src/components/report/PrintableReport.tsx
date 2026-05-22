import React, { useMemo, forwardRef } from 'react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { 
  ReportAreaByStageChart, 
  ReportDivisionPieChart, 
  ReportDivisionTrendChart 
} from './ReportCharts';

const PrintableReport = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const project = useAppStore(state => state.project);
  const options = useAppStore(state => state.pdfExportOptions);
  
  const stages = useAppStore(state => state.stages);
  const divisions = useAppStore(state => state.divisions);
  const departments = useAppStore(state => state.departments);
  const rooms = useAppStore(state => state.rooms);
  const values = useAppStore(state => state.values);
  const floors = useAppStore(state => state.floors);
  const floorAreasByStage = useAppStore(state => state.floorAreasByStage);
  const medicalOnly = useAppStore(state => state.medicalOnly);
  const comparison = useAppStore(state => state.comparison);

  const currentStage = stages[stages.length - 1];
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // --- LOGIC ---
  const medicalDivisionIds = useMemo(() => divisions.filter(d => /^\d+$/.test(d.id)).map(d => d.id), [divisions]);

  const areaByStage = useMemo(() => {
    return stages.map(stage => {
      const stageValues = values.filter(v => v.stageId === stage.id);
      
      const medicalStageValues = stageValues.filter(v => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return false;
        const roomNo = room.no.toUpperCase();
        if (roomNo.startsWith('P') || roomNo.startsWith('O')) return false;
        if (!medicalOnly) return true;
        const dept = departments.find(d => d.id === room.departmentId);
        return dept && medicalDivisionIds.includes(dept.divisionId);
      });
      const netTotal = medicalStageValues.reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      
      const parkingArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        return room.no.toUpperCase().startsWith('P') ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);

      const outdoorArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        return room.no.toUpperCase().startsWith('O') ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);
      
      const floorAreas = floorAreasByStage[stage.id] || {};
      const grossTotal = Object.entries(floorAreas).reduce((sum, [fid, val]) => fid === '_TOTAL_' ? sum : sum + (val as number || 0), 0);
      const finalGross = grossTotal || floorAreas['_TOTAL_'] || 0;
      
      const adjustedGross = finalGross - parkingArea - outdoorArea;
      const common = adjustedGross - netTotal;
      
      return {
        name: stage.name,
        net: netTotal,
        gross: finalGross,
        adjustedGross: adjustedGross,
        parking: parkingArea,
        outdoor: outdoorArea,
        other: parkingArea + outdoorArea,
        common: common,
      };
    });
  }, [stages, values, medicalOnly, medicalDivisionIds, rooms, departments, floorAreasByStage]);

  const filteredValuesOriginal = useMemo(() => {
    if (!medicalOnly) return values;
    return values.filter(v => {
      const room = rooms.find(r => r.id === v.roomId);
      const dept = room ? departments.find(d => d.id === room.departmentId) : null;
      return dept && medicalDivisionIds.includes(dept.divisionId);
    });
  }, [values, medicalOnly, rooms, departments, medicalDivisionIds]);

  const divisionData = useMemo(() => {
    if (!currentStage) return [];
    return divisions
      .filter(div => !medicalOnly || medicalDivisionIds.includes(div.id))
      .map(div => {
        const stageValues = filteredValuesOriginal.filter(v => v.stageId === currentStage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        return { name: div.name, id: div.id, value: area, color: div.color || '#cbd5e1' };
      })
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [divisions, medicalOnly, medicalDivisionIds, filteredValuesOriginal, currentStage, rooms, departments]);

  const stageDivisionData = useMemo(() => {
    return stages.map(stage => {
      const data: any = { name: stage.name };
      divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).forEach(div => {
        const stageValues = filteredValuesOriginal.filter(v => v.stageId === stage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        data[div.name] = area;
      });
      return data;
    });
  }, [stages, divisions, medicalOnly, medicalDivisionIds, filteredValuesOriginal, rooms, departments]);

  const formatNum = (val: number | undefined | null, sCode?: string) => {
    if (val === undefined || val === null || val === 0) return "-";
    if (sCode === 'A' || sCode === 'G') {
        return Math.round(val).toLocaleString('ko-KR');
    }
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getDetailDataByFloor = () => {
    const baseId = comparison.baseId || stages[0]?.id;
    const targetId = comparison.targetId || stages[stages.length - 1]?.id;

    const dataByFloor: Record<string, any[]> = {};

    floors.forEach(floor => {
        const floorRooms = rooms.filter(r => r.floorId === floor.id);
        const combinedData: any[] = [];
        let lastDeptId: string | null = null;
        let currentGroupSums: Record<string, number> = {};

        const sortedRooms = [...floorRooms].sort((a, b) => {
            const deptA = departments.find(d => d.id === a.departmentId);
            const deptB = departments.find(d => d.id === b.departmentId);
            if (deptA?.order !== deptB?.order) return (deptA?.order || 0) - (deptB?.order || 0);
            return a.no.localeCompare(b.no);
        });

        sortedRooms.forEach((r, idx) => {
            const dept = departments.find(d => d.id === r.departmentId);
            const div = divisions.find(dv => dv.id === dept?.divisionId);
            
            if (medicalOnly && !/^\d+$/.test(div?.id || "")) return;

            if (r.departmentId !== lastDeptId) {
                stages.forEach(s => currentGroupSums[s.id] = 0);
                combinedData.push({
                   id: `header-${r.departmentId}`,
                   isGroupHeader: true,
                   deptName: dept?.name || "기타",
                   deptColor: div?.color || "#6366f1"
                });
                lastDeptId = r.departmentId;
            }

            const row: any = { ...r, isSummary: false, deptColor: div?.color || "#6366f1" };
            stages.forEach(s => {
                const val = values.find(v => v.roomId === r.id && v.stageId === s.id);
                if (val) {
                    row[`${s.id}_total`] = val.unitArea * val.quantity;
                    row[`${s.id}_unitArea`] = val.unitArea;
                    row[`${s.id}_qty`] = val.quantity;
                    currentGroupSums[s.id] += row[`${s.id}_total`];
                } else {
                    row[`${s.id}_isEmpty`] = true;
                }
            });

            if (stages.length >= 2) {
                row.variance = (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
            }
            combinedData.push(row);

            const nextRoom = sortedRooms[idx + 1];
            if (nextRoom?.departmentId !== r.departmentId) {
                const summary: any = { 
                    id: `sum-${r.departmentId}`, 
                    isSummary: true, 
                    deptName: dept?.name || "", 
                    deptColor: div?.color || "#6366f1",
                    variance: (currentGroupSums[targetId] || 0) - (currentGroupSums[baseId] || 0)
                };
                stages.forEach(s => summary[`${s.id}_total`] = currentGroupSums[s.id]);
                combinedData.push(summary);
            }
        });

        if (combinedData.length > 0) {
            dataByFloor[floor.name] = combinedData;
        }
    });

    return dataByFloor;
  };

  const floorData = useMemo(() => getDetailDataByFloor(), [rooms, values, stages, floors, departments, divisions, medicalOnly, comparison]);

  return (
    <div ref={ref} className="print-container-root w-full bg-white text-slate-800 printable-mode" style={{ fontFamily: 'Pretendard, sans-serif' }}>
         <style>{`
        @media print {
          .printable-mode { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-break { page-break-after: always; break-after: page; }
          .detail-page-break { page-break-before: always; break-before: page; }
          .no-break { page-break-inside: avoid; break-inside: avoid; }
          @page { size: A3 landscape; margin: 15mm 10mm; }
          
          /* Header/Footer repetition logic */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          /* Hide things on screen if needed (though this component is hidden anyway) */
          .print-header-spacer { height: 20px; }
        }
        .stripe-pattern { background: repeating-linear-gradient(45deg, #f8fafc22, #f8fafc22 5px, #f1f5f922 5px, #f1f5f922 10px); }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        
        /* Table Layout Optimizations */
        .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .col-no { width: 50px; }
        .col-name { width: 220px; }
        .col-stage { width: 110px; } 
        .col-variance { width: 80px; }
        .col-note { width: 250px; } 
        
        .print-container-root { width: 1500px; margin: 0 auto; }
        
        /* Professional Typography */
        .report-title { font-size: 28px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a; }
        .report-subtitle { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
      `}</style>

      {/* 0. Dashboard SummarySnapshot */}
      {options.dashboard && (
        <div className="print-page w-full min-h-[190mm] page-break relative p-10" style={{ padding: '10mm' }}>
           <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6 mb-10 mt-2">
              <div>
                 <h2 className="report-subtitle mb-2">{project?.name || 'AREA ANALYSIS SYSTEM'}</h2>
                 <h1 className="report-title">분석 대시보드 종합 요약 리포트</h1>
              </div>
              <div className="text-right text-xs text-slate-500 font-bold leading-relaxed">
                 <p className="text-indigo-600 text-sm mb-1 tracking-widest">CONFIDENTIAL DOCUMENT</p>
                 <p className="flex justify-end gap-4 italic">
                    <span>DATE: {currentDate}</span>
                    <span>STAGE: {currentStage?.name}</span>
                 </p>
              </div>
           </div>

           <div className="space-y-12">
              <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">1. 프로젝트 단계별 통합 면적 변동 추이</h3>
                </div>
                <div className="flex justify-center">
                  <ReportAreaByStageChart data={areaByStage} width={1300} height={320} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">2. 부문별 면적 구성 비율 (현재 단계 기준)</h3>
                   </div>
                   <div className="flex justify-center">
                    <ReportDivisionPieChart 
                        data={divisionData} 
                        totalNetArea={areaByStage[areaByStage.length - 1]?.net || 0} 
                        width={600} 
                        height={380} 
                    />
                   </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">3. 부문별 단계별 면적 추이 분석</h3>
                   </div>
                   <div className="flex justify-center">
                    <ReportDivisionTrendChart 
                        data={stageDivisionData} 
                        divisions={divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id))}
                        width={600}
                        height={380}
                    />
                   </div>
                </div>
              </div>
           </div>
           
           <div className="absolute bottom-8 left-10 right-10 flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-widest border-t border-slate-100 pt-4">
              <span>HANA ARCHITECTURE · AREA ANALYSIS SYSTEM v1.3</span>
              <span>Proprietary and Confidential</span>
              <span>Page 01 of 03</span>
           </div>
        </div>
      )}
      
      {/* 1. Summary Report */}
      {options.summary && (
        <div className="print-page w-full min-h-[190mm] page-break relative p-10" style={{ padding: '8mm' }}>
           <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
              <div>
                 <h2 className="text-sm font-bold text-slate-500 mb-1">{project?.name || '면적분석 프로젝트'}</h2>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight">부서별 면적 총괄 요약계획표</h1>
              </div>
              <div className="text-right text-xs text-slate-500 font-bold italic">
                 <p className="text-indigo-600 mb-1">STAGE: {currentStage?.name}</p>
                 <p>REPORT DATE: {currentDate}</p>
              </div>
           </div>
           
           <table className="w-full text-xs border-collapse tabular-nums">
             <thead>
               <tr className="bg-slate-900 text-white">
                  <th className="py-4 px-4 text-center font-black border-r border-slate-700 w-32">부문</th>
                  <th className="py-4 px-4 text-center font-black border-r border-slate-700 w-32">부서코드</th>
                  <th className="py-4 px-4 text-left font-black border-r border-slate-700">부서명</th>
                  <th className="py-4 px-4 text-right font-black border-r border-slate-700 w-40">전용면적 (㎡)</th>
                  <th className="py-4 px-4 text-right font-black w-32">점유 비율 (%)</th>
               </tr>
             </thead>
             <tbody>
                {divisions.map(div => {
                   const divDepts = departments.filter(d => d.divisionId === div.id);
                   const deptRows = divDepts.map(dept => {
                      const deptRooms = rooms.filter(r => r.departmentId === dept.id);
                      const totalArea = deptRooms.reduce((acc, r) => {
                         const v = values.find(val => val.roomId === r.id && val.stageId === currentStage?.id);
                         return acc + (v ? v.unitArea * v.quantity : 0);
                      }, 0);
                      return { dept, totalArea };
                   }).filter(d => d.totalArea > 0);

                   const divTotal = deptRows.reduce((acc, d) => acc + d.totalArea, 0);
                   if (divTotal === 0) return null;

                   return (
                      <React.Fragment key={div.id}>
                         <tr className="border-b-2 border-slate-200 bg-slate-50 no-break">
                           <td className="py-3 px-4 text-center font-black text-slate-900 border-r border-slate-200">{div.name}</td>
                           <td colSpan={2} className="py-3 px-4 text-left font-black text-slate-400 border-r border-slate-200 uppercase tracking-widest text-[10px]">Division Sub-Total</td>
                           <td className="py-3 px-4 text-right font-black text-indigo-600 border-r border-slate-200 text-sm">
                             {divTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </td>
                           <td className="py-3 px-4 text-right font-bold text-slate-400 bg-slate-100/50">-</td>
                         </tr>
                         {deptRows.map(d => (
                            <tr key={d.dept.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors no-break">
                              <td className="py-2.5 px-4 text-center text-transparent border-r border-slate-200 select-none">.</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-500 font-mono border-r border-slate-200 leading-none">{d.dept.code}</td>
                              <td className="py-2.5 px-4 text-left font-bold text-slate-700 border-r border-slate-200">{d.dept.name}</td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-800 border-r border-slate-200">
                                {d.totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-400">
                                {((d.totalArea / divTotal) * 100).toFixed(1)}%
                              </td>
                            </tr>
                         ))}
                      </React.Fragment>
                   );
                })}
             </tbody>
           </table>
           <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-white font-black rounded-lg">HA</div>
                 <p>Generated for Internal Review Only</p>
              </div>
              <p>© 2024 Hana Architecture. ALL RIGHTS RESERVED.</p>
           </div>
        </div>
      )}

      {/* 2. Detail Data Report */}
      {options.detail && Object.keys(floorData).length > 0 && (
         <>
           {Object.entries(floorData).map(([floorName, rows], floorIdx) => (
             <div key={floorName} className={clsx("print-page w-full min-h-[190mm] relative p-8", floorIdx > 0 && "detail-page-break")} style={{ padding: '8mm 5mm' }}>
                <table className="report-table tabular-nums">
                   <thead style={{ display: 'table-header-group' }}>
                      {/* 1st Header Row: Project Info */}
                      <tr>
                         <th colSpan={2 + (stages.length * 3) + 2} className="text-left py-0 border-none">
                            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-6">
                               <div>
                                  <h2 className="text-xs font-bold text-indigo-500 mb-1 tracking-widest uppercase">{project?.name || 'AREA ANALYSIS PROJECT'}</h2>
                                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter">실별 세부 면적계획표 <span className="text-indigo-600">[{floorName}]</span></h1>
                               </div>
                               <div className="text-right text-[11px] text-slate-500 font-bold leading-relaxed italic">
                                  <p>FLOOR SECTION: {floorName}</p>
                                  <p>PRINT DATE: {currentDate}</p>
                               </div>
                            </div>
                         </th>
                      </tr>
                      {/* 2nd Header Row: Main Groups */}
                      <tr className="bg-slate-900 text-white text-[11px] border-b border-slate-700">
                         <th className="border-r border-slate-700 col-no" rowSpan={2}>NO.</th>
                         <th className="border-r border-slate-700 text-left px-3 col-name" rowSpan={2}>실 명칭 (ROOM NAME)</th>
                         
                         {stages.map(s => (
                            <th key={s.id} colSpan={3} className="border-r border-slate-700 py-2 text-center font-black uppercase tracking-tight col-stage">
                               <div className="flex items-center justify-center gap-2">
                                  {s.code && (
                                     <span className={clsx(
                                        "inline-flex items-center justify-center text-[10px] font-black w-5 h-5 rounded-md",
                                        s.id === currentStage.id ? "bg-indigo-600 text-white" : "bg-white text-slate-900"
                                     )}>
                                        {s.code}
                                     </span>
                                  )}
                                  <span>{s.name}</span>
                               </div>
                            </th>
                         ))}

                         <th rowSpan={2} className="border-r border-slate-700 col-variance">증감</th>
                         <th rowSpan={2} className="text-left px-3 col-note font-black">비고 (NOTE)</th>
                      </tr>
                      {/* 3rd Header Row: Subunits */}
                      <tr className="bg-slate-800 text-white text-[9px] font-bold border-b border-slate-600">
                         {stages.map(s => (
                            <React.Fragment key={`${s.id}-sub`}>
                               <th className="border-r border-slate-700 py-1.5 text-center" style={{ width: '38px' }}>Net</th>
                               <th className="border-r border-slate-700 py-1.5 text-center" style={{ width: '28px' }}>Qty</th>
                               <th className="border-r border-slate-700 py-1.5 text-center bg-slate-700/50" style={{ width: '44px' }}>Total</th>
                            </React.Fragment>
                         ))}
                      </tr>
                   </thead>
                   
                   <tbody>
                      <tr className="h-4" aria-hidden="true"><td colSpan={2 + (stages.length * 3) + 2} className="border-none"></td></tr>
                      {rows.map((row: any, rIdx: number) => {
                         if (row.isGroupHeader) {
                            return (
                               <tr key={row.id} className="bg-slate-50 border-y-2 border-slate-200 no-break">
                                  <td colSpan={2 + (stages.length * 3) + 2} className="py-3 px-4">
                                     <div className="flex items-center">
                                        <div className="w-2 h-5 rounded-sm mr-3" style={{ backgroundColor: row.deptColor }} />
                                        <span className="font-black text-[13px] text-slate-800 tracking-tight uppercase">[{row.deptName}]</span>
                                     </div>
                                  </td>
                               </tr>
                            );
                         }

                         if (row.isSummary) {
                            return (
                               <tr key={row.id} className="bg-indigo-50 border-b border-indigo-100 no-break font-black text-indigo-900">
                                  <td colSpan={2} className="py-2.5 px-4 text-right font-black uppercase text-[11px] tracking-widest text-indigo-400">Section Total</td>
                                  {stages.map(s => (
                                     <React.Fragment key={`${s.id}-sum`}>
                                        <td className="border-r border-indigo-100" />
                                        <td className="border-r border-indigo-100" />
                                        <td className="py-2 px-1 text-right border-r border-indigo-200 bg-indigo-100/30 text-xs">
                                           {formatNum(row[`${s.id}_total`], s.code)}
                                        </td>
                                     </React.Fragment>
                                  ))}
                                  <td className={clsx(
                                     "py-2 px-1 text-right border-r border-indigo-200 text-xs",
                                     row.variance > 0 ? "text-blue-700" : row.variance < 0 ? "text-red-600" : "text-indigo-300"
                                  )}>
                                     {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                                  </td>
                                  <td className="bg-indigo-50" />
                               </tr>
                            );
                         }

                         return (
                            <tr key={rIdx} className="border-b border-slate-100 no-break group hover:bg-slate-50 transition-colors">
                               <td className="py-2 px-1 text-center font-mono text-[9px] text-slate-400 border-r border-slate-100">{row.no}</td>
                               <td className="py-2 px-3 text-left font-black text-slate-800 border-r border-slate-200 text-[11.5px] leading-tight" title={row.name}>
                                  {row.name}
                                  {row.isNew && <span className="ml-2 text-[8px] bg-emerald-500 text-white px-1 rounded-sm">NEW</span>}
                               </td>
                               {stages.map(s => {
                                  const isEmpty = row[`${s.id}_isEmpty`];
                                  if (isEmpty) return (
                                     <React.Fragment key={`${s.id}-val`}>
                                        <td className="border-r border-slate-100 stripe-pattern" />
                                        <td className="border-r border-slate-100 stripe-pattern" />
                                        <td className="border-r border-slate-100 stripe-pattern" />
                                     </React.Fragment>
                                  );

                                  return (
                                     <React.Fragment key={`${s.id}-val`}>
                                        <td className="py-2 px-1 text-right text-slate-500 font-mono text-[9px] border-r border-slate-100">
                                           {formatNum(row[`${s.id}_unitArea`], s.code)}
                                        </td>
                                        <td className="py-2 px-1 text-right text-slate-500 font-mono text-[9px] border-r border-slate-100">
                                           {row[`${s.id}_qty`]}
                                        </td>
                                        <td className={clsx(
                                           "py-2 px-1 text-right font-black border-r border-slate-200 text-[10px]",
                                           s.id === currentStage.id ? "bg-indigo-50/40 text-indigo-900" : "text-slate-700"
                                        )}>
                                           {formatNum(row[`${s.id}_total`], s.code)}
                                        </td>
                                     </React.Fragment>
                                  );
                               })}
                               <td className={clsx(
                                  "py-2 px-1 text-right font-black border-r border-slate-200 text-[10px]",
                                  row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-300"
                               )}>
                                  {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                               </td>
                               <td className="py-2 px-3 text-left text-slate-500 text-[10px] leading-tight font-medium">
                                  {row.note}
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>

                   <tfoot style={{ display: 'table-footer-group' }}>
                      <tr>
                         <td colSpan={2 + (stages.length * 3) + 2} className="pt-10">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-black border-t-2 border-slate-100 pt-6 uppercase tracking-widest">
                               <div className="flex items-center gap-4">
                                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded shadow-sm">CONFIDENTIAL</span>
                                  <span>HANA ARCHITECTURE DESIGN GROUP</span>
                               </div>
                               <div className="flex gap-10">
                                  <span>INTERNAL USE ONLY</span>
                                  <span>STAGE: {currentStage?.name}</span>
                                  <span>PAGE: {floorIdx + 2} </span>
                               </div>
                            </div>
                         </td>
                      </tr>
                   </tfoot>
                </table>
             </div>
           ))}
         </>
      )}
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';
export default PrintableReport;
