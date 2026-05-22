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
          @page { size: A3 landscape; margin: 10mm; }
        }
        .stripe-pattern { background: repeating-linear-gradient(45deg, #f8fafc22, #f8fafc22 5px, #f1f5f922 5px, #f1f5f922 10px); }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* 0. Dashboard SummarySnapshot */}
      {options.dashboard && (
        <div className="print-page w-full min-h-[190mm] page-break relative p-8" style={{ padding: '10mm' }}>
           <div className="flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-8 mt-2">
              <div>
                 <h2 className="text-sm font-bold text-slate-400 mb-1 tracking-wider uppercase">{project?.name || 'AREA ANALYSIS SYSTEM'}</h2>
                 <h1 className="text-2xl font-black text-slate-900 tracking-tighter">분석 대시보드 요약 보고</h1>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-medium">
                 <p className="font-bold text-indigo-600">Confidential Report</p>
                 <p>Date: {currentDate}</p>
              </div>
           </div>

           <div className="space-y-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                   <h3 className="text-base font-black text-slate-800 tracking-tight">1. 단계별 면적 추이 (전용/공용)</h3>
                </div>
                <ReportAreaByStageChart data={areaByStage} width={1100} height={240} />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                      <h3 className="text-base font-black text-slate-800 tracking-tight">2. 부문별 면적 비중 리포트 (현재단계)</h3>
                   </div>
                   <ReportDivisionPieChart 
                      data={divisionData} 
                      totalNetArea={areaByStage[areaByStage.length - 1]?.net || 0} 
                      width={520} 
                      height={300} 
                   />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                      <h3 className="text-base font-black text-slate-800 tracking-tight">3. 단계별 부문별 면적 상세 추이</h3>
                   </div>
                   <ReportDivisionTrendChart 
                      data={stageDivisionData} 
                      divisions={divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id))}
                      width={520}
                      height={300}
                   />
                </div>
              </div>
           </div>
        </div>
      )}
      
      {/* 1. Summary Report */}
      {options.summary && (
        <div className="print-page w-full min-h-[190mm] page-break relative p-8" style={{ padding: '5mm' }}>
           <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-4">
              <div>
                 <h2 className="text-xs font-bold text-slate-500 mb-0.5">{project?.name || '면적분석 프로젝트'}</h2>
                 <h1 className="text-xl font-black text-slate-900 tracking-tight">부서별 총괄 요약표</h1>
              </div>
              <div className="text-right text-[9px] text-slate-500 font-medium">
                 <p>Stage: {currentStage?.name}</p>
                 <p>Date: {currentDate}</p>
              </div>
           </div>
           
           <table className="w-full text-[10.5px] border-collapse tabular-nums" style={{ pageBreakInside: 'auto' }}>
             <thead className="bg-slate-100" style={{ display: 'table-header-group' }}>
               <tr className="border-b border-slate-300">
                  <th className="py-2 px-3 text-center font-black text-slate-700 border-r border-slate-200">부문</th>
                  <th className="py-2 px-3 text-center font-black text-slate-700 border-r border-slate-200">부서코드</th>
                  <th className="py-2 px-3 text-left font-black text-slate-700 border-r border-slate-200">부서명</th>
                  <th className="py-2 px-3 text-right font-black text-slate-700 border-r border-slate-200">전용면적(㎡)</th>
                  <th className="py-2 px-3 text-right font-black text-slate-700">비율(%)</th>
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
                         <tr className="border-b border-t-2 border-t-slate-200 border-b-slate-200 bg-slate-50" style={{ pageBreakInside: 'avoid' }}>
                           <td className="py-1.5 px-3 text-center font-black text-slate-800 border-r border-slate-200">{div.name}</td>
                           <td colSpan={2} className="py-1.5 px-3 text-left font-bold text-slate-500 border-r border-slate-200">부문 소계</td>
                           <td className="py-1.5 px-3 text-right font-black text-slate-800 border-r border-slate-200">
                             {divTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </td>
                           <td className="py-1.5 px-3 text-right font-bold text-slate-500">-</td>
                         </tr>
                         {deptRows.map(d => (
                            <tr key={d.dept.id} className="border-b border-slate-100" style={{ pageBreakInside: 'avoid' }}>
                              <td className="py-1 px-3 text-center text-transparent border-r border-slate-200 select-none">.</td>
                              <td className="py-1 px-3 text-center font-medium text-slate-500 font-mono border-r border-slate-200">{d.dept.code}</td>
                              <td className="py-1 px-3 text-left font-bold text-slate-700 border-r border-slate-200">{d.dept.name}</td>
                              <td className="py-1 px-3 text-right font-semibold text-slate-800 border-r border-slate-200">
                                {d.totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-1 px-3 text-right font-medium text-slate-500">
                                {((d.totalArea / divTotal) * 100).toFixed(1)}%
                              </td>
                            </tr>
                         ))}
                      </React.Fragment>
                   );
                })}
             </tbody>
           </table>
        </div>
      )}

      {/* 2. Detail Data Report */}
      {options.detail && Object.keys(floorData).length > 0 && (
         <>
           {Object.entries(floorData).map(([floorName, rows], floorIdx) => (
             <div key={floorName} className={clsx("print-page w-full min-h-[190mm] relative p-8", floorIdx > 0 && "detail-page-break")} style={{ padding: '5mm' }}>
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-3">
                   <div>
                      <h2 className="text-[11px] font-bold text-slate-500 mb-0.5">{project?.name || '면적분석 프로젝트'}</h2>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">전체 세부 면적계획표 [{floorName}]</h1>
                   </div>
                   <div className="text-right text-[9px] text-slate-500 font-medium">
                      <p>Floors: {floorName}</p>
                      <p>Date: {currentDate}</p>
                   </div>
                </div>

                <table className="w-full text-[10px] border-collapse tabular-nums" style={{ tableLayout: 'fixed' }}>
                   <thead className="bg-slate-100" style={{ display: 'table-header-group' }}>
                      {/* Top Group Headers (Stages) */}
                      <tr className="border-b border-slate-300">
                         <th className="border-r border-slate-300" style={{ width: '40px' }} rowSpan={2}>NO.</th>
                         <th className="border-r border-slate-300 text-left px-2" style={{ width: '130px' }} rowSpan={2}>ROOM NAME</th>
                         
                         {stages.map(s => (
                            <th key={s.id} colSpan={3} className="border-r border-slate-300 py-1 text-center font-bold bg-slate-200/50">
                               <div className="flex items-center justify-center gap-1.5">
                                  {s.code && (
                                     <span className={clsx(
                                        "inline-flex items-center justify-center text-[9px] font-black w-4 h-4 rounded-md border",
                                        s.id === currentStage.id ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-500 border-slate-300"
                                     )}>
                                        {s.code}
                                     </span>
                                  )}
                                  <span className="text-[10px] truncate">{s.name}</span>
                               </div>
                            </th>
                         ))}

                         <th rowSpan={2} className="border-r border-slate-300" style={{ width: '60px' }}>증감</th>
                         <th rowSpan={2} className="text-left px-2">NOTE</th>
                      </tr>
                      {/* Sub Headers (Net, Qty, Total) */}
                      <tr className="border-b border-slate-300 text-[9px] bg-slate-50">
                         {stages.map(s => (
                            <React.Fragment key={`${s.id}-sub`}>
                               <th className="border-r border-slate-200 py-0.5 text-center font-medium">Net</th>
                               <th className="border-r border-slate-200 py-0.5 text-center font-medium">Qty</th>
                               <th className="border-r border-slate-300 py-0.5 text-center bg-slate-100/50">Total</th>
                            </React.Fragment>
                         ))}
                      </tr>
                   </thead>
                   <tbody>
                      {rows.map((row: any, rIdx: number) => {
                         if (row.isGroupHeader) {
                            return (
                               <tr key={row.id} className="bg-slate-50 border-b border-slate-300 no-break">
                                  <td colSpan={2 + (stages.length * 3) + 2} className="py-1.5 px-3">
                                     <div className="flex items-center">
                                        <div className="w-1.5 h-3.5 rounded-full mr-2" style={{ backgroundColor: row.deptColor }} />
                                        <span className="font-extrabold text-[11px] text-slate-800 tracking-tight uppercase">[{row.deptName}]</span>
                                     </div>
                                  </td>
                               </tr>
                            );
                         }

                         if (row.isSummary) {
                            return (
                               <tr key={row.id} className="bg-indigo-50/40 border-b border-slate-300 no-break font-bold text-indigo-900">
                                  <td colSpan={2} className="py-1 px-3 text-right font-black uppercase text-[10px]">[{row.deptName} 소계]</td>
                                  {stages.map(s => (
                                     <React.Fragment key={`${s.id}-sum`}>
                                        <td className="border-r border-slate-200" />
                                        <td className="border-r border-slate-200" />
                                        <td className="py-1 px-1 text-right border-r border-slate-300">
                                           {formatNum(row[`${s.id}_total`], s.code)}
                                        </td>
                                     </React.Fragment>
                                  ))}
                                  <td className={clsx(
                                     "py-1 px-1 text-right border-r border-slate-300",
                                     row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                                  )}>
                                     {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                                  </td>
                                  <td />
                               </tr>
                            );
                         }

                         return (
                            <tr key={rIdx} className="border-b border-slate-200 no-break hover:bg-slate-50/50 transition-colors">
                               <td className="py-1 px-1 text-center font-mono text-[9px] text-slate-500 border-r border-slate-200">{row.no}</td>
                               <td className="py-1 px-2 text-left font-bold text-slate-800 border-r border-slate-300 truncate text-[10.5px] leading-tight" title={row.name}>
                                  {row.name}
                               </td>
                               {stages.map(s => {
                                  const isEmpty = row[`${s.id}_isEmpty`];
                                  if (isEmpty) return (
                                     <React.Fragment key={`${s.id}-val`}>
                                        <td className="border-r border-slate-200 stripe-pattern" />
                                        <td className="border-r border-slate-200 stripe-pattern" />
                                        <td className="border-r border-slate-300 stripe-pattern" />
                                     </React.Fragment>
                                  );

                                  return (
                                     <React.Fragment key={`${s.id}-val`}>
                                        <td className="py-1 px-1 text-right text-slate-500 font-mono text-[9px] border-r border-slate-200">
                                           {formatNum(row[`${s.id}_unitArea`], s.code)}
                                        </td>
                                        <td className="py-1 px-1 text-right text-slate-500 font-mono text-[9px] border-r border-slate-200">
                                           {row[`${s.id}_qty`]}
                                        </td>
                                        <td className={clsx(
                                           "py-1 px-1 text-right font-black border-r border-slate-300",
                                           s.id === currentStage.id ? "bg-indigo-50/20 text-indigo-900" : "text-slate-700"
                                        )}>
                                           {formatNum(row[`${s.id}_total`], s.code)}
                                        </td>
                                     </React.Fragment>
                                  );
                               })}
                               <td className={clsx(
                                  "py-1 px-1 text-right font-black border-r border-slate-300",
                                  row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                               )}>
                                  {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                               </td>
                               <td className="py-1 px-2 text-left text-slate-500 text-[8.5px] truncate leading-tight" title={row.note}>
                                  {row.note}
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
                <div className="mt-4 text-right text-[8px] text-slate-300 font-medium">
                   INTERNAL USE ONLY · Data is automatically synchronized with Google Sheets
                </div>
             </div>
           ))}
         </>
      )}
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';
export default PrintableReport;
