import React, { useMemo, forwardRef } from 'react';
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

  const currentStage = stages[stages.length - 1];
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // --- REPLICATE DASHBOARD CALCULATION LOGIC ---
  const medicalDivisionIds = useMemo(() => divisions.slice(0, 5).map(d => d.id), [divisions]);

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
      const grossTotal = Object.entries(floorAreas).reduce((sum, [fid, val]) => fid === '_TOTAL_' ? sum : sum + (val || 0), 0);
      const finalGross = grossTotal || floorAreas['_TOTAL_'] || 0;
      
      // GN Ratio = (Gross - Parking - Outdoor) / Net
      // User requested: Exclude Parking/Outdoor from both when medical filter is on (and generally they are deducted gross)
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

  const filteredValues = useMemo(() => {
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
        const stageValues = filteredValues.filter(v => v.stageId === currentStage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        return { name: div.name, id: div.id, value: area, color: div.color || '#cbd5e1' };
      })
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [divisions, medicalOnly, medicalDivisionIds, filteredValues, currentStage, rooms, departments]);

  const stageDivisionData = useMemo(() => {
    return stages.map(stage => {
      const data: any = { name: stage.name };
      divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).forEach(div => {
        const stageValues = filteredValues.filter(v => v.stageId === stage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        data[div.name] = area;
      });
      return data;
    });
  }, [stages, divisions, medicalOnly, medicalDivisionIds, filteredValues, rooms, departments]);

  // --- END CALCULATION LOGIC ---

  // Generate Detail Table Rows
  const getDetailRows = () => {
    if (!currentStage) return [];
    
    const rows: any[] = [];
    const stageValues = values.filter(v => v.stageId === currentStage.id);

    floors.forEach(floor => {
        const floorRooms = rooms.filter(r => r.floorId === floor.id);
        if (floorRooms.length === 0) return;

        divisions.forEach(div => {
            const divDepts = departments.filter(d => d.divisionId === div.id);
            divDepts.forEach(dept => {
                const deptRooms = floorRooms.filter(r => r.departmentId === dept.id);
                
                deptRooms.forEach(room => {
                    const rv = stageValues.find(v => v.roomId === room.id);
                    if (rv && rv.quantity > 0) {
                        rows.push({
                            floorName: floor.name,
                            divName: div.name,
                            deptName: dept.name,
                            roomNo: room.no,
                            roomName: room.name,
                            qty: rv.quantity,
                            unitArea: rv.unitArea,
                            totalArea: rv.unitArea * rv.quantity,
                            note: room.note || ''
                        });
                    }
                });
            });
        });
    });

    return rows;
  };

  const detailRows = useMemo(() => getDetailRows(), [rooms, values, currentStage, floors, divisions, departments]);

  return (
    <div ref={ref} className="print-container-root w-full bg-white text-slate-800" style={{ fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 0. Dashboard Summary Snapshot */}
      {options.dashboard && (
        <div className="print-page w-full min-h-[295mm] page-break relative p-12" style={{ padding: '15mm' }}>
           <div className="flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-10 mt-4">
              <div>
                 <h2 className="text-base font-bold text-slate-400 mb-1 tracking-wider uppercase">{project?.name || 'AREA ANALYSIS SYSTEM'}</h2>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tighter">분석 대시보드 요약 보고</h1>
              </div>
              <div className="text-right text-xs text-slate-500 font-medium">
                 <p className="font-bold text-indigo-600">Confidential Report</p>
                 <p>Date: {currentDate}</p>
                 <p>Project ID: {project?.id || 'P1'}</p>
              </div>
           </div>

           <div className="space-y-12">
              {/* Section 1: Phase Area Trends */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                   <h3 className="text-lg font-black text-slate-800 tracking-tight">1. 단계별 면적 추이 (전용/공용)</h3>
                </div>
                <ReportAreaByStageChart data={areaByStage} width={900} height={260} />
                <p className="text-[10px] text-slate-400 mt-2 text-center">* 각 단계별 연면적 산식 및 전용/공용 비율을 가시화한 지표입니다.</p>
              </div>

              {/* Section 2: Division Distribution */}
              <div className="grid grid-cols-1 gap-8 pt-4">
                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">2. 부문별 면적 비중 리포트 (현재단계)</h3>
                   </div>
                   <ReportDivisionPieChart 
                      data={divisionData} 
                      totalNetArea={currentStage?.net || 0} 
                      width={900} 
                      height={340} 
                   />
                </div>
              </div>

              {/* Section 3: Division Over Time */}
              <div className="page-break-before-always pt-8">
                 <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">3. 단계별 부문별 면적 상세 추이</h3>
                 </div>
                 <ReportDivisionTrendChart 
                    data={stageDivisionData} 
                    divisions={divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id))}
                    width={900}
                    height={320}
                 />
                 <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Data Legend</h4>
                    <div className="flex flex-wrap gap-4">
                       {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map(div => (
                          <div key={div.id} className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: div.color }} />
                             <span className="text-xs font-bold text-slate-700">{div.name}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {/* 1. Summary Report Placeholder */}
      {options.summary && (
        <div className="print-page w-full min-h-[210mm] page-break relative" style={{ padding: '0mm' }}>
           <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-6 mt-4">
              <div>
                 <h2 className="text-sm font-bold text-slate-500 mb-1">{project?.name || '면적분석 프로젝트'}</h2>
                 <h1 className="text-2xl font-black text-slate-900 tracking-tight">부서별 총괄 요약표</h1>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-medium">
                 <p>Stage: {currentStage?.name}</p>
                 <p>Date: {currentDate}</p>
                 <p>Confidential</p>
              </div>
           </div>
           
           <table className="w-full text-[11px] border-collapse tabular-nums" style={{ pageBreakInside: 'auto' }}>
             <thead className="bg-[#f8fafc]" style={{ display: 'table-header-group' }}>
               <tr className="border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center font-black text-slate-700 whitespace-nowrap border-r border-slate-200">부문</th>
                  <th className="py-2.5 px-3 text-center font-black text-slate-700 whitespace-nowrap border-r border-slate-200">부서코드</th>
                  <th className="py-2.5 px-3 text-left font-black text-slate-700 whitespace-nowrap border-r border-slate-200">부서명</th>
                  <th className="py-2.5 px-3 text-right font-black text-slate-700 whitespace-nowrap border-r border-slate-200">전용면적(㎡)</th>
                  <th className="py-2.5 px-3 text-right font-black text-slate-700 whitespace-nowrap">비율(%)</th>
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
                         {/* Division Subtotal row */}
                         <tr className="border-b border-t-2 border-t-slate-200 border-b-slate-200 bg-slate-50/50" style={{ pageBreakInside: 'avoid' }}>
                           <td className="py-2 px-3 text-center font-black text-slate-800 border-r border-slate-200">{div.name}</td>
                           <td colSpan={2} className="py-2 px-3 text-left font-bold text-slate-500 border-r border-slate-200">부문 소계</td>
                           <td className="py-2 px-3 text-right font-black text-slate-800 border-r border-slate-200">
                             {divTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </td>
                           <td className="py-2 px-3 text-right font-bold text-slate-500">-</td>
                         </tr>
                         {/* Department rows */}
                         {deptRows.map(d => (
                            <tr key={d.dept.id} className="border-b border-slate-100 hover:bg-slate-50/30" style={{ pageBreakInside: 'avoid' }}>
                              <td className="py-1.5 px-3 text-center text-transparent border-r border-slate-200 select-none">.</td>
                              <td className="py-1.5 px-3 text-center font-medium text-slate-500 font-mono border-r border-slate-200">{d.dept.code}</td>
                              <td className="py-1.5 px-3 text-left font-bold text-slate-700 border-r border-slate-200">{d.dept.name}</td>
                              <td className="py-1.5 px-3 text-right font-semibold text-slate-800 border-r border-slate-200">
                                {d.totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium text-slate-500">
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
      {options.detail && detailRows.length > 0 && (
         <div className="print-page w-full min-h-[210mm] page-break relative" style={{ padding: '0mm' }}>
            <table className="w-full text-[10px] border-collapse tabular-nums" style={{ pageBreakInside: 'auto' }}>
              <thead className="bg-[#f8fafc]" style={{ display: 'table-header-group' }}>
                <tr className="border-b-2 border-slate-800">
                  <td colSpan={9} className="py-4 border-none bg-white">
                    <div className="flex justify-between items-end pb-2 mb-2">
                        <div>
                           <h2 className="text-[13px] font-bold text-slate-500 mb-1">{project?.name || '면적분석 프로젝트'}</h2>
                           <h1 className="text-[22px] font-black text-slate-900 tracking-tight">전체 세부 면적계획표</h1>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-medium">
                           <p>Stage: {currentStage?.name}</p>
                           <p>Date: {currentDate}</p>
                           <p>Confidential</p>
                        </div>
                    </div>
                  </td>
                </tr>
                {/* Column Headers */}
                <tr className="border-b border-slate-300">
                  <th className="py-2.5 px-2 text-center font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-14 tracking-tight">층</th>
                  <th className="py-2.5 px-2 text-center font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-24">부문</th>
                  <th className="py-2.5 px-2 text-center font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-24">부서</th>
                  <th className="py-2.5 px-2 text-center font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-16 tracking-tight">실 번호</th>
                  <th className="py-2.5 px-2 text-left font-black text-slate-700 border-r border-slate-200">실 명칭</th>
                  <th className="py-2.5 px-2 text-right font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-16 tracking-tight">단위면적</th>
                  <th className="py-2.5 px-2 text-right font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-10 tracking-tight">실수</th>
                  <th className="py-2.5 px-2 text-right font-black text-slate-700 border-r border-slate-200 whitespace-nowrap w-20">전용면적(㎡)</th>
                  <th className="py-2.5 px-2 text-left font-black text-slate-700 w-32">비고</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors" style={{ pageBreakInside: 'avoid' }}>
                    <td className="py-[7px] px-2 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap tracking-tight">{row.floorName}</td>
                    <td className="py-[7px] px-2 text-center font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap">{row.divName}</td>
                    <td className="py-[7px] px-2 text-center font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap">{row.deptName}</td>
                    <td className="py-[7px] px-2 text-center text-slate-500 font-mono text-[9px] border-r border-slate-200 tracking-tight">{row.roomNo}</td>
                    <td className="py-[7px] px-2 text-left font-bold text-slate-800 border-r border-slate-200 text-[10.5px]">{row.roomName}</td>
                    <td className="py-[7px] px-2 text-right text-slate-600 font-mono border-r border-slate-200 tracking-tight">{row.unitArea > 0 ? row.unitArea.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</td>
                    <td className="py-[7px] px-2 text-right text-slate-600 font-mono border-r border-slate-200">{row.qty > 0 ? row.qty : '-'}</td>
                    <td className="py-[7px] px-2 text-right font-black text-slate-900 border-r border-slate-200 bg-slate-50/30">
                       {row.totalArea > 0 ? row.totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-[7px] px-2 text-left text-slate-500 text-[8px] leading-snug line-clamp-2" title={row.note}>
                       {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ display: 'table-footer-group' }}>
                 <tr>
                    <td colSpan={9} className="pt-4 text-right text-[9px] text-slate-400 font-medium">
                       Generated by Area Analysis System
                    </td>
                 </tr>
              </tfoot>
            </table>
         </div>
      )}
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';
export default PrintableReport;
