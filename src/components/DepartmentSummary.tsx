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
    const updateSummaryNote = useAppStore(state => state.updateSummaryNote);
    const field = column.columnDef.meta?.field;
  
    React.useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
  
    const onBlur = () => {
      if (value !== initialValue) {
        if (row.original.isSummaryRow) {
          updateSummaryNote(row.original.id, value);
        } else if (field) {
          updateDepartment(row.original.deptId, field, value);
        }
      }
    };
  
    return (
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={onBlur}
        className={clsx(
          "w-full bg-transparent outline-none px-2 py-1 text-[13px] min-h-[28px]",
          row.original.isSummaryRow ? "text-slate-400 italic" : "text-slate-700" 
        )}
        placeholder=""
      />
    );
  };
  
  const EditableSummaryCell = ({ initialValue, stageId, floorId, isTotal }: { initialValue: number, stageId: string, floorId: string, isTotal?: boolean }) => {
    const formatValue = (num: number) => {
      if (num === 0) return '0';
      return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    };

    const [displayValue, setDisplayValue] = React.useState(formatValue(initialValue));
    const updateFloorArea = useAppStore(state => state.updateFloorArea);
  
    React.useEffect(() => {
      setDisplayValue(formatValue(initialValue));
    }, [initialValue]);
  
    const onBlur = () => {
      const cleanValue = displayValue.replace(/,/g, '');
      const num = parseFloat(cleanValue);
      if (!isNaN(num) && num !== initialValue) {
        updateFloorArea(stageId, floorId, num);
      }
      setDisplayValue(formatValue(isNaN(num) ? 0 : num));
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '' || raw === '-') {
        setDisplayValue(raw);
        return;
      }
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        // If it ends with a dot, or has a dot with nothing after yet, keep it raw-ish
        if (raw.includes('.')) {
          const [int, dec] = raw.split('.');
          const formattedInt = parseInt(int || '0').toLocaleString('ko-KR');
          setDisplayValue(`${formattedInt}.${dec !== undefined ? dec : ''}`);
        } else {
          setDisplayValue(num.toLocaleString('ko-KR'));
        }
      }
    };
  
    return (
      <input
        value={displayValue === '0' ? '' : displayValue}
        onChange={onChange}
        onBlur={onBlur}
        className={clsx(
          "w-full bg-transparent text-right outline-none px-4 py-0 font-inter text-[14px] tracking-tighter hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded",
          isTotal ? "font-bold text-slate-900" : "text-slate-800"
        )}
        placeholder="0"
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
    summaryNotes,
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
    rows.push({
      id: 'spacer-grand-total',
      isSpacer: true,
      isSmall: false
    });

    const targetGrandVal = grandStageTotals[targetStageId] || 0;
    const baseGrandVal = grandStageTotals[baseStageId] || 0;

    rows.push({
      id: 'grand-total',
      isGrandTotal: true,
      code: '가',
      department: '의료시설 전용면적 합계',
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
      // Formula: (가+나)/가
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
      notes: summaryNotes['common-area-sum'] ?? '[참고 1] 종합병원 적정 공용비/공용면적 검토',
      variant: 'white',
      noBold: true
    });

    rows.push({
      id: 'gn-ratio',
      isSummaryRow: true,
      code: '(가+나)/가',
      department: '공용비(G/N비)',
      stageAreas: gnRatioStageTotals,
      diff: 0,
      isRatio: true,
      notes: summaryNotes['gn-ratio'] ?? '종합병원 평균값 1.50~1.60 사잇값으로 제안',
      variant: 'white',
      noBold: true
    });

    rows.push({
      id: 'med-area-sum',
      isSummaryRow: true,
      code: '가+나',
      department: '의료시설 면적',
      stageAreas: medAreaSumStageTotals,
      diff: medAreaSumStageTotals[targetStageId] - medAreaSumStageTotals[baseStageId],
      notes: summaryNotes['med-area-sum'] ?? '',
      variant: 'grey'
    });

    rows.push({
      id: 'garage-area',
      isSummaryRow: true,
      code: '다',
      department: '옥내 주차공간',
      stageAreas: garageAreaStageTotals,
      diff: garageAreaStageTotals[targetStageId] - garageAreaStageTotals[baseStageId],
      notes: summaryNotes['garage-area'] ?? '주차대수 100대 내외 계획하여 면적 제안',
      variant: 'white',
      noBold: true
    });

    rows.push({
      id: 'med-total-area',
      isSummaryRow: true,
      code: '가+나+다',
      department: '의료시설 총면적',
      stageAreas: medTotalAreaStageTotals,
      diff: medTotalAreaStageTotals[targetStageId] - medTotalAreaStageTotals[baseStageId],
      notes: summaryNotes['med-total-area'] ?? '',
      variant: 'dark-grey'
    });

    rows.push({
      id: 'outdoor-area',
      isSummaryRow: true,
      code: '라',
      department: '옥외 공용면적',
      stageAreas: outdoorAreaStageTotals,
      diff: outdoorAreaStageTotals[targetStageId] - outdoorAreaStageTotals[baseStageId],
      notes: summaryNotes['outdoor-area'] ?? '-',
      variant: 'white',
      noBold: true
    });

    rows.push({
      id: 'permit-area',
      isSummaryRow: true,
      code: '가~라',
      department: '건축허가 면적',
      stageAreas: permitAreaStageTotals,
      diff: permitAreaStageTotals[targetStageId] - permitAreaStageTotals[baseStageId],
      notes: summaryNotes['permit-area'] ?? '',
      variant: 'dark-grey'
    });

    return rows;
  }, [divisions, departments, rooms, values, stages, floorAreasByStage, summaryNotes, visibleStageIds, comparison]);

  const formatNum = (val: number | undefined | null, isRatio = false) => {
    if (val === undefined || val === null || isNaN(val) || val === 0) {
      if (isRatio) return "-";
      // For normal areas, 0 might be valid, but in summary table if it's not set it might be better to show '-' or '0'
      // Given the screenshot shows '-' for gnRatio when not calculated, I'll return '-' for 0 ratio.
      return val === 0 ? "0" : "-";
    }
    if (isRatio) return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      columnHelper.accessor('code', {
        header: '코 드',
        cell: info => {
          const row = info.row.original;
          if (row.isHeader || row.isSpacer) return null;
          if (row.isSubtotal) return null;
          
          return (
            <div className={clsx(
              "text-center font-inter text-[13px] py-1",
              (row.isGrandTotal || (row.isSummaryRow && !row.noBold)) ? "font-bold text-slate-900" : "text-slate-500"
            )}>
              {info.getValue() || ''}
            </div>
          );
        },
        size: 70,
      }),
      columnHelper.accessor('department', {
        header: '부 서 명',
        cell: info => {
          const row = info.row.original;
          const val = info.getValue() as string;
          return (
            <div className={clsx(
              "px-4 py-1 text-[14px]",
              (row.isSubtotal || row.isGrandTotal || (row.isSummaryRow && !row.noBold)) ? "font-black" : "font-semibold text-slate-700",
              "flex items-center gap-2"
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
          header: () => (
            <div className="flex items-center justify-center gap-1.5 px-1">
              {s.code && (
                <span className="flex items-center justify-center bg-slate-700 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full shadow-sm shrink-0">
                  {s.code}
                </span>
              )}
              <span className="tracking-tight whitespace-nowrap">{s.name}</span>
            </div>
          ),
          cell: info => {
            const row = info.row.original;
            const val = row.stageAreas?.[s.id] as number;
            if (row.isHeader || row.isSpacer) return null;
            
            // Allow editing Permit Area for "Total Area Only" stages (like Competition Guidelines)
            if (row.id === 'permit-area' && s.isTotalAreaOnly) {
              return <EditableSummaryCell initialValue={val} stageId={s.id} floorId="_TOTAL_" isTotal={true} />;
            }
            
            // Summary rows might only have specific stages populated (all summary rows now populate all stages in my logic above)
            if (row.isSummaryRow && val === undefined) return <div className="text-right px-4 font-inter text-[14px]">-</div>;

            return (
              <div className={clsx(
                "text-right px-4 font-inter text-[14px] tracking-tighter",
                (row.isSubtotal || row.isGrandTotal || (row.isSummaryRow && !row.noBold)) && "font-bold"
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
              "text-right px-4 font-inter text-[14px] tracking-tighter font-bold",
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
            <table id="pdf-export-table" className="w-full border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="bg-[#E2E8F0] border-b border-r border-[#CBD5E1] px-2 py-2 text-[12px] font-bold text-[#334155] uppercase tracking-tight text-center"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => {
                  const rowData = row.original;
                  const isHeader = rowData.isHeader;
                  const isSubtotal = rowData.isSubtotal;
                  const isGrandTotal = rowData.isGrandTotal;
                  const isSummaryRow = rowData.isSummaryRow;
                  const isSpacer = rowData.isSpacer;
                  const isSmallSpacer = rowData.isSmall;
                  const variant = rowData.variant;

                  if (isSpacer) {
                    return (
                      <tr key={row.id} className={clsx(isSmallSpacer ? "h-2" : "h-[28px]", !isSmallSpacer ? "bg-white" : "bg-slate-50/50")}>
                        <td colSpan={columns.length} className={clsx(!isSmallSpacer ? "border-none" : "border-b border-r border-[#CBD5E1]")}></td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={row.id}
                      style={isHeader ? { 
                        background: rowData.color 
                          ? `linear-gradient(to right, ${rowData.color}15, ${rowData.color}05)` 
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
                      {isHeader ? (
                        <td 
                          colSpan={columns.length}
                          className="border-b border-[#CBD5E1] p-0"
                        >
                           <div className="px-3 py-1.5 flex items-center gap-2">
                              {rowData.color || rowData.divColor ? (
                                <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: rowData.color || rowData.divColor }}></div>
                              ) : null}
                              <span className="font-extrabold text-slate-800 text-[14px] tracking-tight">{rowData.divisionName}</span>
                           </div>
                        </td>
                      ) : (
                        row.getVisibleCells().map(cell => {
                          return (
                            <td 
                              key={cell.id}
                              className={clsx(
                                "border-b border-r border-[#CBD5E1] p-0",
                                (variant === 'dark' || variant === 'dark-ext') && "border-[#334155]",
                                (isSubtotal || variant === 'grey' || variant === 'dark-grey') && "border-slate-300"
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })
                      )}
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

