import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import React from 'react';
import DisplaySettings from './DisplaySettings';
import { clsx } from 'clsx';
import { Download } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

const EditableTextCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue() || '';
  const [value, setValue] = React.useState(initialValue);
  const updateDepartment = useAppStore(state => state.updateDepartment);
  const field = column.columnDef.meta?.field;

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue && field) {
      updateDepartment(row.original.deptId, field, value);
    }
  };

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full bg-transparent outline-none px-2 py-1 text-[11px] text-slate-700 min-h-[28px]"
      placeholder={field === 'code' ? '코드를 입력하세요' : '변경사항을 입력하세요'}
    />
  );
};

const EditableSummaryCell = ({ initialValue, stageId, floorId }: { initialValue: number, stageId: string, floorId: string }) => {
  const [value, setValue] = React.useState(initialValue?.toString() || '0');
  const updateFloorArea = useAppStore(state => state.updateFloorArea);

  React.useEffect(() => {
    setValue(initialValue?.toString() || '0');
  }, [initialValue]);

  const onBlur = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num !== initialValue) {
      updateFloorArea(stageId, floorId, num);
    }
  };

  return (
    <input
      value={value === '0' ? '' : value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full bg-transparent text-right outline-none px-4 py-1 font-inter text-[11px] font-black tracking-tighter text-indigo-700 bg-indigo-50/30 rounded focus:bg-white focus:ring-1 focus:ring-indigo-300"
      placeholder="입력"
    />
  );
};

export default function DepartmentSummary() {
  const { 
    divisions, 
    departments, 
    rooms, 
    values, 
    stages, 
    floorAreasByStage, 
    visibleStageIds, 
    comparison,
    medicalOnly,
  } = useAppStore();

  const data = useMemo(() => {
    if (stages.length < 1) return [];

    const baseStageId = comparison.baseId || stages[0]?.id;
    const targetStageId = comparison.targetId || stages[stages.length - 1]?.id;

    const deptMap = new Map();
    
    // Initialize data for all departments
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

    // Sum up room values for ALL stages
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

    // Filter divisions if medicalOnly is active
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
      rows.push({
         id: `header-${div.id}`,
         isHeader: true,
         divisionName: div.name,
         span: true,
         color: div.color
      });

      const divStageTotals: Record<string, number> = {};
      stages.forEach(s => divStageTotals[s.id] = 0);

      divDepts.forEach((deptData, idx) => {
        // Calculate diff between target and base stage
        const targetVal = deptData.stageAreas[targetStageId] || 0;
        const baseVal = deptData.stageAreas[baseStageId] || 0;
        const diff = targetVal - baseVal;

        rows.push({
          ...deptData,
          id: deptData.deptId,
          divisionName: div.name,
          diff,
          isFirstInDiv: idx === 0,
          divSize: divDepts.length,
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

      // Small spacer between divisions
      if (index < sortedDivisions.length - 1) {
        rows.push({
          id: `spacer-${div.id}`,
          isSpacer: true,
          isSmall: true
        });
      }
    });

    // Grand Total Row
    const targetGrandVal = grandStageTotals[targetStageId] || 0;
    const baseGrandVal = grandStageTotals[baseStageId] || 0;

    rows.push({
      id: 'grand-total',
      isGrandTotal: true,
      department: '의료시설 전용면적 합계 [가]',
      stageAreas: grandStageTotals,
      diff: targetGrandVal - baseGrandVal,
      variant: 'dark-grey'
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
      // Calculate Garage and Outdoor for this stage regardless of filtering
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
      department: '공용면적 [나]',
      stageAreas: commonAreaStageTotals,
      diff: commonAreaStageTotals[targetStageId] - commonAreaStageTotals[baseStageId],
      notes: '[참고 1] 종합병원 적정 공용비/공용면적 검토',
      variant: 'white'
    });

    rows.push({
      id: 'gn-ratio',
      isSummaryRow: true,
      department: '공용비(G/N비)',
      stageAreas: gnRatioStageTotals,
      diff: 0,
      isRatio: true,
      notes: '종합병원 평균값 1.50~1.60 사잇값으로 제안',
      variant: 'white'
    });

    rows.push({
      id: 'med-area-sum',
      isSummaryRow: true,
      department: '의료시설 면적 [가+나]',
      stageAreas: medAreaSumStageTotals,
      diff: medAreaSumStageTotals[targetStageId] - medAreaSumStageTotals[baseStageId],
      variant: 'grey'
    });

    rows.push({
      id: 'garage-area',
      isSummaryRow: true,
      department: '옥내 주차공간 [다]',
      stageAreas: garageAreaStageTotals,
      diff: garageAreaStageTotals[targetStageId] - garageAreaStageTotals[baseStageId],
      notes: '주차대수 100대 내외 계획하여 면적 제안',
      variant: 'white'
    });

    rows.push({
      id: 'med-total-area',
      isSummaryRow: true,
      department: '의료시설 총면적 [가+나+다]',
      stageAreas: medTotalAreaStageTotals,
      diff: medTotalAreaStageTotals[targetStageId] - medTotalAreaStageTotals[baseStageId],
      variant: 'dark-grey'
    });

    rows.push({
      id: 'outdoor-area',
      isSummaryRow: true,
      department: '옥외 공용면적 [라]',
      stageAreas: outdoorAreaStageTotals,
      diff: outdoorAreaStageTotals[targetStageId] - outdoorAreaStageTotals[baseStageId],
      notes: '-',
      variant: 'white'
    });

    rows.push({
      id: 'permit-area',
      isSummaryRow: true,
      department: '건축허가 면적 [가+나+다+라]',
      stageAreas: permitAreaStageTotals,
      diff: permitAreaStageTotals[targetStageId] - permitAreaStageTotals[baseStageId],
      variant: 'dark-grey'
    });

    return rows;
  }, [divisions, departments, rooms, values, stages, floorAreasByStage, visibleStageIds, comparison]);

  const formatNum = (val: number | undefined | null, isRatio = false) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    if (isRatio) return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      columnHelper.accessor('code', {
        header: '코 드',
        cell: info => {
          const row = info.row.original;
          if (row.isHeader || row.isSubtotal || row.isGrandTotal || row.isSummaryRow || row.isSpacer) return null;
          return <div className="text-center font-inter text-[11px] text-slate-500 py-1">{info.getValue() || row.id}</div>;
        },
        size: 70,
      }),
      columnHelper.accessor('department', {
        header: '부 서 명',
        cell: info => {
          const row = info.row.original;
          const val = info.getValue();
          return (
            <div className={clsx(
              "px-4 py-1 text-[11px]",
              (row.isSubtotal || row.isGrandTotal || row.isSummaryRow) ? "font-black" : "font-semibold text-slate-700"
            )}>
              {val}
            </div>
          );
        },
        size: 200,
      }),
    ];

    const visibleStages = stages.filter(s => visibleStageIds.includes(s.id));
    
    // Dynamic stage columns
    visibleStages.forEach((s, idx) => {
      cols.push(
        columnHelper.display({
          id: `stage-${s.id}`,
          header: `${s.name}${s.code ? `[${s.code}]` : ''}`,
          cell: info => {
            const row = info.row.original;
            const val = row.stageAreas?.[s.id] as number;
            if (row.isHeader || row.isSpacer) return null;
            
            // Allow editing Permit Area for "Total Area Only" stages (like Competition Guidelines)
            if (row.id === 'permit-area' && s.isTotalAreaOnly) {
              return <EditableSummaryCell initialValue={val} stageId={s.id} floorId="_TOTAL_" />;
            }

            if (row.isRatio && s.id !== (comparison.targetId || stages[stages.length-1].id)) return <div className="text-right px-4 font-inter text-[11px]">-</div>;
            
            // Summary rows might only have specific stages populated (all summary rows now populate all stages in my logic above)
            if (row.isSummaryRow && val === undefined) return <div className="text-right px-4 font-inter text-[11px]">-</div>;

            return (
              <div className={clsx(
                "text-right px-4 font-inter text-[11px] tracking-tighter",
                (row.isSubtotal || row.isGrandTotal || row.isSummaryRow) && "font-bold"
              )}>
                {formatNum(val, row.isRatio)}
              </div>
            );
          },
          size: 100,
        })
      );
    });

    // Diff column
    const bId = comparison.baseId || stages[0]?.id;
    const tId = comparison.targetId || stages[stages.length-1]?.id;
    const bStage = stages.find(s => s.id === bId);
    const tStage = stages.find(s => s.id === tId);
    const baseName = bStage?.code || bStage?.name?.match(/\[(.*?)\]/)?.[1] || 'BASE';
    const targetName = tStage?.code || tStage?.name?.match(/\[(.*?)\]/)?.[1] || 'TARGET';

    cols.push(
      columnHelper.accessor('diff', {
        header: `증감 [${targetName}-${baseName}]`,
        cell: info => {
          const val = info.getValue() as number;
          const row = info.row.original;
          if (row.isHeader || row.isSpacer) return null;
          if (row.isSummaryRow) return null; // Simplified
          const variant = row.variant;
          const isActuallyDark = variant === 'dark' || variant === 'dark-ext';
          return (
            <div className={clsx(
              "text-right px-4 font-inter text-[11px] tracking-tighter font-bold",
              !isActuallyDark && val > 0 ? "text-blue-600" : !isActuallyDark && val < 0 ? "text-red-500" : isActuallyDark ? "text-blue-400" : "text-slate-400"
            )}>
              {val > 0 ? '+' : ''}{formatNum(val)}
            </div>
          );
        },
        size: 90,
      })
    );

    cols.push(
      columnHelper.accessor('notes', {
        header: '주요 변경사항',
        cell: info => {
          const row = info.row.original;
          if (row.isHeader || row.isSpacer) return null;
          if (row.isSubtotal || row.isGrandTotal) return null;
          if (row.isSummaryRow && row.notes) {
            return <div className="px-4 py-1.5 text-[10px] text-slate-400 italic">{row.notes}</div>;
          }
          return <EditableTextCell {...info} />;
        },
        meta: { field: 'note' },
        size: 300,
      })
    );

    return cols;
  }, [stages, visibleStageIds, comparison]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">부서별 총괄 면적표</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DisplaySettings />
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="bg-[#E2E8F0] border-b border-r border-[#CBD5E1] px-2 py-2 text-[11px] font-bold text-[#334155] uppercase tracking-tight text-center"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => {
                  const isHeader = row.original.isHeader;
                  const isSubtotal = row.original.isSubtotal;
                  const isGrandTotal = row.original.isGrandTotal;
                  const isSummaryRow = row.original.isSummaryRow;
                  const isSpacer = row.original.isSpacer;
                  const isSmallSpacer = row.original.isSmall;
                  const variant = row.original.variant;

                  if (isSpacer) {
                    return (
                      <tr key={row.id} className={clsx(isSmallSpacer ? "h-2" : "h-4", "bg-slate-50/50")}>
                        <td colSpan={columns.length} className="border-b border-r border-[#CBD5E1]"></td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={row.id}
                      style={isHeader ? { 
                        background: row.original.color 
                          ? `linear-gradient(to right, ${row.original.color}15, ${row.original.color}05)` 
                          : '#F1F5F9' 
                      } : {}}
                      className={clsx(
                        "transition-colors h-7",
                        isHeader ? "" : "hover:bg-slate-50",
                        (isSubtotal || variant === 'grey') && "bg-[#F1F5F9] font-bold text-slate-900 border-t border-slate-300",
                        variant === 'dark-grey' && "bg-[#E2E8F0] font-black text-slate-900 border-t border-slate-400",
                        variant === 'white' && "bg-white text-slate-800",
                        variant === 'dark' && "bg-[#1E293B] text-white font-bold",
                        variant === 'dark-ext' && "bg-[#0F172A] text-white font-bold"
                      )}
                    >
                      {row.getVisibleCells().map(cell => {
                        const rowData = row.original;
                        const isFirstCell = cell.column.id === 'code';
                        
                        return (
                          <td 
                            key={cell.id}
                            className={clsx(
                              "border-b border-r border-[#CBD5E1] p-0",
                              (variant === 'dark' || variant === 'dark-ext') && "border-[#334155]",
                              (isSubtotal || variant === 'grey' || variant === 'dark-grey') && "border-slate-300"
                            )}
                          >
                            {isHeader ? (
                              isFirstCell ? (
                                 <div className="px-3 py-0.5 flex items-center gap-2">
                                    <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: rowData.color || '#6366f1' }}></div>
                                    <span className="font-extrabold text-[#1E293B] text-[11px] whitespace-nowrap">{rowData.divisionName}</span>
                                 </div>
                              ) : null
                            ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

