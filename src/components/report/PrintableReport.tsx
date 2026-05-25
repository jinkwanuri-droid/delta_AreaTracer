import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { clsx } from 'clsx';

// Helper to format numbers with rounding
const formatNum = (num: number | undefined | null, noDecimal: boolean = false) => {
  if (num === undefined || num === null || num === 0) return "-";
  const fractionDigits = noDecimal ? 0 : 2;
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  });
};

// Helper for quantity formatting
const formatQty = (qty: number | undefined | null) => {
  if (qty === undefined || qty === null || qty === 0) return "-";
  if (qty % 1 !== 0) {
    return qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  }
  return qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function PrintableReport() {
  const { floors, pdfExportTargets } = useAppStore();

  const showSummary = pdfExportTargets?.includes('summary') ?? true;
  const showDetail = pdfExportTargets?.includes('detail') ?? true;

  // 1. Filter and Sort Floors: B1 -> 1F -> 2F ... -> 7F
  const targetFloors = useMemo(() => {
    return floors.filter(f => {
      const name = f.name.toUpperCase().trim();
      // Only B1 and 1F~7F
      if (name === 'B1') return true;
      const numMatch = name.match(/^(\d+)F$/);
      if (numMatch) {
         const num = parseInt(numMatch[1]);
         return num >= 1 && num <= 7;
      }
      return false;
    }).sort((a, b) => {
      const getVal = (n: string) => {
        if (n.startsWith('B')) return -parseInt(n.substring(1));
        return parseInt(n.replace('F', ''));
      };
      return getVal(a.name) - getVal(b.name);
    });
  }, [floors]);

  if (targetFloors.length === 0 && !showSummary) return null;

  return (
    <div className="bg-white text-slate-900 printable-container font-['Arial','Helvetica',sans-serif]">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          body {
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .printable-container {
             width: 100%;
             max-width: none;
             padding: 0;
             margin: 0;
          }
          .print-page {
             page-break-after: always;
             page-break-inside: avoid;
          }
        }
        .empty-hatch {
          background-color: #fafbfd !important;
          background-image: repeating-linear-gradient(45deg, #e2e8f0 0, #e2e8f0 0.4px, transparent 0.4px, transparent 2.5px) !important;
        }

        /* 테이블 폰트 및 행 패딩 강력 제어 (Tailwind/글로벌 스타일 오버라이드) */
        .print-page table {
          border-collapse: separate !important;
          font-family: 'Arial', sans-serif !important;
        }
        .print-page table th {
          font-size: 5pt !important;
          padding-top: 1.0mm !important;
          padding-bottom: 1.0mm !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
        }
        .print-page table td {
          font-size: 4pt !important;
          padding-top: 1.0mm !important;
          padding-bottom: 1.0mm !important;
          line-height: 1.15 !important;
        }
        
        /* 실번호 열 세밀 축소 */
        .print-page table td.col-no {
          font-size: 3.5pt !important;
          color: #94a3b8 !important;
          font-family: 'Arial Narrow', sans-serif !important;
          letter-spacing: -0.25pt !important;
        }
        /* Net, Qty, Total 데이터 열 */
        .print-page table td.col-net {
          font-size: 4pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-qty {
          font-size: 4pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-total {
          font-size: 4pt !important;
          font-weight: 700 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        /* 현재 단계(실시설계)의 옅은 퍼플톤 강력 제어 */
        .print-current-bg-light {
          background-color: #F5F3FF !important; /* 아주 옅은 보라 (purple-50) */
        }
        .print-current-bg-medium {
          background-color: #EDE9FE !important; /* 옅은 보라 (purple-100) */
        }
        .print-current-text-dark {
          color: #4C1D95 !important; /* 진보라 (purple-900) */
        }
        .print-current-text-medium {
          color: #6D28D9 !important; /* 중간 보라 (purple-700) */
        }

        /* 비고란 (실명과 동일한 폰트 패밀리 적용 및 극세사 세밀 정돈) */
        .print-page table td.col-note {
          font-size: 3pt !important;
          color: #64748b !important; /* 회색 폰트 */
          line-height: 1.05 !important;
          letter-spacing: -0.04em !important; /* 한글 좁은 폭(narrow) 느낌을 위한 자간 압축 */
          font-weight: 300 !important; /* 성명보다 얇은 두께 */
          font-family: 'Arial', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', 'Dotum', sans-serif !important; /* 성명(실명)과 일관된 폰트 패밀리 */
        }
      `}</style>
      
      {showSummary && <SummaryPrintTable />}
      {showDetail && targetFloors.map((floor) => (
        <FloorTable key={floor.id} floor={floor} />
      ))}
    </div>
  );
}

function FloorTable({ floor }: { floor: any }) {
  const { rooms, departments, stages: rawStages, visibleStageIds, values, comparison, divisions } = useAppStore();

  const stages = useMemo(() => {
    return rawStages.filter(s => visibleStageIds ? visibleStageIds.includes(s.id) : true).sort((a, b) => a.order - b.order);
  }, [rawStages, visibleStageIds]);

  const baseId = useMemo(() => {
    if (comparison.baseId && stages.some(s => s.id === comparison.baseId)) {
      return comparison.baseId;
    }
    return stages[0]?.id;
  }, [comparison.baseId, stages]);

  const targetId = useMemo(() => {
    if (comparison.targetId && stages.some(s => s.id === comparison.targetId)) {
      return comparison.targetId;
    }
    return stages[stages.length - 1]?.id;
  }, [comparison.targetId, stages]);

  // Filter rooms for this floor
  const floorRooms = useMemo(() => {
    return rooms.filter(r => r.floorId === floor.id).filter(r => {
      const dept = departments.find(d => d.id === r.departmentId);
      if (!dept) return false;
      return /^(0?[1-5]|[1-5])$/.test(dept.divisionId); // Show only division 1~5
    }).sort((a, b) => {
      const dA = departments.find(d => d.id === a.departmentId)?.order || 999;
      const dB = departments.find(d => d.id === b.departmentId)?.order || 999;
      if (dA !== dB) return dA - dB;
      return a.no.localeCompare(b.no, undefined, { numeric: true });
    });
  }, [rooms, floor.id, departments]);

  // Map values for faster access
  const valsMap = useMemo(() => {
    const map = new Map<string, any>();
    values.forEach(v => map.set(`${v.roomId}|${v.stageId}`, v));
    return map;
  }, [values]);

  // Group by department for summary rows
  const groupedRows = useMemo(() => {
    const result: any[] = [];
    let currentDeptId: string | null = null;
    let deptRooms: any[] = [];

    const addSummary = (dId: string, roomsOfDept: any[]) => {
      const dept = departments.find(d => d.id === dId);
      const div = divisions.find(v => v.id === dept?.divisionId);
      
      const summary: any = {
        id: `summary-${dId}`,
        isSummary: true,
        deptName: dept?.name || "기타",
        deptColor: div?.color || "#64748b",
        variant: 0
      };

      stages.forEach(s => {
        let total = 0;
        roomsOfDept.forEach(r => {
          const v = valsMap.get(`${r.id}|${s.id}`);
          if (v) total += (v.unitArea || 0) * (v.quantity || 0);
        });
        summary[`${s.id}_total`] = total;
      });
      
      if (baseId && targetId) {
        summary.variance = (summary[`${targetId}_total`] || 0) - (summary[`${baseId}_total`] || 0);
      }

      result.push(summary);
    };

    floorRooms.forEach(room => {
      if (room.departmentId !== currentDeptId) {
        if (currentDeptId !== null) {
          addSummary(currentDeptId, deptRooms);
          result.push({ id: `spacer-${currentDeptId}`, isSpacer: true });
        }
        currentDeptId = room.departmentId;
        deptRooms = [];
        
        // Add Department Header
        const dept = departments.find(d => d.id === currentDeptId);
        const div = divisions.find(v => v.id === dept?.divisionId);
        result.push({
          id: `header-${currentDeptId}`,
          isHeader: true,
          deptName: dept?.name || "기타",
          deptColor: div?.color || "#6366f1"
        });
      }
      deptRooms.push(room);
      
      const row: any = { ...room };
      stages.forEach(s => {
        const v = valsMap.get(`${room.id}|${s.id}`);
        row[`${s.id}_unit`] = v?.unitArea || 0;
        row[`${s.id}_qty`] = v?.quantity || 0;
        row[`${s.id}_total`] = (v?.unitArea || 0) * (v?.quantity || 0);
        row[`${s.id}_isEmpty`] = !v;
      });

      if (baseId && targetId) {
        row.variance = (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
      }
      
      result.push(row);
    });

    if (currentDeptId !== null) {
      addSummary(currentDeptId, deptRooms);
    }

    return result;
  }, [floorRooms, departments, divisions, stages, valsMap, baseId, targetId]);

  const ROWS_PER_PAGE = 22; // Keep content safe from print layout overflows

  const pages = useMemo(() => {
    const p = [];
    let current = [];
    let count = 0;
    
    groupedRows.forEach((row) => {
      if (count === 0 && row.isSpacer) return;

      // Automatically break page if header is near page end (less than 3 rows left)
      if (row.isHeader && count > 0 && ROWS_PER_PAGE - count < 3) {
        p.push(current);
        current = [];
        count = 0;
      }

      if (count >= ROWS_PER_PAGE) {
        p.push(current);
        current = [];
        count = 0;
      }
      
      current.push(row);
      count += row.isSpacer ? 0.3 : 1;
    });
    
    if (current.length > 0) {
      p.push(current);
    }
    
    return p;
  }, [groupedRows]);

  const floorTitle = floor.name.startsWith('B') ? `지하 ${floor.name.substring(1)}층` : `지상 ${floor.name.replace('F', '')}층`;

  return (
    <>
      {pages.map((pageRows, pageIdx) => (
        <div key={`${floor.id}-p${pageIdx}`} className="print-page w-full flex flex-col" style={{ minHeight: '178mm', boxSizing: 'border-box' }}>
          <div className="flex-1">
            <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2" style={{ height: '15mm' }}>
              <div>
                <h2 className="text-[28px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
                  <span>{floorTitle} 세부 면적계획</span>
                  <span className="text-[14px] font-normal text-slate-500 mb-[2px]">({pageIdx + 1}/{pages.length})</span>
                </h2>
              </div>
              <div className="text-right pb-1">
                <span className="text-[9px] font-bold text-slate-600">
                  경상남도 서부의료원 건립사업 실시설계 | 층별 세부 면적계획
                </span>
              </div>
            </div>

            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: '50px' }} />
                <col style={{ width: '170px' }} />
                {stages.map(s => (
                  <React.Fragment key={`${s.id}-col`}>
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '20px' }} />
                    <col style={{ width: '50px' }} />
                  </React.Fragment>
                ))}
                <col style={{ width: '50px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="bg-[#E2E8F0] border-y border-r border-l border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>NO</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-left font-bold text-[#334155]" rowSpan={2}>실 명칭</th>
                  {stages.map(s => {
                    const isCurrent = s.id === targetId;
                    return (
                      <th 
                        key={s.id} 
                        className={clsx(
                          "border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold", 
                          isCurrent ? "print-current-bg-medium print-current-text-dark font-extrabold" : "bg-[#E2E8F0] text-[#334155]"
                        )} 
                        colSpan={3}
                      >
                        {s.name}
                      </th>
                    );
                  })}
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>증감</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>비고</th>
                </tr>
                <tr>
                  {stages.map(s => {
                    const isCurrent = s.id === targetId;
                    return (
                      <React.Fragment key={`${s.id}-sub`}>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-net", isCurrent ? "print-current-bg-light print-current-text-medium" : "bg-[#E2E8F0] text-slate-500")}>Net</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-qty", isCurrent ? "print-current-bg-light print-current-text-medium" : "bg-[#E2E8F0] text-slate-500")}>Qty</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-bold col-total", isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-[#E2E8F0] text-slate-900")}>Total</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {pageRows.map((row: any, i: number) => {
                  if (row.isSpacer) {
                    return (
                      <tr key={`${row.id}-${i}`}>
                        <td colSpan={4 + stages.length * 3} className="h-2"></td>
                      </tr>
                    );
                  }
                  if (row.isHeader) {
                     return (
                       <tr key={`${row.id}-${i}`} className="bg-slate-100/30">
                         <td colSpan={4 + stages.length * 3} className="border-b border-l border-r border-slate-300 py-0.5 px-2 font-bold text-slate-900">
                           <div className="flex items-center gap-1.5">
                             <div className="w-[3px] h-[10px] rounded-full" style={{ backgroundColor: row.deptColor }}></div>
                             {row.deptName}
                           </div>
                         </td>
                       </tr>
                     );
                  }
                  if (row.isSummary) {
                    return (
                      <tr key={`${row.id}-${i}`} className="bg-slate-50 font-bold">
                        <td className="border-b border-l border-slate-300 py-0.5 px-1 text-center text-slate-400"></td>
                        <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div style={{
                            fontSize: `[${row.deptName} 소계]`.length > 8
                              ? `${Math.max(2.4, Math.min(4, 4 - (`[${row.deptName} 소계]`.length - 8) * 0.12))}pt`
                              : 'inherit',
                            whiteSpace: 'nowrap',
                            letterSpacing: `[${row.deptName} 소계]`.length > 8 ? '-0.05em' : '-0.02em',
                            lineHeight: '1.1',
                          }}>
                            [{row.deptName} 소계]
                          </div>
                        </td>
                        {stages.map(s => {
                          const isCurrent = s.id === targetId;
                          return (
                            <React.Fragment key={s.id}>
                              <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-right text-slate-400 col-net", isCurrent && "print-current-bg-light")}></td>
                              <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-center text-slate-400 col-qty", isCurrent && "print-current-bg-light")}></td>
                              <td className={clsx(
                                "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                                isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-indigo-50/50 text-[#312E81]"
                              )}>
                                {row[`${s.id}_total`] === 0 ? '' : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={clsx(
                          "border-b border-r border-slate-300 py-0.5 px-1 font-inter font-bold text-right col-total",
                          row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400 font-normal"
                        )}>
                          {row.variance === 0 ? "0.00" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                        </td>
                        <td className="border-b border-r border-slate-300 py-0.5 px-1 text-center text-slate-400 col-note"></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`${row.id}-${i}`}>
                      <td className="border-b border-l border-slate-300 py-0.5 px-0.5 text-center text-slate-400 font-mono col-no">{row.no}</td>
                      <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left font-medium text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{
                          fontSize: row.name && row.name.length > 8
                            ? `${Math.max(2.4, Math.min(4, 4 - (row.name.length - 8) * 0.16))}pt`
                            : 'inherit',
                          whiteSpace: 'nowrap',
                          letterSpacing: row.name && row.name.length > 8 ? '-0.05em' : '-0.02em',
                          lineHeight: '1.1',
                        }}>
                          {row.name}
                        </div>
                      </td>
                      {stages.map(s => {
                        const isEmpty = row[`${s.id}_isEmpty`];
                        const isCurrent = s.id === targetId;
                        return (
                          <React.Fragment key={s.id}>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter col-net",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-light print-current-text-dark font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_unit`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-center font-inter col-qty",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-light print-current-text-dark font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatQty(row[`${s.id}_qty`])}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-slate-100/60 text-slate-900")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={clsx(
                        "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter font-bold col-total",
                        row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400 font-normal"
                      )}>
                        {row.variance === 0 ? "0.00" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                      </td>
                      <td className="border-b border-r border-slate-300 py-0.5 px-1 text-left col-note leading-tight" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{
                          fontSize: row.note && row.note.length > 10
                            ? `${Math.max(2.0, Math.min(3.0, 3.0 - (row.note.length - 10) * 0.08))}pt`
                            : 'inherit',
                          whiteSpace: 'nowrap',
                          letterSpacing: row.note && row.note.length > 10 ? '-0.06em' : '-0.04em',
                          lineHeight: '1.1',
                        }}>
                          {row.note || ''}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Component fixed at the bottom of the page */}
          <div className="mt-auto flex-none border-t border-slate-400 pt-1.5 flex justify-between items-start text-[8px] text-slate-500 font-medium">
            <div>경상남도청 | 해안건축</div>
            <div>{pageIdx + 1}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function SummaryPrintTable() {
  const { divisions, departments, rooms, values, stages: rawStages, visibleStageIds, floorAreasByStage, summaryNotes, departmentNotes, comparison, medicalOnly } = useAppStore();

  const stages = useMemo(() => {
    return rawStages.filter(s => visibleStageIds ? visibleStageIds.includes(s.id) : true).sort((a, b) => a.order - b.order);
  }, [rawStages, visibleStageIds]);

  const baseStageId = useMemo(() => {
    if (comparison.baseId && stages.some(s => s.id === comparison.baseId)) {
      return comparison.baseId;
    }
    return stages[0]?.id;
  }, [comparison.baseId, stages]);

  const targetStageId = useMemo(() => {
    if (comparison.targetId && stages.some(s => s.id === comparison.targetId)) {
      return comparison.targetId;
    }
    return stages[stages.length - 1]?.id;
  }, [comparison.targetId, stages]);

  const formatNum = (val: number | undefined | null, isRatio = false, stageId?: string) => {
    if (val === undefined || val === null || isNaN(val)) {
      return "-";
    }
    
    const checkVal = isRatio ? Number(val.toFixed(4)) : Number(val.toFixed(2));
    if (checkVal === 0) {
      if (isRatio) return "-";
      return "0";
    }
    
    if (isRatio) return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const stage = stages.find(s => s.id === stageId);
    if (stage?.code === 'A') {
      return Math.round(val).toLocaleString('ko-KR');
    }

    return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const summaryData = useMemo(() => {
    if (stages.length < 1) return [];

    const deptMap = new Map();
    departments.forEach(dept => {
      const stageAreas: Record<string, number> = {};
      stages.forEach(s => stageAreas[s.id] = 0);

      deptMap.set(dept.id, {
        deptId: dept.id,
        divisionId: dept.divisionId,
        code: dept.code || '',
        department: dept.name,
        stageAreas,
        notes: dept.note || '',
        order: dept.order
      });
    });

    values.forEach(v => {
      const room = rooms.find(r => r.id === v.roomId);
      if (!room) return;
      const deptData = deptMap.get(room.departmentId);
      if (!deptData) return;

      const area = v.unitArea * v.quantity;
      if (deptData.stageAreas[v.stageId] !== undefined) {
        deptData.stageAreas[v.stageId] += area;
      }
    });

    const rows: any[] = [];
    const isMedicalOnly = medicalOnly;

    const sortedDivisions = [...divisions]
      .filter(div => !isMedicalOnly || /^\d+$/.test(div.id))
      .sort((a, b) => a.order - b.order);

    const grandStageTotals: Record<string, number> = {};
    stages.forEach(s => grandStageTotals[s.id] = 0);

    sortedDivisions.forEach((div, index) => {
      const divDepts = Array.from(deptMap.values())
        .filter(d => d.divisionId === div.id)
        .sort((a, b) => a.order - b.order);

      if (divDepts.length === 0) return;

      // Group Header (Division Name)
      if (index > 0) {
        rows.push({
          id: `spacer-${div.id}`,
          isSpacer: true
        });
      }

      rows.push({
         id: `header-${div.id}`,
         isHeader: true,
         divisionName: div.name,
         color: div.color
      });

      const divStageTotals: Record<string, number> = {};
      stages.forEach(s => divStageTotals[s.id] = 0);

      divDepts.forEach((deptData) => {
        const targetVal = deptData.stageAreas[targetStageId] || 0;
        const baseVal = deptData.stageAreas[baseStageId] || 0;
        const diff = targetVal - baseVal;

        rows.push({
          ...deptData,
          id: deptData.deptId,
          divisionName: div.name,
          diff,
          divColor: div.color
        });

        stages.forEach(s => {
          divStageTotals[s.id] += deptData.stageAreas[s.id];
          grandStageTotals[s.id] += deptData.stageAreas[s.id];
        });
      });

      // Subtotal
      const targetDivVal = divStageTotals[targetStageId] || 0;
      const baseDivVal = divStageTotals[baseStageId] || 0;
      
      rows.push({
        id: `subtotal-${div.id}`,
        isSubtotal: true,
        divisionName: div.name,
        department: `${div.name} 소계`,
        stageAreas: divStageTotals,
        diff: targetDivVal - baseDivVal,
        divColor: div.color
      });
    });

    const targetGrandVal = grandStageTotals[targetStageId] || 0;
    const baseGrandVal = grandStageTotals[baseStageId] || 0;

    // Spacer row before grand total
    rows.push({
      id: 'spacer-before-grand-total',
      isSpacer: true
    });

    rows.push({
      id: 'grand-total',
      isGrandTotal: true,
      code: '가',
      department: '의료시설 전용면적 합계',
      stageAreas: grandStageTotals,
      diff: targetGrandVal - baseGrandVal,
    });

    // Per-stage Summary Calculations
    const commonAreaStageTotals: Record<string, number> = {};
    const gnRatioStageTotals: Record<string, number> = {};
    const medAreaSumStageTotals: Record<string, number> = {};
    const garageAreaStageTotals: Record<string, number> = {};
    const medTotalAreaStageTotals: Record<string, number> = {};
    const outdoorAreaStageTotals: Record<string, number> = {};
    const permitAreaStageTotals: Record<string, number> = {};

    stages.forEach(s => {
      let stageGarageArea = 0;
      let stageOutdoorArea = 0;

      values.forEach(v => {
        if (v.stageId !== s.id) return;
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return;
        
        const area = v.unitArea * v.quantity;
        if (room.no.startsWith('P')) {
          stageGarageArea += area;
        } else if (room.no.startsWith('O')) {
          stageOutdoorArea += area;
        }
      });

      const netAreaA = grandStageTotals[s.id] || 0;
      const stageFloorAreas = floorAreasByStage[s.id] || {};
      
      let permitAreaVal = 0;
      if (s.isTotalAreaOnly) {
        permitAreaVal = stageFloorAreas['_TOTAL_'] || 0;
      } else {
        permitAreaVal = Object.entries(stageFloorAreas).reduce((sum, [key, val]) => {
          if (key === '_TOTAL_') return sum;
          return sum + val;
        }, 0);
      }
      
      const commonAreaB = permitAreaVal > 0 ? (permitAreaVal - netAreaA - stageGarageArea - stageOutdoorArea) : 0;
      const gnRatio = netAreaA > 0 ? ((netAreaA + commonAreaB) / netAreaA) : 0;

      commonAreaStageTotals[s.id] = commonAreaB;
      gnRatioStageTotals[s.id] = gnRatio;
      medAreaSumStageTotals[s.id] = netAreaA + commonAreaB;
      garageAreaStageTotals[s.id] = stageGarageArea;
      medTotalAreaStageTotals[s.id] = netAreaA + commonAreaB + stageGarageArea;
      outdoorAreaStageTotals[s.id] = stageOutdoorArea;
      permitAreaStageTotals[s.id] = permitAreaVal;
    });

    // Summary Rows
    rows.push({
      id: 'common-area-sum',
      isSummaryRow: true,
      code: '나',
      department: '공용면적',
      stageAreas: commonAreaStageTotals,
      diff: commonAreaStageTotals[targetStageId] - commonAreaStageTotals[baseStageId],
      notes: summaryNotes['common-area-sum'] ?? departmentNotes['common-area-sum'] ?? '[참고 1] 종합병원 적정 공용비/공용면적 검토',
    });

    rows.push({
      id: 'gn-ratio',
      isSummaryRow: true,
      isRatio: true,
      code: '(가+나)/가',
      department: '공용비(G/N비)',
      stageAreas: gnRatioStageTotals,
      diff: gnRatioStageTotals[targetStageId] - gnRatioStageTotals[baseStageId],
      notes: summaryNotes['gn-ratio'] ?? departmentNotes['gn-ratio'] ?? '종합병원 평균값 1.50~1.60 사잇값으로 제안',
    });

    rows.push({
      id: 'med-area-sum',
      isSummaryRow: true,
      code: '가+나',
      department: '의료시설 면적',
      stageAreas: medAreaSumStageTotals,
      diff: medAreaSumStageTotals[targetStageId] - medAreaSumStageTotals[baseStageId],
      notes: summaryNotes['med-area-sum'] ?? departmentNotes['med-area-sum'] ?? '',
    });

    rows.push({
      id: 'garage-area',
      isSummaryRow: true,
      code: '다',
      department: '옥내 주차공간',
      stageAreas: garageAreaStageTotals,
      diff: garageAreaStageTotals[targetStageId] - garageAreaStageTotals[baseStageId],
      notes: summaryNotes['garage-area'] ?? departmentNotes['garage-area'] ?? '주차대수 100대 내외 계획하여 면적 제안',
    });

    rows.push({
      id: 'med-total-area',
      isSummaryRow: true,
      code: '가+나+다',
      department: '의료시설 총면적',
      stageAreas: medTotalAreaStageTotals,
      diff: medTotalAreaStageTotals[targetStageId] - medTotalAreaStageTotals[baseStageId],
      notes: summaryNotes['med-total-area'] ?? departmentNotes['med-total-area'] ?? '',
    });

    rows.push({
      id: 'outdoor-area',
      isSummaryRow: true,
      code: '라',
      department: '옥외 공용면적',
      stageAreas: outdoorAreaStageTotals,
      diff: outdoorAreaStageTotals[targetStageId] - outdoorAreaStageTotals[baseStageId],
      notes: summaryNotes['outdoor-area'] ?? departmentNotes['outdoor-area'] ?? '-',
    });

    rows.push({
      id: 'permit-area',
      isSummaryRow: true,
      code: '가~라',
      department: '건축허가 면적',
      stageAreas: permitAreaStageTotals,
      diff: permitAreaStageTotals[targetStageId] - permitAreaStageTotals[baseStageId],
      notes: summaryNotes['permit-area'] ?? '',
    });

    return rows;
  }, [divisions, departments, rooms, values, stages, floorAreasByStage, summaryNotes, comparison, medicalOnly, departmentNotes]);

  const pages = useMemo(() => {
    const resultPages: any[][] = [];
    let currentPageRows: any[] = [];
    
    // 전체 행의 가중 높이(Weight)를 계산하여 페이지를 분할합니다.
    // py-[0.41mm]를 기준으로 1페이지당 여유있게 Footer가 표기되기 위해 최대 단위는 28이 이상적입니다.
    let currentRowsCount = 0;
    const maxPageRows = 28; 

    for (let i = 0; i < summaryData.length; i++) {
      const row = summaryData[i];

      // 만약 세부 부문 그룹헤더를 맞닥뜨렸다면 뒤따르는 부서 수와 결합하여 체크합니다.
      if (row.isHeader) {
        // 이 헤더 아래에 있는 소속 대분류 항목들의 행 개수 (헤더 포함 다음 헤더, 스페이서 또는 총계 전단까지)
        let groupRowsCount = 1;
        for (let j = i + 1; j < summaryData.length; j++) {
          const nextRow = summaryData[j];
          if (nextRow.isHeader || nextRow.isSpacer || nextRow.isGrandTotal || nextRow.isSummaryRow) {
            break;
          }
          groupRowsCount++;
        }

        // 현재 페이지에 남은 빈 공간(remainingSpace) 계산
        const remainingSpace = maxPageRows - currentRowsCount;

        // 그룹 전체를 이번 페이지에 담지 못하면서, 이번 페이지에 헤더와 부서가 5줄 미만(즉, 부서가 4개 이하)으로만 간신히 보이고 다음 페이지로 가 버리는 상황이라면
        // 혹은 헤더를 다 넣기에 잔여 빈공간이 너무 부족한 경우(헤더+부서 5개 이하)
        // 이 그룹헤더부터 다음 페이지의 시작으로 넘어가게 합니다.
        if (groupRowsCount > remainingSpace && remainingSpace < 6) {
          if (currentPageRows.length > 0) {
            resultPages.push(currentPageRows);
            currentPageRows = [];
            currentRowsCount = 0;
          }
        }
      }

      currentPageRows.push(row);
      currentRowsCount += row.isSpacer ? 1.2 : 1;

      // 최대 허용 행 수에 도달하면 페이지 자름
      if (currentRowsCount >= maxPageRows) {
        resultPages.push(currentPageRows);
        currentPageRows = [];
        currentRowsCount = 0;
      }
    }

    if (currentPageRows.length > 0) {
      resultPages.push(currentPageRows);
    }

    return resultPages.map((rows, idx, arr) => ({
      pageIdx: idx,
      total: arr.length,
      rows
    }));
  }, [summaryData]);

  const renderRow = (row: any, idx: number) => {
    if (row.isSpacer) {
      return (
        <tr key={row.id}>
          <td colSpan={4 + stages.length} className="border-b border-l border-r border-[#CBD5E1] py-[0.41mm] bg-white" style={{ height: '3.2mm' }}></td>
        </tr>
      );
    }

    if (row.isHeader) {
      return (
        <tr key={`${row.id}-${idx}`} className="bg-slate-100/30">
          <td colSpan={4 + stages.length} className="border-b border-l border-r border-[#CBD5E1] py-[0.41mm] px-2 font-bold text-slate-900">
            <div className="flex items-center gap-1.5">
              <div className="w-[3px] h-[10px] rounded-full" style={{ backgroundColor: row.color }}></div>
              {row.divisionName}
            </div>
          </td>
        </tr>
      );
    }

    const isGrand = row.isGrandTotal;
    const isSub = row.isSubtotal;
    const isSumRow = row.isSummaryRow;

    const rowClass = clsx(
      isGrand && "bg-slate-100 font-bold",
      isSub && "bg-slate-50 font-bold",
      isSumRow && (row.id === 'med-total-area' || row.id === 'permit-area' ? "bg-slate-100 font-extrabold" : "bg-white text-slate-700")
    );

    return (
      <tr key={`${row.id}-${idx}`} className={rowClass}>
        {/* Code */}
        <td className={clsx(
          "border-b border-l border-slate-300 py-[0.41mm] px-1 text-center text-slate-500",
          (isGrand || isSumRow) && "text-slate-900 font-bold"
        )} style={{ fontFamily: "'Arial Narrow', sans-serif", letterSpacing: '-0.2pt' }}>
          {row.code || ''}
        </td>
        
        {/* Department Name */}
        <td className="border-b border-l border-r border-slate-300 py-[0.41mm] px-1.5 text-left font-medium text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <div className="flex items-center gap-1.5" style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <span className="truncate">{row.department}</span>
          </div>
        </td>

        {/* Stage values */}
        {stages.map(s => {
          const isCurStage = s.id === targetStageId;
          const val = row.stageAreas?.[s.id];
          return (
            <td 
              key={s.id} 
              className={clsx(
                "border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-right",
                isCurStage && "print-current-bg-light font-bold"
              )}
              style={{ 
                fontWeight: (isGrand || isSub || isSumRow) ? 'bold' : 'normal',
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: '-0.2pt'
              }}
            >
              {formatNum(val, row.isRatio, s.id)}
            </td>
          );
        })}

        {/* Diff (Variance) */}
        <td 
          className={clsx(
            "border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-right font-bold",
            row.diff > 0 ? "text-blue-600" : row.diff < 0 ? "text-red-500" : "text-slate-400 font-normal"
          )}
          style={{ 
            fontFamily: "'Arial Narrow', sans-serif", 
            letterSpacing: '-0.2pt' 
          }}
        >
          {row.diff === 0 ? "0.00" : (row.diff > 0 ? "+" : "") + formatNum(row.diff, row.isRatio)}
        </td>

        {/* Notes */}
        <td className="border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-left col-note leading-tight" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div className="truncate" title={row.notes || ''}>
            {row.notes || ''}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      {pages.map((page) => (
        <div key={`summary-page-${page.pageIdx}`} className="print-page w-full flex flex-col" style={{ minHeight: '178mm', boxSizing: 'border-box' }}>
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2.5" style={{ height: '14mm' }}>
              <div>
                <h2 className="text-[28px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
                  <span>부서별 총괄 면적표</span>
                  <span className="text-[14px] font-normal text-slate-500 mb-[2px]">({page.pageIdx + 1}/{page.total})</span>
                </h2>
              </div>
              <div className="text-right pb-1">
                <span className="text-[9px] font-bold text-slate-600">
                  경상남도 서부의료원 건립사업 실시설계 | 부서별 총괄 면적표
                </span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: '65px' }} />
                <col style={{ width: '170px' }} />
                {stages.map(s => (
                  <col key={s.id} style={{ width: '70px' }} />
                ))}
                <col style={{ width: '70px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="bg-[#E2E8F0] border-y border-r border-l border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">코드</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-left font-bold text-[#334155]" style={{ paddingLeft: '6px' }}>부서명</th>
                  {stages.map(s => (
                    <th 
                      key={s.id} 
                      className={clsx(
                        "border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold",
                        s.id === targetStageId ? "print-current-bg-medium print-current-text-dark font-extrabold" : "bg-[#E2E8F0] text-[#334155]"
                      )}
                    >
                      {s.name}
                    </th>
                  ))}
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">증감</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">주요 변경사항 및 비고</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {page.rows.map((row: any, i: number) => renderRow(row, i))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-auto flex-none border-t border-slate-400 pt-1.5 flex justify-between items-start text-[8px] text-slate-500 font-medium">
            <div>경상남도청 | 해안건축</div>
            <div>{page.pageIdx + 1}</div>
          </div>
        </div>
      ))}
    </>
  );
}
