import { useMemo } from "react";
import { useAppStore, getFloorVal, findRoomNote } from "@/store/useAppStore";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef, useState } from "react";
import { clsx } from "clsx";
import { Download, ChevronDown, RotateCcw, Filter, Users, Edit3, Check, X } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import DisplaySettings from "./DisplaySettings";
import SelectorPopover from "./SelectorPopover";

// Dummy base64 for real Pretendard, in real env this must be full base64 TTF.
const pretendardBase64 = "AAEAAAA...";

const columnHelper = createColumnHelper<any>();

const formatNum = (val: number | string | undefined | null, stages: any[], stageId?: string) => {
  if (val === undefined || val === null) return "-";
  if (typeof val === "string") return val;
  if (isNaN(val)) return "-";
  
  const stage = stages.find(s => s.id === stageId);
  const isGuideline = stage?.code === 'A';

  if (isGuideline) {
    return Math.round(val).toLocaleString("ko-KR");
  }

  return val.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatQty = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "";
  if (num === 0) return "";
  
  return num.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const EditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = React.useState<any>(initialValue);
  const [isFocused, setIsFocused] = React.useState(false);
  const updateValue = useAppStore((state) => state.updateValue);
  const stages = useAppStore((state) => state.stages);
  const meta = column.columnDef.meta;
  const stageId = meta?.stageId;
  const rowData = row.original;
  const isEmpty = stageId ? rowData[`${stageId}_isEmpty`] : false;
  const isGrouped = rowData.isGrouped;

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsFocused(false);
    if (value !== initialValue && stageId && meta?.field && !isGrouped) {
      updateValue(rowData.id, stageId, meta.field, Number(value));
    }
  };

  const onFocus = () => {
    setIsFocused(true);
  };

  if (isEmpty && !rowData.isSummary) {
    return <div className="w-full h-full stripe-pattern min-h-[26px]" />;
  }

  const isQty = meta?.field === "quantity";

  // If grouped, show as read-only text div to prevent confusing edits
  if (isGrouped) {
    return (
      <div className={clsx(
        "w-full h-full text-right py-1.5 px-1 font-mono text-[12px] flex items-center justify-end",
        meta?.isLast ? "text-indigo-600 font-semibold" : "text-slate-500"
      )}>
        {value === 0 || value === null ? "" : (
          isQty ? formatQty(value) : (
            meta?.stageId ? formatNum(value, stages, meta.stageId) : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
          )
        )}
      </div>
    );
  }

  const displayVal = isFocused
    ? ((value === 0 || value === null || value === "") ? "" : value)
    : (isQty ? formatQty(value) : (
        (value === 0 || value === null || value === "") ? "" : (
          meta?.stageId ? formatNum(value, stages, meta.stageId) : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
        )
      ));

  return (
    <input
      value={displayVal}
      onChange={(e) => setValue(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={clsx(
        "w-full h-full bg-transparent outline-none text-right placeholder:text-transparent py-2 px-1 font-mono text-[13px]",
        meta?.isLast ? "text-indigo-600" : "text-slate-500",
        "focus:bg-yellow-50 focus:ring-1 focus:ring-indigo-400",
      )}
    />
  );
};

const EditableNoteCell = ({ getValue, row }: any) => {
  const initialValue = getValue();
  const [value, setValue] = React.useState(initialValue || "");
  const updateRoomNote = useAppStore((state) => state.updateRoomNote);
  const roomId = row.original.isGrouped ? row.original.originalRoomIds : row.original.id;

  React.useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      updateRoomNote(roomId, value);
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      placeholder=""
      className={clsx(
        "w-full h-full bg-transparent outline-none py-1.5 px-2 text-[12px] text-slate-700",
        "focus:bg-yellow-50 focus:ring-1 focus:ring-indigo-400"
      )}
    />
  );
};

const WardCountEditor = ({ floorId, deptId, initialValue }: { floorId: string; deptId: string; initialValue: number }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(initialValue.toString());
  const setFloorWardOverride = useAppStore(state => state.setFloorWardOverride);

  if (floorId === "all") return null;

  if (isEditing) {
    return (
      <div className="flex items-center ml-2 gap-1 bg-white border border-indigo-200 rounded px-1 py-0.5 shadow-sm">
        <input 
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-8 h-4 text-[10px] text-center font-bold text-indigo-600 outline-none"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setFloorWardOverride(floorId, deptId, parseInt(val) || 1);
              setIsEditing(false);
            }
          }}
        />
        <button 
          onClick={() => {
            setFloorWardOverride(floorId, deptId, parseInt(val) || 1);
            setIsEditing(false);
          }}
          className="p-0.5 hover:bg-green-50 text-green-600 rounded"
        >
          <Check size={10} />
        </button>
        <button 
          onClick={() => setIsEditing(false)}
          className="p-0.5 hover:bg-red-50 text-red-500 rounded"
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => {
        setVal(initialValue.toString());
        setIsEditing(true);
      }}
      className="ml-2 group flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 transition-all cursor-pointer"
    >
      <span className="text-[10px] text-indigo-600 font-bold italic tracking-tight">
        ({initialValue}개 병동으로 구성)
      </span>
      <Edit3 size={10} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default function DetailTable() {
  const {
    floors,
    activeFloorId,
    setActiveFloorId,
    divisions,
    departments,
    rooms,
    values,
    stages,
    filters,
    visibleStageIds,
    comparison,
    medicalOnly,
    floorWardOverrides,
    isPdfExportMode,
    roomNotes,
  } = useAppStore();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const getWardCount = (floorId: string, deptId: string) => {
    // 1. Check for manual override in store
    const override = floorWardOverrides[`${floorId}|${deptId}`];
    if (override !== undefined) return override;

    // 2. Default logic: Try to parse from department name
    const dept = departments.find(d => d.id === deptId);
    if (dept && deptId === "101") {
       const rangeMatch = dept.name.match(/(\d+)\s*[~-]\s*(\d+)/);
       if (rangeMatch) {
         const start = parseInt(rangeMatch[1]);
         const end = parseInt(rangeMatch[2]);
         if (!isNaN(start) && !isNaN(end) && end >= start) return end - start + 1;
       }
       
       // 3. Fallback: look in ANY room's note for this floor
       const roomsInDept = rooms.filter(r => r.departmentId === deptId && (floorId === "all" || r.floorId.toUpperCase().replace(/F$/i, '').trim() === floorId.toUpperCase().replace(/F$/i, '').trim()));
       for (const r of roomsInDept) {
         const match = r.note?.match(/(\d+)\s*개\s*병동/);
         if (match) return parseInt(match[1]);
       }
    }
    
    return 1;
  };

  const valuesMap = useMemo(() => {
    const map = new Map<string, any>();
    values.forEach((v) => {
      map.set(`${v.roomId}-${v.stageId}`, v);
    });
    return map;
  }, [values]);

  const displayRooms = useMemo(() => {
    if (!activeFloorId) return [];
    
    const deptsMap = new Map(departments.map((d) => [d.id, d]));
    const roomsByFloor =
      activeFloorId === "all"
        ? rooms
        : rooms.filter((r) => r.floorId.toUpperCase().replace(/F$/i, '').trim() === activeFloorId.toUpperCase().replace(/F$/i, '').trim());

    let filteredRooms = roomsByFloor;

    if (medicalOnly) {
      filteredRooms = filteredRooms.filter((r) => {
        const dept = deptsMap.get(r.departmentId);
        if (!dept) return false;
        const divCode = dept.divisionId; 
        return /^\d+$/.test(divCode);
      });
    }

    if (filters.divisionIds.length > 0) {
      filteredRooms = filteredRooms.filter((r) => {
        const d = deptsMap.get(r.departmentId);
        return d && filters.divisionIds.includes(d.divisionId);
      });
    }

    if (filters.departmentIds.length > 0) {
      filteredRooms = filteredRooms.filter((r) =>
        filters.departmentIds.includes(r.departmentId),
      );
    }

    filteredRooms.sort((a, b) => {
      const da = deptsMap.get(a.departmentId)?.order ?? 99;
      const db = deptsMap.get(b.departmentId)?.order ?? 99;
      if (da !== db) return da - db;
      const c = a.no.localeCompare(b.no);
      if (c !== 0) return c;
      const fa = getFloorVal(a.floorId);
      const fb = getFloorVal(b.floorId);
      return fb - fa;
    });

    if (activeFloorId === "all") {
      const grouped = new Map<string, any>();
      filteredRooms.forEach((r) => {
        const roomNoKey = r.no ? r.no.trim() : "";
        const key = `${r.departmentId}-${roomNoKey}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            ...r,
            id: `grouped-${key}`,
            isGrouped: true,
            originalRoomIds: [r.id],
            floorId: "All",
            note: r.note || "",
          });
        } else {
          const existing = grouped.get(key);
          existing.originalRoomIds.push(r.id);
          
          if (r.name && existing.name !== r.name) {
            const currentNames = existing.name.split(",").map((n: string) => n.trim()).filter(Boolean);
            const newName = r.name.trim();
            if (!currentNames.includes(newName)) {
              existing.name = [...currentNames, newName].join(", ");
            }
          }
          
          if (r.note && existing.note !== r.note) {
            const currentNotes = existing.note.split(",").map((n: string) => n.trim()).filter(Boolean);
            const newNote = r.note.trim();
            if (!currentNotes.includes(newNote)) {
              existing.note = [...currentNotes, newNote].join(", ");
            }
          }
        }
      });
      return Array.from(grouped.values());
    }

    return filteredRooms;
  }, [activeFloorId, rooms, departments, medicalOnly, filters]);

  const deptSummary = useMemo(() => {
    const summary = new Map<string, Record<string, number>>();
    displayRooms.forEach((r) => {
      if (!summary.has(r.departmentId)) {
        const initial: Record<string, number> = {};
        stages.forEach((s) => (initial[s.id] = 0));
        summary.set(r.departmentId, initial);
      }
      const sums = summary.get(r.departmentId)!;
      const wardCount = activeFloorId === "all" 
        ? 1 
        : (r.departmentId === "101" ? getWardCount(activeFloorId, r.departmentId) : 1);

      const idsToFetch = (r as any).originalRoomIds || [r.id];
      stages.forEach((s) => {
        let roomSum = 0;
        idsToFetch.forEach(rid => {
          const v = valuesMap.get(`${rid}-${s.id}`);
          if (v) roomSum += (v.unitArea || 0) * (v.quantity || 0);
        });
        sums[s.id] += roomSum * wardCount;
      });
    });
    return summary;
  }, [displayRooms, stages, activeFloorId, valuesMap, floorWardOverrides]);

  const flatData = useMemo(() => {
    if (!activeFloorId) return [];

    const baseId = comparison.baseId || stages[0]?.id;
    const targetId = comparison.targetId || stages[stages.length - 1]?.id;

    // Pre-calculate maps
    const deptsMap = new Map(departments.map((d) => [d.id, d]));
    const divsMap = new Map(divisions.map((d) => [d.id, d]));

    const combinedData: any[] = [];
    let lastDeptId: string | null = null;
    const currentGroupValueSums: Record<string, number> = {};

    for (let i = 0; i < displayRooms.length; i++) {
      const r = displayRooms[i];
      const dept = deptsMap.get(r.departmentId);
      const div = dept ? divsMap.get(dept.divisionId) : null;

      const deptChanged = r.departmentId !== lastDeptId;

      if (deptChanged) {
        stages.forEach((s) => (currentGroupValueSums[s.id] = 0));
        const count = getWardCount(activeFloorId ?? "all", r.departmentId);
        const sums = deptSummary.get(r.departmentId) || {};

        combinedData.push({
          id: `header-${r.departmentId}`,
          isGroupHeader: true,
          deptName: dept?.name || "기타",
          wardCount: count,
          departmentId: r.departmentId,
          deptColor: div?.color || "#6366f1",
          ...sums,
        });
        lastDeptId = r.departmentId;
      }

      let activeRoomNote = "";
      if (r.isGrouped && r.originalRoomIds && r.originalRoomIds.length > 0) {
        for (const rid of r.originalRoomIds) {
          const actualRoom = rooms.find(rm => rm.id === rid);
          if (actualRoom) {
            const possibleNote = findRoomNote(roomNotes, actualRoom.no, actualRoom.floorId);
            if (possibleNote) {
              activeRoomNote = possibleNote;
              break;
            }
          }
        }
        if (!activeRoomNote) activeRoomNote = r.note || "";
      } else {
        activeRoomNote = findRoomNote(roomNotes, r.no, r.floorId) || r.note || "";
      }

      const row: any = {
        ...r,
        note: activeRoomNote,
        isSummary: false,
        deptName: dept?.name || "기타",
        deptColor: div?.color || "#6366f1",
      };

      const wardCount = activeFloorId === "all" 
        ? 1 
        : (r.departmentId === "101" ? getWardCount(activeFloorId, r.departmentId) : 1);

      for (const s of stages) {
        let totalUnitArea = 0;
        let totalQuantity = 0;
        let totalArea = 0;
        let hasValue = false;
        let valCount = 0;

        const idsToFetch = (r as any).originalRoomIds || [r.id];
        idsToFetch.forEach((rid) => {
          const val = valuesMap.get(`${rid}-${s.id}`);
          if (val) {
            hasValue = true;
            valCount++;
            totalUnitArea += val.unitArea || 0;
            totalQuantity += val.quantity || 0;
            totalArea += (val.unitArea || 0) * (val.quantity || 0);
          }
        });

        const isEmpty = !hasValue;
        const displayTotal = totalArea * wardCount; // Apply multiplier consistently

        let displayUnitArea = 
            totalQuantity > 0 
            ? totalArea / totalQuantity 
            : (valCount > 0 ? totalUnitArea / valCount : 0);
        let displayQuantity = totalQuantity;

        if (wardCount > 1 && !(r as any).isGrouped) {
          displayQuantity = totalQuantity / wardCount;
        }

        row[`${s.id}_unitArea`] = isEmpty ? null : displayUnitArea;
        row[`${s.id}_quantity`] = isEmpty ? null : displayQuantity;
        row[`${s.id}_total`] = isEmpty ? null : displayTotal;
        row[`${s.id}_isEmpty`] = isEmpty;
        row[`${s.id}_wardCount`] = wardCount;

        if (!isEmpty) {
          currentGroupValueSums[s.id] += displayTotal;
        }
      }

      if (stages.length >= 2) {
        row.variance =
          (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
      }

      combinedData.push(row);

      const nextRoom = displayRooms[i + 1];
      const nextDeptId = nextRoom?.departmentId;

      if (nextDeptId !== r.departmentId) {
        const summary: any = {
          id: `sum-${r.departmentId}`,
          isSummary: true,
          deptName: dept?.name || "",
          departmentId: r.departmentId,
          deptColor: div?.color || "#6366f1",
        };
        for (const s of stages) {
          summary[`${s.id}_total`] = currentGroupValueSums[s.id];
        }

        if (stages.length >= 2) {
          summary.variance =
            (summary[`${targetId}_total`] || 0) -
            (summary[`${baseId}_total`] || 0);
        }

        combinedData.push(summary);
        combinedData.push({
          id: `spacer-${r.departmentId}`,
          isSpacer: true,
          departmentId: r.departmentId,
        });
      }

      lastDeptId = r.departmentId;
    }

    return combinedData;
  }, [
    activeFloorId,
    displayRooms,
    valuesMap,
    deptSummary,
    stages,
    departments,
    divisions,
    comparison,
    roomNotes,
  ]);

  const columns = useMemo(() => {
    const cols: any[] = [
      columnHelper.accessor("no", {
        id: "category",
        header: () => (
          <div className="h-full flex items-center justify-center px-2 text-[11px] font-bold text-[#334155] text-center uppercase tracking-wider">
            NO.
          </div>
        ),
        cell: (info) => (
          <div className="text-center font-inter text-[12px] text-slate-500 h-full flex items-center justify-center">
            {info.getValue()}
          </div>
        ),
        size: 80,
      }),
      columnHelper.accessor("name", {
        header: () => (
          <div className="h-full flex items-center px-4 text-[11px] font-bold text-[#334155] uppercase text-left tracking-wider">
            ROOM NAME
          </div>
        ),
        cell: (info) => (
          <div className="px-2 font-medium text-slate-800 text-[13px] h-full flex items-center">
            {info.getValue()}
          </div>
        ),
        size: 180,
      }),
    ];

    const visibleStages = stages.filter((s) => visibleStageIds.includes(s.id));
    const targetId = comparison.targetId || stages[stages.length - 1]?.id;

    visibleStages.forEach((s) => {
      const isLast = s.id === targetId;
      cols.push(
        columnHelper.group({
          id: s.id,
          meta: { isStageEnd: !isLast },
          header: () => (
            <div
              className={clsx(
                "h-full flex items-center justify-center text-xs font-bold text-center border-b border-[#CBD5E1] uppercase tracking-widest transition-colors text-[#334155] gap-2",
              )}
            >
              {s.code && (
                <span className={clsx(
                  "flex items-center justify-center text-[10px] font-black w-5 h-5 rounded-md shadow-sm border transition-all duration-300",
                  s.id === targetId
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent"
                    : "bg-white text-slate-500 border-slate-300/80"
                )}>
                  {s.code}
                </span>
              )}
              <span className="tracking-tight">{s.name}</span>
            </div>
          ),
          columns: [
            columnHelper.accessor(`${s.id}_unitArea`, {
              header: () => (
                <div className="h-full flex items-center justify-center text-[11px] font-inter font-bold text-slate-600 text-center uppercase tracking-tighter">
                  Net
                </div>
              ),
              size: 60,
              cell: EditableCell,
              meta: { stageId: s.id, field: "unitArea", isLast },
            }),
            columnHelper.accessor(`${s.id}_quantity`, {
              header: () => (
                <div className="h-full flex items-center justify-center text-[11px] font-inter font-bold text-slate-600 text-center uppercase tracking-tighter">
                  Qty
                </div>
              ),
              size: 50,
              cell: EditableCell,
              meta: { stageId: s.id, field: "quantity", isLast },
            }),
            columnHelper.accessor(`${s.id}_total`, {
              header: () => (
                <div className="h-full flex items-center justify-center text-[11px] font-bold text-[#334155] text-center uppercase">
                  Total
                </div>
              ),
              size: 80,
              cell: (info) => {
                const val = info.getValue() as number;
                const row = info.row.original;
                const isEmpty = row[`${s.id}_isEmpty`];
                if (isEmpty && !row.isSummary) {
                  return <div className="w-full h-full stripe-pattern min-h-[26px]" />;
                }
                return (
                  <div className="text-right px-1 font-inter text-[12px] font-semibold h-full flex items-center justify-end">
                    {val !== null && val > 0 ? formatNum(val, stages, s.id) : ""}
                  </div>
                );
              },
              meta: { isLast, isStageEnd: !isLast, isTotal: true, stageId: s.id },
            }),
          ],
        }),
      );
    });

    if (stages.length >= 2) {
      const bId = comparison.baseId || stages[0]?.id;
      const tId = comparison.targetId || stages[stages.length - 1]?.id;

      const bStage = stages.find((s) => s.id === bId);
      const tStage = stages.find((s) => s.id === tId);
      const baseLabel =
        bStage?.code || bStage?.name?.match(/\[(.*?)\]/)?.[1] || "BASE";
      const targetLabel =
        tStage?.code || tStage?.name?.match(/\[(.*?)\]/)?.[1] || "TARGET";
      cols.push(
        columnHelper.group({
          id: "group_variance",
          header: () => (
            <div className="h-full flex items-center justify-center border-b border-[#CBD5E1] p-0.5">
              <div className="flex items-center justify-center text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-500 text-white shadow-sm border border-slate-600/10 tracking-tight leading-none">
                {targetLabel}-{baseLabel}
              </div>
            </div>
          ),
          columns: [
            columnHelper.accessor("variance", {
              header: () => (
                <div className="h-full flex items-center justify-center text-[11px] font-bold text-slate-600 text-center uppercase tracking-tighter">
                  증감
                </div>
              ),
              size: 85,
              cell: (info) => {
                const val = info.getValue() as number;
                if (val === 0)
                  return (
                    <div className="text-right px-1 font-inter text-[12px] font-bold text-slate-400 h-full flex items-center justify-end">
                      0.00
                    </div>
                  );
                return (
                  <div
                    className={clsx(
                      "text-right px-1 font-inter text-[12px] font-bold h-full flex items-center justify-end",
                      val > 0 ? "text-blue-600" : "text-red-500",
                    )}
                  >
                    {val > 0 ? "+" : ""}
                    {formatNum(val, stages)}
                  </div>
                );
              },
            }),
          ],
        }),
      );
    }

    cols.push(
      columnHelper.accessor("note", {
        header: () => (
          <div className="h-full flex items-center px-4 text-[11px] font-bold text-[#334155] uppercase text-left tracking-wider">
            Note
          </div>
        ),
        size: 800,
        minSize: 300,
        cell: (info) => {
          return <EditableNoteCell getValue={info.getValue} row={info.row} />;
        },
      }),
    );

    return cols;
  }, [stages, visibleStageIds, comparison, floorWardOverrides, departments, rooms, activeFloorId, roomNotes]);

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
  });

  const { rows } = table.getRowModel();

  const rangeExtractor = React.useCallback(
    (range: any) => {
      let activeIndex = -1;
      for (let i = range.startIndex; i >= 0; i--) {
        if (rows[i]?.original?.isGroupHeader) {
          activeIndex = i;
          break;
        }
      }

      const sequence = [];
      for (let i = range.startIndex; i <= range.endIndex; i++) {
        sequence.push(i);
      }

      const withSticky = new Set(
        [activeIndex, ...sequence].filter((x) => x >= 0),
      );
      return Array.from(withSticky).sort((a, b) => a - b);
    },
    [rows],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      const row = rows[index].original;
      if (row.isFloorHeader) return 36;
      if (row.isGroupHeader) return 30;
      if (row.isSpacer) return 12;
      if (row.isSummary) return 26;
      return 26;
    },
    overscan: isPdfExportMode ? rows.length : 200,
    rangeExtractor,
  });

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    doc.text("의료시설 세부 면적계획", 14, 15);
    (doc as any).autoTable({
      html: "#area-table",
      startY: 20,
      styles: { font: "helvetica", fontSize: 8, fontStyle: "normal" }, // Pretentard would be used here
      theme: "grid",
    });
    doc.save("area-report.pdf");
  };

  const sortedFloors = useMemo(() => {
    return [...floors].sort((a, b) => {
      const getVal = (name: string) => {
        const match = name.match(/([A-Z]+)?(\d+)?([A-Z]+)?/);
        if (!match) return 0;
        const prefix = match[1] || "";
        const num = parseInt(match[2] || "0");

        if (prefix === "B") return -num;
        return num;
      };
      return getVal(a.name) - getVal(b.name);
    });
  }, [floors]);

  const filteredDivisions = useMemo(() => {
    if (!medicalOnly) return divisions;
    return divisions.filter(d => /^\d+$/.test(d.id));
  }, [divisions, medicalOnly]);

  const filteredDepartmentsBySelection = useMemo(() => {
    let res = departments;
    if (medicalOnly) {
      res = res.filter(d => /^\d+$/.test(d.divisionId));
    }
    return res.filter(
      (d) =>
        filters.divisionIds.length === 0 ||
        filters.divisionIds.includes(d.divisionId)
    );
  }, [departments, filters.divisionIds, medicalOnly]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Tab Navigator & Filters */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0 mb-6 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1 bg-lv2 p-1 rounded-lg">
          <button
            onClick={() => setActiveFloorId("all")}
            className={clsx(
              "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
              activeFloorId === "all"
                ? "bg-white shadow-sm text-indigo-600"
                : "text-slate-500 hover:text-slate-800 hover:bg-lv2/50",
            )}
          >
            전체
          </button>
          <div className="w-px h-4 bg-slate-300/50 mx-1"></div>
          {sortedFloors.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFloorId(f.id)}
              className={clsx(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                activeFloorId === f.id
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-slate-500 hover:text-slate-800 hover:bg-lv2/50",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <SelectorPopover
              placeholder="부문 전체"
              options={[{ id: "", name: "부문 전체" }, ...filteredDivisions]}
              value={filters.divisionIds[0] || ""}
              onChange={(val) => {
                useAppStore.setState((state) => ({
                  filters: {
                    ...state.filters,
                    divisionIds: val ? [val] : [],
                    departmentIds: [],
                  },
                }));
              }}
              icon={<Filter size={13} />}
              className="bg-white w-[140px] shrink-0"
            />

            <SelectorPopover
              placeholder="부서 전체"
              options={[
                { id: "", name: "부서 전체" },
                ...filteredDepartmentsBySelection,
              ]}
              value={filters.departmentIds[0] || ""}
              onChange={(val) => {
                useAppStore.setState((state) => ({
                  filters: {
                    ...state.filters,
                    departmentIds: val ? [val] : [],
                  },
                }));
              }}
              icon={<Users size={13} />}
              className="bg-white w-[160px] shrink-0"
            />
          </div>

          <button
            onClick={() =>
              useAppStore.setState({
                filters: { divisionIds: [], departmentIds: [] },
                activeFloorId: "all",
              })
            }
            className="flex items-center justify-center p-1.5 h-[30px] w-[30px] bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95 outline-none shrink-0"
            title="필터 초기화"
          >
            <RotateCcw size={13} />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <DisplaySettings />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full bg-white border border-slate-300 rounded shadow-sm flex flex-col relative overflow-hidden">
          <div ref={tableContainerRef} className="flex-1 overflow-auto">
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              className="relative w-full min-w-full"
            >
              <table
                className={clsx(
                  "border-separate border-spacing-0 table-fixed w-full",
                  !isPdfExportMode && "text-[11px]"
                )}
                style={{ minWidth: table.getTotalSize() }}
              >
                <thead className="sticky top-0 z-40 bg-[#E2E8F0] shadow-[0_1px_0_0_#CBD5E1]">
                  {table.getHeaderGroups().map((hg, rowIndex) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header: any, i) => {
                        // Skip rendering standalone columns in the bottom row if they were merged from top
                        const isStandalone =
                          !header.column.columns && !header.column.parent;
                        if (
                          rowIndex > 0 &&
                          (header.isPlaceholder || isStandalone)
                        )
                          return null;

                        const isSticky = i < 2;
                        const left = isSticky ? header.getStart() : undefined;

                        const rowSpan = isStandalone && rowIndex === 0 ? 2 : 1;

                        return (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            rowSpan={rowSpan}
                            style={{
                              width: header.getSize(),
                              height:
                                header.depth === 0
                                  ? rowSpan === 2
                                    ? "62px"
                                    : "36px"
                                  : "26px",
                              left:
                                left !== undefined ? `${left}px` : undefined,
                              zIndex: isSticky ? 30 : undefined,
                            }}
                            className={clsx(
                              "relative border-b border-[#CBD5E1] p-0 text-[#334155] select-none uppercase text-[10px] bg-[#E2E8F0]",
                              header.column.columnDef.meta?.isStageEnd &&
                                "border-r-2 border-[#CBD5E1]",
                              (header.column.id === "variance" ||
                                header.column.id === "group_variance" ||
                                header.column.id === "note") &&
                                "border-l-2 border-[#CBD5E1]",
                              isSticky &&
                                [0, 1].includes(i) &&
                                "sticky bg-[#E2E8F0] shadow-[inset_-1px_0_0_0_#CBD5E1]",
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={clsx(
                                "absolute right-0 top-0 h-full w-1 cursor-col-resize user-select-none hover:bg-slate-300",
                                header.column.getIsResizing()
                                  ? "bg-indigo-500"
                                  : "",
                              )}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white">
                  {isPdfExportMode ? (
                    rows.map((row) => {
                      const { isSummary, isSpacer, isGroupHeader } = row.original;

                      if (isSpacer) {
                        return (
                          <tr
                            key={row.id}
                            className="bg-slate-50/50"
                            style={{ height: "12px", pageBreakInside: "avoid", breakInside: "avoid" }}
                          >
                            <td
                              colSpan={table.getVisibleLeafColumns().length}
                              className="border-b border-slate-100 border-r border-slate-200"
                            />
                          </tr>
                        );
                      }

                      if (isGroupHeader) {
                        return (
                          <tr
                            key={row.id}
                            className="bg-slate-50 border-b border-slate-200"
                            style={{ height: "30px", pageBreakInside: "avoid", breakInside: "avoid" }}
                          >
                            <td
                              colSpan={table.getVisibleLeafColumns().length}
                              className="py-1 px-4 text-[12px] font-bold text-slate-900 border-b border-lv4 bg-lv2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                            >
                              <div className="flex items-center w-fit">
                                <div
                                  className="w-2 h-4 rounded-full mr-3 shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                                  style={{
                                    backgroundColor: row.original.deptColor || "#6366f1",
                                  }}
                                ></div>
                                <span className="tracking-tight uppercase text-slate-900 font-extrabold text-[13px]">
                                  [{row.original.deptName}]
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={row.id}
                          className={clsx(
                            "group transition-colors",
                            isSummary ? "border-lv4 bg-lv2/60" : "bg-white"
                          )}
                          style={{ height: "26px", pageBreakInside: "avoid", breakInside: "avoid" }}
                        >
                          {row.getVisibleCells().map((cell: any, i) => {
                            const isTotal = cell.column.columnDef.meta?.isTotal;
                            const isLast = cell.column.columnDef.meta?.isLast;

                            return (
                              <td
                                key={cell.id}
                                style={{
                                  width: cell.column.getSize(),
                                  maxWidth: cell.column.getSize(),
                                }}
                                className={clsx(
                                  "overflow-hidden p-0 m-0",
                                  !isSummary && "border-b border-slate-200/70",
                                  cell.column.id === "name" && "border-r border-lv1",
                                  isSummary && "py-0 border-b border-slate-300 text-slate-900 h-[26px]",
                                  cell.column.columnDef.meta?.isStageEnd && "border-r-2 border-lv4",
                                  (cell.column.id === "variance" || cell.column.id === "note") && "border-l-2 border-lv4",
                                  !isSummary && isTotal && !isLast && "bg-lv1 text-slate-700 font-medium",
                                  !isSummary && isTotal && isLast && "bg-indigo-100/40 text-indigo-900 font-bold",
                                  isSummary && (cell.column.id.includes("_total") || cell.column.id === "variance") && "text-right font-bold font-inter",
                                  isSummary && cell.column.id === "variance" && (
                                    row.original.variance > 0 ? "text-blue-600" : row.original.variance < 0 ? "text-red-500" : "text-slate-400"
                                  ),
                                )}
                              >
                                {!isSummary && flexRender(cell.column.columnDef.cell, cell.getContext())}
                                {isSummary && cell.column.id === "name" && (
                                  <div className="text-[13px] font-bold text-slate-800 whitespace-nowrap px-4 flex items-center h-[26px]">
                                    [{row.original.deptName} 소계]
                                  </div>
                                )}
                                {isSummary && cell.column.id.includes("_total") && (
                                  <div className={clsx(
                                    "font-inter text-[12px] h-[26px] flex items-center justify-end px-1",
                                    isLast ? "text-indigo-900 font-bold" : "text-slate-700 font-bold"
                                  )}>
                                    {formatNum(
                                      row.original[cell.column.id] || 0,
                                      stages,
                                      cell.column.id.replace("_total", "")
                                    )}
                                  </div>
                                )}
                                {isSummary && cell.column.id === "variance" && (
                                  <div className={clsx(
                                    "font-inter text-[12px] font-bold h-[26px] flex items-center justify-end px-1",
                                    row.original.variance > 0 ? "text-blue-600" : row.original.variance < 0 ? "text-red-500" : "text-slate-400"
                                  )}>
                                    {row.original.variance > 0 ? "+" : ""}
                                    {formatNum(row.original.variance || 0, stages)}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      {rowVirtualizer
                      .getVirtualItems()
                      .map((virtualRow, index, items) => {
                        const row = rows[virtualRow.index];
                        const { isSummary, isSpacer, isGroupHeader } =
                          row.original;

                        const prevItem = items[index - 1];
                        const gap = prevItem
                          ? virtualRow.start - (prevItem.start + prevItem.size)
                          : virtualRow.start;

                        if (isSpacer) {
                          return (
                            <React.Fragment key={virtualRow.key}>
                              {gap > 0 && (
                                <tr style={{ height: `${gap}px` }}>
                                  <td
                                    colSpan={table.getVisibleLeafColumns().length}
                                    className="p-0 border-0"
                                  />
                                </tr>
                              )}
                              <tr
                                ref={rowVirtualizer.measureElement}
                                data-index={virtualRow.index}
                                className="bg-slate-50/50"
                                style={{ height: "12px" }}
                              >
                                <td
                                  colSpan={table.getVisibleLeafColumns().length}
                                  className="border-b border-slate-100 border-r border-slate-200"
                                />
                              </tr>
                            </React.Fragment>
                          );
                        }

                        if (isGroupHeader) {
                          return (
                            <React.Fragment key={virtualRow.key}>
                              {gap > 0 && (
                                <tr style={{ height: `${gap}px` }}>
                                  <td
                                    colSpan={table.getVisibleLeafColumns().length}
                                    className="p-0 border-0"
                                  />
                                </tr>
                              )}
                              <tr
                                ref={rowVirtualizer.measureElement}
                                data-index={virtualRow.index}
                                className="sticky z-20 shadow-sm top-[52px]"
                                style={{ height: "30px" }}
                              >
                                <td
                                  colSpan={table.getVisibleLeafColumns().length}
                                  className="py-1 px-4 text-[12px] font-bold text-slate-900 border-b border-lv4 bg-lv2 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                                >
                                  <div className="flex items-center sticky left-4 w-fit">
                                    <div
                                      className="w-2 h-4 rounded-full mr-3 shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-300"
                                      style={{
                                        backgroundColor:
                                          row.original.deptColor || "#6366f1",
                                      }}
                                    ></div>
                                    <span className="tracking-tight uppercase text-slate-900 font-extrabold text-[13px]">
                                      [{row.original.deptName}]
                                    </span>
                                    {activeFloorId !== "all" && row.original.departmentId === "101" && (
                                      <WardCountEditor 
                                        floorId={activeFloorId!} 
                                        deptId={row.original.departmentId} 
                                        initialValue={row.original.wardCount} 
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        }

                        return (
                          <React.Fragment key={virtualRow.key}>
                            {gap > 0 && (
                              <tr style={{ height: `${gap}px` }}>
                                <td
                                  colSpan={table.getVisibleLeafColumns().length}
                                  className="p-0 border-0"
                                />
                              </tr>
                            )}
                            <tr
                              ref={rowVirtualizer.measureElement}
                              data-index={virtualRow.index}
                              className={clsx(
                                "group transition-colors",
                                isSummary
                                  ? "border-lv4"
                                  : "bg-white hover:bg-lv1",
                              )}
                              style={{ height: "26px" }}
                            >
                              {row.getVisibleCells().map((cell: any, i) => {
                                const isSticky = i < 2;
                                const left = isSticky
                                  ? cell.column.getStart()
                                  : undefined;
                                const isTotal =
                                  cell.column.columnDef.meta?.isTotal;
                                const isLast = cell.column.columnDef.meta?.isLast;

                                return (
                                  <td
                                    key={cell.id}
                                    style={{
                                      width: cell.column.getSize(),
                                      maxWidth: cell.column.getSize(),
                                      left:
                                        left !== undefined
                                          ? `${left}px`
                                          : undefined,
                                      zIndex: isSticky ? 10 : undefined,
                                    }}
                                    className={clsx(
                                      "overflow-hidden p-0 m-0",
                                      !isSummary && "border-b border-slate-200/70",
                                      cell.column.id === "name" &&
                                        "border-r border-lv1",
                                      isSummary &&
                                        "py-0 border-b border-slate-300 text-slate-900 h-[26px]",
                                      isSummary && !isSticky && "bg-lv2/80",
                                      cell.column.columnDef.meta?.isStageEnd &&
                                        "border-r-2 border-lv4",
                                      (cell.column.id === "variance" ||
                                        cell.column.id === "note") &&
                                        "border-l-2 border-lv4",
                                      isSticky &&
                                        !isSummary &&
                                        "sticky bg-white shadow-[inset_-1px_0_0_0_#DEE2E6]",
                                      !isSummary &&
                                        isSticky &&
                                        "group-hover:bg-lv1",
                                      isSummary &&
                                        isSticky &&
                                        "sticky shadow-[inset_-1px_0_0_0_#DEE2E6,inset_0_-1px_0_rgba(0,0,0,0.05)]",
                                      isSummary && isSticky && "bg-lv2",
                                      !isSummary &&
                                        isTotal &&
                                        !isLast &&
                                        "bg-lv1 text-slate-700 font-medium",
                                      !isSummary &&
                                        isTotal &&
                                        isLast &&
                                        "bg-indigo-100/40 text-indigo-900 font-bold",
                                      isSummary &&
                                        (cell.column.id.includes("_total") ||
                                          cell.column.id === "variance") &&
                                        "text-right font-bold font-inter",
                                      isSummary &&
                                        cell.column.id === "variance" &&
                                        (row.original.variance > 0
                                          ? "text-blue-600"
                                          : row.original.variance < 0
                                            ? "text-red-500"
                                            : "text-slate-400"),
                                    )}
                                  >
                                    {!isSummary &&
                                      flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext(),
                                      )}
                                    {isSummary && cell.column.id === "name" && (
                                      <div className="text-[13px] font-bold text-slate-800 whitespace-nowrap px-4 opacity-100 flex items-center h-[26px]">
                                        [{row.original.deptName} 소계]
                                      </div>
                                    )}
                                    {isSummary &&
                                      cell.column.id.includes("_total") && (
                                        <div className={clsx(
                                          "font-inter text-[12px] h-[26px] flex items-center justify-end px-1",
                                          isLast ? "text-indigo-900 font-bold" : "text-slate-700 font-bold"
                                        )}>
                                          {formatNum(
                                            row.original[cell.column.id] || 0,
                                            stages,
                                            cell.column.id.replace("_total", "")
                                          )}
                                        </div>
                                      )}
                                    {isSummary &&
                                      cell.column.id === "variance" && (
                                        <div className={clsx(
                                          "font-inter text-[12px] font-bold h-[26px] flex items-center justify-end px-1",
                                          row.original.variance > 0 ? "text-blue-600" : row.original.variance < 0 ? "text-red-500" : "text-slate-400"
                                        )}>
                                          {row.original.variance > 0 ? "+" : ""}
                                          {formatNum(row.original.variance || 0, stages)}
                                        </div>
                                      )}
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <tr
                      style={{
                        height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px`,
                      }}
                    >
                      <td
                        colSpan={table.getVisibleLeafColumns().length}
                        className="p-0 border-0"
                      />
                    </tr>
                  )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Sticky Footer */}
          <div className="shrink-0 h-9 bg-lv2 text-lv5 flex items-center px-6 border-t border-lv4 rounded-b-lg select-none">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-tight text-slate-500">
                © 2026 Haeahn Architecture
              </span>
              <div className="w-px h-2.5 bg-lv4 mx-1"></div>
              <span className="text-[10px] font-medium italic text-slate-400">
                Medical Facility Planning Tool v1.2
              </span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <span className="text-[9px] font-extrabold opacity-60 uppercase tracking-widest text-slate-500">
                Internal Use Only
              </span>
              <div className="text-[10px] font-medium opacity-60 text-slate-400">
                Data is automatically synchronized
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PDF Print Component for B1 ~ 7F Detail Tables
export function FloorDetailPrintList() {
  const { floors } = useAppStore();
  
  const targetFloors = useMemo(() => {
    return floors
      .filter(f => {
        const name = f.name.toUpperCase().trim();
        if (name === "B1") return true;
        const numericPart = name.replace("F", "").trim();
        const num = parseInt(numericPart);
        return !isNaN(num) && num >= 1 && num <= 7 && !name.startsWith("B");
      })
      .sort((a, b) => getFloorVal(a.name) - getFloorVal(b.name));
  }, [floors]);

  if (targetFloors.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        B1 ~ 7F에 해당하는 층 데이터가 없습니다.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 10mm; /* Browser will hopefully use this as internal margin if "None" is selected, or we rely on padding */
          }
          .flex-col.w-full.bg-white {
            padding: 10mm;
          }
          .page-break {
            page-break-before: always;
            break-before: always;
          }
          /* Prevent rows from breaking across pages */
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          /* Ensure backgrounds print */
          .print-bg-exact {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="flex flex-col w-full bg-white print:bg-white text-slate-900 gap-12">
      {targetFloors.map((floor, idx) => {
        return (
          <div 
            key={floor.id} 
            className={clsx(
              "w-full flex flex-col bg-white",
              idx > 0 && "page-break"
            )}
          >
            {/* Header with Title and logo-style metadata */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-extrabold text-slate-900 tracking-tight">
                  {getFloorPrintTitle(floor.name)}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">| 기본설계 세부 면적계획</span>
              </div>
              <div className="text-right flex items-center gap-4">
                <span className="text-[9px] font-bold text-indigo-600 font-mono tracking-wide uppercase">
                  Page {idx + 1} / {targetFloors.length}
                </span>
              </div>
            </div>
            
            <FloorTableForPrint floorId={floor.id} />
          </div>
        );
      })}
    </div>
  </>
);
}

function getFloorPrintTitle(floorName: string) {
  const name = floorName.toUpperCase().trim();
  const isB = name.startsWith("B");
  const numStr = name.replace(/[A-Z]/g, "").trim();
  const num = parseInt(numStr);
  if (isNaN(num)) return `${floorName} 세부 면적계획`;
  return isB ? `지하${num}층 세부 면적계획` : `지상${num}층 세부 면적계획`;
}

function FloorTableForPrint({ floorId }: { floorId: string }) {
  const {
    departments,
    divisions,
    rooms,
    values,
    stages,
    comparison,
    medicalOnly,
    filters,
    floorWardOverrides
  } = useAppStore();

  const getWardCount = (fId: string, deptId: string) => {
    const override = floorWardOverrides[`${fId}|${deptId}`];
    if (override !== undefined) return override;

    const dept = departments.find(d => d.id === deptId);
    if (dept && deptId === "101") {
       const rangeMatch = dept.name.match(/(\d+)\s*[~-]\s*(\d+)/);
       if (rangeMatch) {
         const start = parseInt(rangeMatch[1]);
         const end = parseInt(rangeMatch[2]);
         if (!isNaN(start) && !isNaN(end) && end >= start) return end - start + 1;
       }
       const roomsInDept = rooms.filter(r => r.departmentId === deptId && r.floorId.toUpperCase().replace(/F$/i, '').trim() === fId.toUpperCase().replace(/F$/i, '').trim());
       for (const r of roomsInDept) {
         const match = r.note?.match(/(\d+)\s*개\s*병동/);
         if (match) return parseInt(match[1]);
       }
    }
    return 1;
  };

  const valuesMap = useMemo(() => {
    const map = new Map<string, any>();
    values.forEach((v) => {
      map.set(`${v.roomId}-${v.stageId}`, v);
    });
    return map;
  }, [values]);

  const displayRooms = useMemo(() => {
    const deptsMap = new Map(departments.map((d) => [d.id, d]));
    const roomsByFloor = rooms.filter((r) => r.floorId.toUpperCase().replace(/F$/i, '').trim() === floorId.toUpperCase().replace(/F$/i, '').trim());

    let filteredRooms = roomsByFloor;

    if (medicalOnly) {
      filteredRooms = filteredRooms.filter((r) => {
        const dept = deptsMap.get(r.departmentId);
        if (!dept) return false;
        const divCode = dept.divisionId; 
        return /^\d+$/.test(divCode);
      });
    }

    if (filters.divisionIds.length > 0) {
      filteredRooms = filteredRooms.filter((r) => {
        const d = deptsMap.get(r.departmentId);
        return d && filters.divisionIds.includes(d.divisionId);
      });
    }

    if (filters.departmentIds.length > 0) {
      filteredRooms = filteredRooms.filter((r) =>
        filters.departmentIds.includes(r.departmentId),
      );
    }

    filteredRooms.sort((a, b) => {
      const da = deptsMap.get(a.departmentId)?.order ?? 99;
      const db = deptsMap.get(b.departmentId)?.order ?? 99;
      if (da !== db) return da - db;
      const c = a.no.localeCompare(b.no);
      if (c !== 0) return c;
      const fa = getFloorVal(a.floorId);
      const fb = getFloorVal(b.floorId);
      return fb - fa;
    });

    return filteredRooms;
  }, [floorId, rooms, departments, medicalOnly, filters]);

  const deptSummary = useMemo(() => {
    const summary = new Map<string, Record<string, number>>();
    displayRooms.forEach((r) => {
      if (!summary.has(r.departmentId)) {
        const initial: Record<string, number> = {};
        stages.forEach((s) => (initial[s.id] = 0));
        summary.set(r.departmentId, initial);
      }
      const sums = summary.get(r.departmentId)!;
      const wardCount = r.departmentId === "101" ? getWardCount(floorId, r.departmentId) : 1;

      const idsToFetch = (r as any).originalRoomIds || [r.id];
      stages.forEach((s) => {
        let roomSum = 0;
        idsToFetch.forEach(rid => {
          const v = valuesMap.get(`${rid}-${s.id}`);
          if (v) roomSum += (v.unitArea || 0) * (v.quantity || 0);
        });
        sums[s.id] = Number((sums[s.id] + roomSum * wardCount).toFixed(4));
      });
    });
    return summary;
  }, [displayRooms, stages, floorId, valuesMap, floorWardOverrides]);

  const flatData = useMemo(() => {
    const baseId = comparison.baseId || stages[0]?.id;
    const targetId = comparison.targetId || stages[stages.length - 1]?.id;

    const deptsMap = new Map(departments.map((d) => [d.id, d]));
    const divsMap = new Map(divisions.map((d) => [d.id, d]));

    const combinedData: any[] = [];
    let lastDeptId: string | null = null;
    const currentGroupValueSums: Record<string, number> = {};

    for (let i = 0; i < displayRooms.length; i++) {
      const r = displayRooms[i];
      const dept = deptsMap.get(r.departmentId);
      const div = dept ? divsMap.get(dept.divisionId) : null;

      const deptChanged = r.departmentId !== lastDeptId;

      if (deptChanged) {
        stages.forEach((s) => (currentGroupValueSums[s.id] = 0));
        const count = getWardCount(floorId, r.departmentId);
        const sums = deptSummary.get(r.departmentId) || {};

        combinedData.push({
          id: `header-${r.departmentId}`,
          isGroupHeader: true,
          deptName: dept?.name || "기타",
          wardCount: count,
          departmentId: r.departmentId,
          deptColor: div?.color || "#6366f1",
          ...sums,
        });
        lastDeptId = r.departmentId;
      }

      const row: any = {
        ...r,
        isSummary: false,
        deptName: dept?.name || "기타",
        deptColor: div?.color || "#6366f1",
      };

      const wardCount = r.departmentId === "101" ? getWardCount(floorId, r.departmentId) : 1;

      for (const s of stages) {
        let totalUnitArea = 0;
        let totalQuantity = 0;
        let totalArea = 0;
        let hasValue = false;
        let valCount = 0;

        const idsToFetch = (r as any).originalRoomIds || [r.id];
        idsToFetch.forEach((rid) => {
          const val = valuesMap.get(`${rid}-${s.id}`);
          if (val) {
            hasValue = true;
            valCount++;
            totalUnitArea += val.unitArea || 0;
            totalQuantity += val.quantity || 0;
            totalArea += (val.unitArea || 0) * (val.quantity || 0);
          }
        });

        const isEmpty = !hasValue;
        const displayTotal = totalArea * wardCount;

        let displayUnitArea = 
            totalQuantity > 0 
            ? totalArea / totalQuantity 
            : (valCount > 0 ? totalUnitArea / valCount : 0);
        let displayQuantity = totalQuantity;

        if (wardCount > 1 && !(r as any).isGrouped) {
          displayQuantity = totalQuantity / wardCount;
        }

        row[`${s.id}_unitArea`] = isEmpty ? null : displayUnitArea;
        row[`${s.id}_quantity`] = isEmpty ? null : displayQuantity;
        row[`${s.id}_total`] = isEmpty ? null : displayTotal;
        row[`${s.id}_isEmpty`] = isEmpty;
        row[`${s.id}_wardCount`] = wardCount;

        if (!isEmpty) {
          currentGroupValueSums[s.id] = Number((currentGroupValueSums[s.id] + displayTotal).toFixed(4));
        }
      }

      if (stages.length >= 2) {
        row.variance =
          (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
      }

      combinedData.push(row);

      const nextRoom = displayRooms[i + 1];
      const nextDeptId = nextRoom?.departmentId;

      if (nextDeptId !== r.departmentId) {
        const summary: any = {
          id: `sum-${r.departmentId}`,
          isSummary: true,
          deptName: dept?.name || "",
          departmentId: r.departmentId,
          deptColor: div?.color || "#6366f1",
        };
        for (const s of stages) {
          summary[`${s.id}_total`] = Number(currentGroupValueSums[s.id].toFixed(4));
        }

        if (stages.length >= 2) {
          summary.variance =
            (summary[`${targetId}_total`] || 0) -
            (summary[`${baseId}_total`] || 0);
        }

        combinedData.push(summary);
        combinedData.push({
          id: `spacer-${r.departmentId}`,
          isSpacer: true,
          departmentId: r.departmentId,
        });
      }

      lastDeptId = r.departmentId;
    }

    return combinedData;
  }, [
    floorId,
    displayRooms,
    valuesMap,
    deptSummary,
    stages,
    departments,
    divisions,
    comparison,
  ]);
  
  const targetId = comparison.targetId || stages[stages.length - 1]?.id;

  return (
    <div className="overflow-x-auto w-full border border-slate-200 rounded-md print:border-none">
      <table className="w-full text-slate-800 border-collapse table-fixed text-[10px]" style={{ width: '987px', minWidth: '987px' }}>
        <colgroup>
          <col style={{ width: '42px' }} />
          <col style={{ width: '160px' }} />
          {stages.map((s) => (
            <React.Fragment key={s.id}>
              <col style={{ width: '38px' }} />
              <col style={{ width: '24px' }} />
              <col style={{ width: '48px' }} />
            </React.Fragment>
          ))}
          <col style={{ width: '55px' }} />
          <col style={{ width: '180px' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 border-b border-slate-350">
            <th rowSpan={2} className="py-2 px-1 text-center font-extrabold text-slate-800 text-[10px]">NO.</th>
            <th rowSpan={2} className="py-2 px-2 text-left font-extrabold text-slate-800 text-[10px]">ROOM NAME</th>
            {stages.map((s) => (
              <th key={s.id} colSpan={3} className="py-1 px-1 text-center font-extrabold text-slate-700 border-l border-b border-slate-200 text-[9.5px]">
                {s.name}
              </th>
            ))}
            <th rowSpan={2} className="py-2 px-1 text-right font-extrabold text-slate-800 border-l border-slate-300 text-[10px]">증감</th>
            <th rowSpan={2} className="py-2 px-2 text-left font-extrabold text-slate-800 border-l border-slate-300 text-[10px] col-note-print">NOTE</th>
          </tr>
          <tr className="bg-slate-50 border-b border-slate-300">
            {stages.map((s) => (
              <React.Fragment key={`${s.id}-sub`}>
                <th className="py-1 px-1 text-right font-bold text-slate-500 border-l border-slate-200 text-[8.5px]">Net</th>
                <th className="py-1 px-1 text-center font-bold text-slate-500 border-l border-slate-200 text-[8.5px]">Qty</th>
                <th className="py-1 px-1 text-right font-extrabold text-slate-700 border-l border-slate-200 text-[8.5px] bg-slate-50/40">Total</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-[10px]">
          {flatData.map((row) => {
            if (row.isSpacer) {
              return (
                <tr key={row.id} className="bg-slate-50/20" style={{ height: "4px" }}>
                  <td colSpan={2 + stages.length * 3 + 2} className="p-0 border-y border-slate-100" />
                </tr>
              );
            }
            if (row.isGroupHeader) {
              return (
                <tr key={row.id} className="bg-slate-100/70 border-y border-slate-300">
                  <td colSpan={2 + stages.length * 3 + 2} className="py-2 px-3 font-extrabold text-[#334155] text-[11px] border-b border-slate-300">
                    <div className="flex items-center">
                      <span 
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0" 
                        style={{ 
                          backgroundColor: row.deptColor, 
                          border: `3px solid ${row.deptColor}`, 
                          display: "inline-block",
                          WebkitPrintColorAdjust: "exact" 
                        }}
                      />
                      [{row.deptName}]
                    </div>
                  </td>
                </tr>
              );
            }
            if (row.isSummary) {
              return (
                <tr key={row.id} className="bg-slate-50 font-bold border-y border-slate-300 text-slate-950 text-[10px]">
                  <td className="py-1.5 px-2 text-center border-b border-slate-300"></td>
                  <td className="py-1.5 px-3 text-left border-b border-slate-300">[{row.deptName} 소계]</td>
                  {stages.map((s) => (
                    <React.Fragment key={s.id}>
                      <td className="py-1.5 px-1 text-right border-l border-slate-200 border-b border-slate-300">-</td>
                      <td className="py-1.5 px-1 text-center border-l border-slate-200 border-b border-slate-300">-</td>
                      <td className="py-1.5 px-2 text-right text-indigo-900 border-l border-slate-200 border-b border-slate-300 font-extrabold bg-[#EEF2F6]">
                        {formatNum(row[`${s.id}_total`], stages, s.id)}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className={clsx(
                    "py-1.5 px-2 text-right font-bold border-l border-slate-200 border-b border-slate-300",
                    row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                  )}>
                    {row.variance > 0 ? "+" : ""}{formatNum(row.variance, stages)}
                  </td>
                  <td className="py-1.5 px-3 border-l border-slate-200 border-b border-slate-300"></td>
                </tr>
              );
            }
            return (
              <tr key={row.id} className="hover:bg-slate-50/50" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td className="py-1.5 px-2 text-center text-slate-500 font-mono border-b border-slate-200">{row.no}</td>
                <td className="py-1.5 px-3 text-left text-slate-800 font-semibold border-b border-slate-200 leading-snug whitespace-normal" style={{ wordBreak: 'break-all' }}>{row.name}</td>
                {stages.map((s) => {
                  const isEmpty = row[`${s.id}_isEmpty`];
                  return (
                    <React.Fragment key={s.id}>
                      <td className="py-1.5 px-1 text-right text-slate-500 font-mono border-l border-slate-200 border-b border-slate-200">
                        {isEmpty ? "" : formatNum(row[`${s.id}_unitArea`], stages)}
                      </td>
                      <td className="py-1.5 px-1 text-center text-slate-500 font-mono border-l border-slate-200 border-b border-slate-200">
                        {isEmpty ? "" : formatQty(row[`${s.id}_quantity`])}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-700 font-mono font-semibold border-l border-slate-200 border-b border-slate-200 bg-slate-50/20">
                        {isEmpty ? "" : formatNum(row[`${s.id}_total`], stages)}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className={clsx(
                  "py-1.5 px-2 text-right font-mono font-bold border-l border-slate-200 border-b border-slate-200",
                  row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                )}>
                  {row.variance !== undefined && row.variance !== 0 ? (
                    <>
                      {row.variance > 0 ? "+" : ""}
                      {formatNum(row.variance, stages)}
                    </>
                  ) : "-"}
                </td>
                <td className="py-1.5 px-3 text-left text-slate-600 font-normal border-l border-slate-200 border-b border-slate-200 col-note-print leading-snug whitespace-normal" style={{ wordBreak: 'break-all' }}>
                  {row.note || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

