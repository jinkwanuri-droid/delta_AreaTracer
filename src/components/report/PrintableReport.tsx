import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { clsx } from 'clsx';

// Helper to format numbers with rounding
const formatNum = (num: number | undefined | null) => {
  if (num === undefined || num === null || num === 0) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// Helper for quantity formatting
const formatQty = (qty: number | undefined | null) => {
  if (qty === undefined || qty === null || qty === 0) return "-";
  return qty.toLocaleString();
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
    <div className="bg-white text-slate-900 printable-container font-['Pretendard','Inter',sans-serif]">
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

  const ROWS_PER_PAGE = 30; // 80% scale row height enables ~30 rows per page comfortably

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
        <div key={`${floor.id}-p${pageIdx}`} className="print-page w-full flex flex-col justify-between" style={{ minHeight: '186mm' }}>
          <div className="flex-1">
            <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2">
              <div>
                <h2 className="text-[14px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
                  <span>{floorTitle} 세부 면적계획</span>
                  <span className="text-[10px] font-normal text-slate-500 mb-[1px]">({pageIdx + 1}/{pages.length})</span>
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-600">
                  경상남도 서부의료원 건립사업 실시설계 | 층별 세부 면적계획
                </span>
              </div>
            </div>

            <table className="w-full border-separate border-spacing-0 table-fixed text-[7.5px] print:text-[6.5px]">
              <colgroup>
                <col style={{ width: '50px' }} />
                <col style={{ width: '160px' }} />
                {stages.map(s => (
                  <React.Fragment key={`${s.id}-col`}>
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '25px' }} />
                    <col style={{ width: '50px' }} />
                  </React.Fragment>
                ))}
                <col style={{ width: '50px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="bg-[#E2E8F0] border-y border-r border-l border-[#CBD5E1] py-1 px-1 text-center font-bold text-[#334155]" rowSpan={2}>NO</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-1 px-1 text-left font-bold text-[#334155]" rowSpan={2}>실 명칭</th>
                  {stages.map(s => (
                    <th key={s.id} className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-1 px-1 text-center font-bold text-[#334155]" colSpan={3}>
                      {s.name}
                    </th>
                  ))}
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-1 px-1 text-center font-bold text-[#334155]" rowSpan={2}>증감</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-1 px-1 text-center font-bold text-[#334155]" rowSpan={2}>비고</th>
                </tr>
                <tr>
                  {stages.map(s => (
                    <React.Fragment key={`${s.id}-sub`}>
                      <th className="bg-[#E2E8F0] border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium text-slate-500">Net</th>
                      <th className="bg-[#E2E8F0] border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium text-slate-500">Qty</th>
                      <th className="bg-[#E2E8F0] border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-bold text-slate-900">Total</th>
                    </React.Fragment>
                  ))}
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
                         <td colSpan={4 + stages.length * 3} className="border-b border-l border-r border-slate-300 py-1 px-2 font-bold text-slate-900">
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
                        <td className="border-b border-l border-slate-300 py-1 px-1 text-center text-slate-400"></td>
                        <td className="border-b border-l border-r border-slate-300 py-1 px-1.5 text-left text-slate-800">[{row.deptName} 소계]</td>
                        {stages.map(s => (
                          <React.Fragment key={s.id}>
                            <td className="border-b border-r border-slate-300 py-1 px-0.5 text-right text-slate-400"></td>
                            <td className="border-b border-r border-slate-300 py-1 px-0.5 text-center text-slate-400"></td>
                            <td className="border-b border-r border-slate-300 py-1 px-0.5 text-right text-indigo-900 font-inter font-bold bg-indigo-50">
                              {row[`${s.id}_total`] === 0 ? '' : formatNum(row[`${s.id}_total`])}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className={clsx(
                          "border-b border-r border-slate-300 py-1 px-1 font-inter font-bold text-right",
                          row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                        )}>
                          {row.variance === 0 ? "" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                        </td>
                        <td className="border-b border-r border-slate-300 py-1 px-1 text-center text-slate-400"></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`${row.id}-${i}`}>
                      <td className="border-b border-l border-slate-300 py-0.5 px-0.5 text-center text-slate-400 font-mono text-[6px] print:text-[5px]">{row.no}</td>
                      <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left font-medium text-slate-800 leading-tight">
                        {row.name}
                      </td>
                      {stages.map(s => {
                        const isEmpty = row[`${s.id}_isEmpty`];
                        return (
                          <React.Fragment key={s.id}>
                            <td className={clsx("border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter text-slate-500", isEmpty && "empty-hatch")}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_unit`])}
                            </td>
                            <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-center font-inter text-slate-500", isEmpty && "empty-hatch")}>
                               {isEmpty ? "" : formatQty(row[`${s.id}_qty`])}
                            </td>
                            <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold text-slate-900 bg-slate-100", isEmpty && "empty-hatch")}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_total`])}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={clsx(
                        "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter font-bold",
                        row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                      )}>
                        {row.variance === 0 ? "-" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                      </td>
                      <td className="border-b border-r border-slate-300 py-0.5 px-1 text-left text-slate-500 truncate print:whitespace-normal">
                        {row.note || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Component fixed at the bottom of the page */}
          <div className="mt-4 flex-none border-t border-slate-400 pt-1.5 flex justify-between items-start text-[8px] text-slate-500 font-medium">
            <div>경상남도청 | 해안건축</div>
            <div>{pageIdx + 1}</div>
          </div>
        </div>
      ))}
    </>
  );
}
