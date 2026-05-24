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
  const { floors } = useAppStore();

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

  if (targetFloors.length === 0) return null;

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
          background-image: repeating-linear-gradient(45deg, #f1f5f9 0, #f1f5f9 2px, transparent 2px, transparent 8px);
        }

        /* 테이블 폰트 및 행 패딩 강력 제어 (Tailwind/글로벌 스타일 오버라이드) */
        .print-page table {
          border-collapse: separate !important;
          font-family: 'Arial', sans-serif !important;
        }
        .print-page table th {
          font-size: 6pt !important;
          padding-top: 1.20mm !important;
          padding-bottom: 1.20mm !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
        }
        .print-page table td {
          font-size: 5pt !important;
          padding-top: 1.20mm !important;
          padding-bottom: 1.20mm !important;
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
          font-size: 4.5pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-qty {
          font-size: 4.5pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-total {
          font-size: 4.5pt !important;
          font-weight: 700 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        /* 비고란 (기존의 70% 크기) */
        .print-page table td.col-note {
          font-size: 3.5pt !important;
          color: #64748b !important;
          line-height: 1.05 !important;
          letter-spacing: -0.35pt !important;
          font-family: 'Arial Narrow', 'Malgun Gothic', 'Dotum', sans-serif !important;
        }
      `}</style>
      
      {targetFloors.map((floor) => (
        <FloorTable key={floor.id} floor={floor} />
      ))}
    </div>
  );
}

function FloorTable({ floor }: { floor: any }) {
  const { rooms, departments, stages, values, comparison, divisions } = useAppStore();

  const baseId = comparison.baseId || stages[0]?.id;
  const targetId = comparison.targetId || stages[stages.length - 1]?.id;

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
                <col style={{ width: '180px' }} />
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
                          isCurrent ? "bg-[#EEF2FF] text-indigo-950 font-extrabold" : "bg-[#E2E8F0] text-[#334155]"
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
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-net", isCurrent ? "bg-[#EEF2FF] text-indigo-700" : "bg-[#E2E8F0] text-slate-500")}>Net</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-qty", isCurrent ? "bg-[#EEF2FF] text-indigo-700" : "bg-[#E2E8F0] text-slate-500")}>Qty</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-bold col-total", isCurrent ? "bg-[#E0E7FF] text-indigo-900" : "bg-[#E2E8F0] text-slate-900")}>Total</th>
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
                        <td className="border-b border-l border-r border-slate-300 py-0.5 px-1.5 text-left text-slate-800">[{row.deptName} 소계]</td>
                        {stages.map(s => {
                          const isCurrent = s.id === targetId;
                          return (
                            <React.Fragment key={s.id}>
                              <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-right text-slate-400 col-net", isCurrent && "bg-[#EEF2FF]")}></td>
                              <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-center text-slate-400 col-qty", isCurrent && "bg-[#EEF2FF]")}></td>
                              <td className={clsx(
                                "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                                isCurrent ? "bg-[#E0E7FF] text-indigo-950" : "bg-indigo-50/50 text-[#312E81]"
                              )}>
                                {row[`${s.id}_total`] === 0 ? '' : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={clsx(
                          "border-b border-r border-slate-300 py-0.5 px-1 font-inter font-bold text-right col-total",
                          row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                        )}>
                          {row.variance === 0 ? "" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                        </td>
                        <td className="border-b border-r border-slate-300 py-0.5 px-1 text-center text-slate-400 col-note"></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`${row.id}-${i}`}>
                      <td className="border-b border-l border-slate-300 py-0.5 px-0.5 text-center text-slate-400 font-mono col-no">{row.no}</td>
                      <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left font-medium text-slate-800">
                        {row.name}
                      </td>
                      {stages.map(s => {
                        const isEmpty = row[`${s.id}_isEmpty`];
                        const isCurrent = s.id === targetId;
                        return (
                          <React.Fragment key={s.id}>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter col-net",
                              isEmpty ? "empty-hatch" : (isCurrent ? "bg-[#EEF2FF] text-indigo-950 font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_unit`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-center font-inter col-qty",
                              isEmpty ? "empty-hatch" : (isCurrent ? "bg-[#EEF2FF] text-indigo-950 font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatQty(row[`${s.id}_qty`])}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                              isEmpty ? "empty-hatch" : (isCurrent ? "bg-[#E0E7FF] text-indigo-950" : "bg-slate-100/60 text-slate-900")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={clsx(
                        "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter font-bold col-total",
                        row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                      )}>
                        {row.variance === 0 ? "" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                      </td>
                      <td className="border-b border-r border-slate-300 py-0.5 px-1 text-left text-slate-500 truncate print:whitespace-normal col-note">
                        {row.note || ''}
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
