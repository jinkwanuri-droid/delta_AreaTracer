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
  const { rooms, floors, departments, divisions, values, stages, comparison } = useAppStore();

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
    <div className="bg-white text-slate-900 printable-container">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          body {
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .page-break {
            page-break-before: always;
          }
          .printable-container {
             width: 100%;
             max-width: none;
             padding: 0;
          }
        }
        .empty-hatch {
          background-image: repeating-linear-gradient(45deg, #f1f5f9 0, #f1f5f9 2px, transparent 2px, transparent 8px);
        }
      `}</style>

      {targetFloors.map((floor, idx) => (
        <div key={floor.id} className={clsx("flex flex-col mb-12", idx > 0 && "page-break")}>
          {/* Header Row */}
          <div className="flex items-end justify-between border-b-2 border-slate-950 pb-2 mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {floor.name.startsWith('B') ? `지하 ${floor.name.substring(1)}층` : `지상 ${floor.name.replace('F', '')}층`} 세부 면적계획
              </h2>
              <div className="text-[10px] text-slate-500 font-medium mt-1">경상남도 서부의료원 건립사업 기본설계</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">
                Detail Floor Report
              </span>
            </div>
          </div>

          <FloorTable floor={floor} />
        </div>
      ))}
    </div>
  );
}

function FloorTable({ floor }: { floor: any }) {
  const { rooms, departments, stages, values, comparison, divisions, floorWardOverrides } = useAppStore();

  const baseId = comparison.baseId || stages[0]?.id;
  const targetId = comparison.targetId || stages[stages.length - 1]?.id;

  // Filter rooms for this floor
  const floorRooms = useMemo(() => {
    return rooms.filter(r => r.floorId === floor.id).sort((a, b) => {
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

  return (
    <div className="w-full">
      <table className="w-full border-collapse border-slate-300 table-fixed text-[8px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-300 py-1 px-1 w-8 text-center" rowSpan={2}>NO</th>
            <th className="border border-slate-300 py-1 px-2 text-left w-36" rowSpan={2}>실 명칭</th>
            {stages.map(s => (
              <th key={s.id} className="border border-slate-300 py-1 px-1 text-center" colSpan={3}>
                {s.name}
              </th>
            ))}
            <th className="border border-slate-300 py-1 px-1 text-right w-16" rowSpan={2}>증감</th>
          </tr>
          <tr className="bg-slate-50">
            {stages.map(s => (
              <React.Fragment key={`${s.id}-sub`}>
                <th className="border border-slate-300 py-0.5 px-0.5 text-right font-medium text-slate-500 w-12">Net</th>
                <th className="border border-slate-300 py-0.5 px-0.5 text-center font-medium text-slate-500 w-8">Qty</th>
                <th className="border border-slate-300 py-0.5 px-0.5 text-right font-bold text-slate-900 w-14">Total</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedRows.map(row => {
            if (row.isSpacer) {
              return <tr key={row.id} className="h-1"><td colSpan={3 + stages.length * 3} className="border-x border-slate-100"></td></tr>;
            }
            if (row.isHeader) {
               return (
                 <tr key={row.id} className="bg-slate-100/30">
                   <td colSpan={3 + stages.length * 3} className="border border-slate-300 py-1 px-4 font-bold text-slate-900">
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: row.deptColor }}></div>
                       {row.deptName}
                     </div>
                   </td>
                 </tr>
               );
            }
            if (row.isSummary) {
              return (
                <tr key={row.id} className="bg-slate-50 font-bold">
                  <td className="border border-slate-300 py-1 px-1"></td>
                  <td className="border border-slate-300 py-1 px-2 text-left">[{row.deptName} 소계]</td>
                  {stages.map(s => (
                    <React.Fragment key={s.id}>
                      <td className="border border-slate-300 py-1 px-1 text-right text-slate-400">-</td>
                      <td className="border border-slate-300 py-1 px-1 text-center text-slate-400">-</td>
                      <td className="border border-slate-300 py-1 px-1 text-right text-indigo-700 bg-indigo-50/30">
                        {formatNum(row[`${s.id}_total`])}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className={clsx(
                    "border border-slate-300 py-1 px-1 text-right font-bold",
                    row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                  )}>
                    {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.id} className="hover:bg-slate-50/50">
                <td className="border border-slate-300 py-1 px-1 text-center text-slate-400 font-mono">{row.no}</td>
                <td className="border border-slate-300 py-1 px-2 text-left font-medium text-slate-800 leading-tight">
                  {row.name}
                </td>
                {stages.map(s => {
                  const isEmpty = row[`${s.id}_isEmpty`];
                  return (
                    <React.Fragment key={s.id}>
                      <td className={clsx("border border-slate-300 py-1 px-0.5 text-right font-mono text-slate-500", isEmpty && "empty-hatch")}>
                         {isEmpty ? "" : formatNum(row[`${s.id}_unit`])}
                      </td>
                      <td className={clsx("border border-slate-300 py-1 px-0.5 text-center font-mono text-slate-500", isEmpty && "empty-hatch")}>
                         {isEmpty ? "" : formatQty(row[`${s.id}_qty`])}
                      </td>
                      <td className={clsx("border border-slate-300 py-1 px-1 text-right font-mono font-semibold text-slate-700 bg-slate-50/20", isEmpty && "empty-hatch")}>
                         {isEmpty ? "" : formatNum(row[`${s.id}_total`])}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className={clsx(
                  "border border-slate-300 py-1 px-1 text-right font-mono font-bold",
                  row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                )}>
                  {row.variance === 0 ? "-" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
