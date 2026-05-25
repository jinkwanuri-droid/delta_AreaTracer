import React, { useMemo, useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell, 
  PieChart, 
  Pie, 
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  LabelList
} from 'recharts';
import { motion } from 'motion/react';
import { 
  useAppStore, 
  Stage, 
  Division, 
  Department, 
  Room, 
  RoomValue 
} from '@/store/useAppStore';
import { 
  TrendingUp, 
  TrendingDown, 
  LayoutGrid, 
  Activity, 
  Layers, 
  Box, 
  Hospital,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Stethoscope,
  Trees
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to format numbers with commas
const f = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

// Helper to format numbers into integer and decimal parts
const formatNumberParts = (val: number) => {
  const formatted = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dotIndex = formatted.lastIndexOf('.');
  if (dotIndex !== -1) {
    return {
      integer: formatted.substring(0, dotIndex),
      decimal: formatted.substring(dotIndex)
    };
  }
  return { integer: formatted, decimal: '.00' };
};

// High-fidelity, glossmorphic custom tooltip for visual excellence
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isBed?: boolean;
  isPie?: boolean;
  pieTotal?: number;
  singleMode?: boolean;
  highlightedDivId?: string | null;
  departments?: Department[];
  rooms?: Room[];
  values?: RoomValue[];
  activeStageId?: string;
  floors?: any[];
}

const TrendBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value || value <= 0) return null;
  const isSmall = value < 1000;
  
  if (isSmall) {
    return (
      <text 
        x={x + width + 4} 
        y={y + height / 2} 
        fill="#475569" 
        textAnchor="start" 
        dominantBaseline="middle" 
        fontSize={9.5}
        fontWeight="800"
      >
        {Math.round(value).toLocaleString()}
      </text>
    );
  }
  
  return (
    <text 
      x={x + width / 2} 
      y={y + height / 2} 
      fill="#ffffff" 
      textAnchor="middle" 
      dominantBaseline="middle" 
      fontSize={10.5}
      fontWeight="bold"
    >
      {Math.round(value).toLocaleString()}
    </text>
  );
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, payload, label, isBed, isPie, pieTotal, singleMode,
  highlightedDivId, departments, rooms, values, activeStageId, floors 
}) => {
  if (!active || !payload || !payload.length) return null;

  let validPayload = payload.filter((entry: any) => {
    const k = entry.dataKey || entry.name;
    return Number(entry.value) > 0 && k !== 'dummyTotal' && k !== 'gross';
  });
  
  const seenKeys = new Set();
  validPayload = validPayload.filter((entry: any) => {
    const k = entry.dataKey || entry.name;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  if (validPayload.length === 0) return null;

  const rowPayload = payload[0]?.payload;
  // Use rowPayload.gross if available, else fallback to summing valid payload values
  const totalSum = (rowPayload && rowPayload.net !== undefined && rowPayload.common !== undefined && rowPayload.other !== undefined) 
    ? (Number(rowPayload.net) + Number(rowPayload.common) + Number(rowPayload.other))
    : validPayload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  if (singleMode) {
    validPayload = [validPayload[0]];
  }
  
  const sortOrder = ['net', 'common', 'other'];
  validPayload.sort((a: any, b: any) => {
    const keyA = a.dataKey || a.name;
    const keyB = b.dataKey || b.name;
    let idxA = sortOrder.indexOf(keyA);
    let idxB = sortOrder.indexOf(keyB);
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    return idxA - idxB;
  });

  const keyMap: Record<string, string> = {
    net: '전용면적',
    common: '공용면적',
    other: '의료 외',
    gross: '총 면적'
  };

  const actualLabel = payload[0]?.payload?.name || label;

  // Dynamic Content for Floor Chart when a Division is highlighted
  const isFloorChart = !!highlightedDivId && !!departments && !!floors;
  let floorDeptItems: { name: string, value: number, color: string }[] = [];

  if (isFloorChart && highlightedDivId) {
    const currentFloor = floors.find(f => f.name === actualLabel);
    if (currentFloor) {
      const deptsInDiv = departments.filter(d => d.divisionId === highlightedDivId);
      const stageValues = values?.filter(v => v.stageId === activeStageId) || [];
      
      floorDeptItems = deptsInDiv.map(dept => {
        const roomsInFloorDept = rooms?.filter(r => r.floorId === currentFloor.id && r.departmentId === dept.id) || [];
        const area = stageValues
          .filter(v => roomsInFloorDept.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        
        return { name: dept.name, value: area, color: payload[0]?.color || '#6366f1' };
      }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }
  }

  if (isPie) {
    const entry = validPayload[0];
    if (!entry) return null;
    const value = Number(entry.value) || 0;
    const pTotal = pieTotal || React.Children.toArray(validPayload).reduce((acc: any, val: any) => acc + (val.value || 0), 0); 
    const percentageText = pTotal > 0 
      ? `(${((value / pTotal) * 100).toFixed(1)}%)` 
      : (entry.payload?.percent ? `(${(entry.payload.percent * 100).toFixed(1)}%)` : '');
    
    const rawName = entry.name || '';
    const name = keyMap[entry.dataKey || rawName] || rawName;

    return (
      <div 
        className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-2 py-1.5 rounded-lg shadow-lg z-[10000] pointer-events-none"
        style={{ fontFamily: '"Noto Sans KR", "Pretendard Variable", sans-serif', outline: 'none' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-[11px] font-medium text-slate-700 truncate max-w-[100px]">{name}</span>
          </div>
          <span className="text-[12px] font-bold text-slate-800 text-right flex-shrink-0 whitespace-nowrap">
            {Math.round(value).toLocaleString()}
            <span className="text-[10px] font-medium text-slate-400 ml-0.5">㎡</span>
            {percentageText && (
              <span className="text-[10px] font-medium text-indigo-500 ml-1">
                {percentageText}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  const displayPayload = (isFloorChart && floorDeptItems.length > 0) ? floorDeptItems : validPayload;
  const showSummarySum = displayPayload.length > 1;
  const currentTotal = isFloorChart ? floorDeptItems.reduce((s, i) => s + i.value, 0) : totalSum;

  return (
    <div 
      className="bg-white/95 backdrop-blur-md border border-slate-200/80 p-3 rounded-lg shadow-xl z-[10000] pointer-events-none min-w-[160px]"
      style={{ fontFamily: '"Noto Sans KR", "Pretendard Variable", sans-serif', outline: 'none' }}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5 pb-1.5 border-b border-slate-100" style={{ outline: 'none' }}>
        <span className="text-[12px] font-bold text-slate-800 tracking-tight">
          {actualLabel || displayPayload[0]?.name}
          {highlightedDivId && isFloorChart && <span className="ml-1 text-[10px] text-indigo-500 font-medium">(상세)</span>}
        </span>
        {showSummarySum && (
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
            합계: {Math.round(currentTotal).toLocaleString()} {isBed ? '석' : '㎡'}
          </span>
        )}
      </div>
      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
        {displayPayload.map((entry: any, index: number) => {
          const value = Number(entry.value) || 0;
          const color = entry.color || entry.fill || entry.stroke || '#6366f1';
          const rawName = entry.name || '';
          const name = keyMap[entry.dataKey || rawName] || rawName;
          
          let percentageText = '';
          if (currentTotal > 0) {
            percentageText = ` (${((value / currentTotal) * 100).toFixed(1)}%)`;
          }

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]">{name}</span>
              </div>
              <span className="text-[12px] font-bold text-slate-800 text-right flex-shrink-0">
                {Math.round(value).toLocaleString()}
                <span className="text-[10px] font-medium text-slate-400 ml-0.5">
                  {isBed ? '석' : '㎡'}
                </span>
                {percentageText && (
                  <span className="text-[10px] font-medium text-indigo-500 ml-1">
                    {percentageText}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const floors = useAppStore(state => state.floors);
  const stages = useAppStore(state => state.stages);
  const divisions = useAppStore(state => state.divisions);
  const departments = useAppStore(state => state.departments);
  const rooms = useAppStore(state => state.rooms);
  const values = useAppStore(state => state.values);
  const floorAreasByStage = useAppStore(state => state.floorAreasByStage);
  const medicalOnly = useAppStore(state => state.medicalOnly);
  const toggleMedicalOnly = useAppStore(state => state.toggleMedicalOnly);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const toggleDivisionFilter = useAppStore(state => state.toggleDivisionFilter);
  const toggleDepartmentFilter = useAppStore(state => state.toggleDepartmentFilter);
  const floorWardOverrides = useAppStore(state => state.floorWardOverrides);

  const [activeTrendDivId, setActiveTrendDivId] = useState<string | null>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const isPdfExportMode = useAppStore(state => state.isPdfExportMode);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialMount(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filter components based on medicalOnly (Division IDs 1-5 usually)
  const medicalDivisionIds = useMemo(() => {
    return divisions.filter(d => /^\d+$/.test(d.id)).map(d => d.id);
  }, [divisions]);

  // Compute floor area by department for latest design stage (sorted B2, B1, 1F, 2F...)
  const floorDeptData = useMemo(() => {
    if (!floors || floors.length === 0 || !stages || stages.length === 0) return [];
    
    const latestStage = stages[stages.length - 1];
    if (!latestStage) return [];

    const sortedFloors = [...floors].sort((a, b) => {
      const getVal = (name: string) => {
        if (!name) return 0;
        const match = name.match(/([A-Z]+)?(\d+)?([A-Z]+)?/);
        if (!match) return 0;
        const prefix = match[1] || "";
        const num = parseInt(match[2] || "0");
        if (prefix === "B") return -num;
        return num;
      };
      return getVal(a.name) - getVal(b.name);
    });

    const activeDepts = departments.filter(d => !medicalOnly || medicalDivisionIds.includes(d.divisionId));

    return sortedFloors.map(floor => {
      const row: any = { name: floor.name };
      activeDepts.forEach(dept => {
        const stageValues = values.filter(v => v.stageId === latestStage.id);
        const roomsInFloorDept = rooms.filter(r => r.floorId === floor.id && r.departmentId === dept.id);
        const area = stageValues
          .filter(v => roomsInFloorDept.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        if (area > 0) {
          row[dept.name] = Number(area.toFixed(1));
        }
      });
      return row;
    });
  }, [floors, stages, values, rooms, departments, medicalOnly, medicalDivisionIds]);

  const deptColors = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach(dept => {
      const div = divisions.find(d => d.id === dept.divisionId);
      map[dept.name] = div?.color || '#3b82f6';
    });
    return map;
  }, [departments, divisions]);

  // Total area calculation by stage
  const areaByStage = useMemo(() => {
    return stages.map(stage => {
      // Base values for the stage
      const stageValues = values.filter(v => v.stageId === stage.id);
      
      // Calculate Net Area (Medical Only filter applied if active, and always excluding Parking/Outdoor special areas)
      const medicalStageValues = stageValues.filter(v => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return false;
        
        const roomNo = room.no.toUpperCase();
        if (roomNo.startsWith('P') || roomNo.startsWith('O')) {
          return false;
        }

        if (!medicalOnly) return true;
        const dept = departments.find(d => d.id === room.departmentId);
        return dept && medicalDivisionIds.includes(dept.divisionId);
      });
      const netTotal = medicalStageValues.reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      
      // Calculate specific deduction areas: Parking and Outdoor Common
      // These are calculated based on room number pattern to align perfectly with DepartmentSummary.tsx
      const parkingArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        const isParking = room.no.toUpperCase().startsWith('P');
        return isParking ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);

      const outdoorArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        const isOutdoor = room.no.toUpperCase().startsWith('O');
        return isOutdoor ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);
      
      // Calculate gross area from floorAreasByStage
      const floorAreas = floorAreasByStage[stage.id] || {};
      const grossTotal = Object.entries(floorAreas).reduce((sum, [fid, val]) => {
        if (fid === '_TOTAL_') return sum;
        return sum + (val || 0);
      }, 0);

      const finalGross = grossTotal || floorAreas['_TOTAL_'] || 0;
      
      // GN Ratio = (Gross - Parking - Outdoor) / Net
      // User requested: Exclude Parking/Outdoor from both when medical filter is on (and generally they are deducted gross)
      const adjustedGross = finalGross - parkingArea - outdoorArea;
      const common = adjustedGross - netTotal;
      const gnRatio = netTotal > 0 ? (adjustedGross / netTotal) : 0;
      
      return {
        id: stage.id,
        name: stage.name,
        net: netTotal,
        gross: finalGross,
        adjustedGross: adjustedGross,
        parking: parkingArea,
        outdoor: outdoorArea,
        other: parkingArea + outdoorArea,
        common: common,
        gnRatio: gnRatio
      };
    });
  }, [stages, values, medicalOnly, medicalDivisionIds, rooms, departments, divisions, floorAreasByStage]);

  const filteredValues = useMemo(() => {
    if (!medicalOnly) return values;
    return values.filter(v => {
      const room = rooms.find(r => r.id === v.roomId);
      if (!room) return false;
      const dept = departments.find(d => d.id === room.departmentId);
      if (!dept) return false;
      return medicalDivisionIds.includes(dept.divisionId);
    });
  }, [values, medicalOnly, rooms, departments, medicalDivisionIds]);

  // Current selected stage (usually the latest)
  const currentStage = useMemo(() => areaByStage[areaByStage.length - 1], [areaByStage]);
  const baseStage = useMemo(() => areaByStage[0], [areaByStage]); // Guideline
  const intermediateStage = useMemo(() => areaByStage.find(s => s.name.includes('중간')) || areaByStage[2], [areaByStage]);

  // Combined statistics for Net, Gross, Common Area
  const calculatedCommonArea = useMemo(() => {
    if (!currentStage) return 0;
    return currentStage.common || 0;
  }, [currentStage]);

  const calculatedCommonToNetRatio = useMemo(() => {
    if (!currentStage || currentStage.net === 0) return 0;
    return (calculatedCommonArea / currentStage.net) * 100;
  }, [currentStage, calculatedCommonArea]);

  // Non-medical area (parking + outdoor area)
  const calculatedNonMedicalArea = useMemo(() => {
    if (!currentStage) return 0;
    return (currentStage.parking || 0) + (currentStage.outdoor || 0);
  }, [currentStage]);

  // User-specified static bed configuration (병동부 병상 구성)
  const wardBedsData = useMemo(() => {
    return {
      totalBedsSum: 300,
      list: [
        { label: '4인실', rooms: 58, beds: 232 },
        { label: '2인실', rooms: 7, beds: 14 },
        { label: '1인실', rooms: 14, beds: 14 },
        { label: '임종실', rooms: 2, beds: 2 },
        { label: '격리4인실', rooms: 4, beds: 16 },
        { label: '음압격리실', rooms: 7, beds: 7 },
        { label: '개방(ICU)', rooms: null, beds: 12 },
        { label: '격리(ICU)', rooms: null, beds: 3 },
      ]
    };
  }, []);

  // 1. Division area share (latest stage)
  const divisionData = useMemo(() => {
    if (!currentStage) return [];
    return divisions
      .filter(div => !medicalOnly || medicalDivisionIds.includes(div.id))
      .map(div => {
        const stageValues = filteredValues.filter(v => v.stageId === currentStage.id);
        const roomsInDiv = rooms.filter(r => {
          const dept = departments.find(d => d.id === r.departmentId);
          return dept?.divisionId === div.id;
        });
        const area = stageValues
          .filter(v => roomsInDiv.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        
        return {
          name: div.name,
          id: div.id,
          value: area,
          color: div.color || '#cbd5e1'
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [divisions, medicalOnly, medicalDivisionIds, filteredValues, currentStage, rooms, departments]);

  // 2. Stacked Bar Chart (Stages x Division) -> Converted to Line Chart
  const stageDivisionData = useMemo(() => {
    return stages.map(stage => {
      const data: any = { name: stage.name };
      divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).forEach(div => {
        const stageValues = filteredValues.filter(v => v.stageId === stage.id);
        const roomsInDiv = rooms.filter(r => {
          const dept = departments.find(d => d.id === r.departmentId);
          return dept?.divisionId === div.id;
        });
        const area = stageValues
          .filter(v => roomsInDiv.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        data[div.name] = area;
      });
      return data;
    });
  }, [stages, divisions, medicalOnly, medicalDivisionIds, filteredValues, rooms, departments]);

  // 3. Top 3 lists
  const getTopChanges = (baseStageObj: any, targetStageObj: any) => {
    if (!baseStageObj || !targetStageObj) return { increased: [], decreased: [] };
    
    const changes = departments.filter(dept => !medicalOnly || medicalDivisionIds.includes(dept.divisionId)).map(dept => {
      const getDeptArea = (sid: string) => {
        const stageValues = filteredValues.filter(v => v.stageId === sid);
        const roomsInDept = rooms.filter(r => r.departmentId === dept.id);
        return stageValues
          .filter(v => roomsInDept.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      };

      const baseArea = getDeptArea(baseStageObj.id);
      const targetArea = getDeptArea(targetStageObj.id);
      const diff = targetArea - baseArea;
      
      return {
        id: dept.id,
        name: dept.name,
        base: baseArea,
        target: targetArea,
        diff: diff,
        ratio: baseArea > 0 ? (diff / baseArea) * 100 : 0
      };
    }).filter(c => c.base > 0 || c.target > 0);

    const sortedChanges = [...changes].sort((a, b) => b.diff - a.diff);
    return {
      increased: sortedChanges.slice(0, 3).filter(c => c.diff > 0),
      decreased: [...sortedChanges].reverse().slice(0, 3).filter(c => c.diff < 0)
    };
  };

  const guidelineChanges = useMemo(() => getTopChanges(baseStage, currentStage), [baseStage, currentStage, departments, medicalOnly, medicalDivisionIds, filteredValues, rooms]);
  const intermediateChanges = useMemo(() => intermediateStage ? getTopChanges(intermediateStage, currentStage) : { increased: [], decreased: [] }, [intermediateStage, currentStage, departments, medicalOnly, medicalDivisionIds, filteredValues, rooms]);

  // 4. Floor x Division Distribution
  const floorDivisionData = useMemo(() => {
    if (!currentStage || !floors) return [];
    
    // Sort descending for vertical BarChart so B1 is at the bottom.
    const sortedFloors = [...floors].sort((a, b) => {
      const getVal = (name: string) => {
        if (!name) return 0;
        const match = name.match(/([A-Z]+)?(\d+)?([A-Z]+)?/);
        if (!match) return 0;
        const prefix = match[1] || "";
        const num = parseInt(match[2] || "0");
        if (prefix === "B") return -num;
        return num;
      };
      return getVal(b.name) - getVal(a.name);
    });

    return sortedFloors.map(floor => {
      const data: any = { name: floor.name, totalArea: 0, dummyTotal: 0 };
      let lastDivName = '';
      divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).forEach(div => {
        const stageValues = filteredValues.filter(v => v.stageId === currentStage.id);
        const roomsInFloorDiv = rooms.filter(r => {
          if (r.floorId !== floor.id) return false;
          const dept = departments.find(d => d.id === r.departmentId);
          return dept?.divisionId === div.id;
        });
        const area = stageValues
          .filter(v => roomsInFloorDiv.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        data[div.name] = area;
        data.totalArea += area;
        if (area > 0) lastDivName = div.name;
      });
      data.lastDivName = lastDivName;
      if (data.totalArea > 0) {
        data.dummyTotal = 0.0001; // Force label render
      }
      return data;
    }).filter(d => d.totalArea > 0);
  }, [currentStage, floors, divisions, medicalOnly, medicalDivisionIds, filteredValues, rooms, departments]);

  // 5. Dept share in Divisions (Small donuts)
  const divisionDeptShares = useMemo(() => {
    if (!currentStage) return [];
    return divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).map(div => {
      const stageValues = filteredValues.filter(v => v.stageId === currentStage.id);
      const deptsInDiv = departments.filter(d => d.divisionId === div.id);
      
      const deptData = deptsInDiv.map(dept => {
        const roomsInDept = rooms.filter(r => r.departmentId === dept.id);
        const area = stageValues
          .filter(v => roomsInDept.some(r => r.id === v.roomId))
          .reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        return { name: dept.name, value: area, id: dept.id };
      }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

      return {
        divisionName: div.name,
        divisionId: div.id,
        color: div.color || '#6366f1',
        data: deptData
      };
    }).filter(d => d.data.length > 0);
  }, [currentStage, divisions, medicalOnly, medicalDivisionIds, filteredValues, departments, rooms]);

  const PrintHeader = ({ page, total }: { page: number, total: number }) => (
    <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2" style={{ height: '14mm' }}>
      <div>
        <h2 className="text-[28px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
          <span>대시보드</span>
          <span className="text-[14px] font-normal text-slate-500 mb-[2px]">({page}/{total})</span>
        </h2>
      </div>
      <div className="text-right pb-1">
        <span className="text-[9px] font-bold text-slate-600">
          경상남도 서부의료원 건립사업 실시설계 | <span className="font-extrabold text-indigo-700">대시보드</span>
        </span>
      </div>
    </div>
  );

  const PrintPageWrapper = ({ children, page, total }: { children: React.ReactNode, page: number, total: number }) => {
    if (isPdfExportMode) {
      return (
        <div className="print-page w-full flex flex-col" style={{ minHeight: '178mm', boxSizing: 'border-box' }}>
          <PrintHeader page={page} total={total} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col gap-6 select-none",
      isPdfExportMode ? "bg-white text-slate-900 printable-container font-['Arial','Helvetica',sans-serif]" : "h-full min-h-0 overflow-y-auto p-6 bg-slate-50"
    )}>
      {isPdfExportMode && (
        <style>{`
          @page { size: A4 landscape; margin: 10mm; }
          .printable-container { width: 100%; max-width: none; padding: 0; margin: 0; }
          .print-page { page-break-after: always; page-break-inside: avoid; }
          .print-page:last-child { page-break-after: auto; }
        `}</style>
      )}

      {/* Dashboard Toolbar - Hide when printing */}
      {!isPdfExportMode && (
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              차트로 보는 경상남도 서부의료원 면적 계획
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleMedicalOnly(!medicalOnly)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all text-[11px] font-bold",
                medicalOnly 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-indigo-400"
              )}
            >
              <Stethoscope size={14} />
              의료시설 전용면적
            </button>
          </div>
        </div>
      )}

      <PrintPageWrapper page={1} total={2}>
        {/* Main Grid: Reorganized for flexible ordering on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        
        {/* Row 1: KPIs (Left 40%) and Step Trend (Right 60%) */}
        <div className="lg:col-span-2 order-1">
          {/* KPI Cards: 2x2 Grid with enhanced height and sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* KPI 1: 전체 연면적 */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white py-6 px-5 rounded-2xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-200/60 hover:border-indigo-200 hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-default"
            >
              <div className="flex justify-between items-start z-10">
                <span className="text-slate-400 text-[12px] font-black tracking-normal">전체 연면적</span>
                <div className="p-1.5 bg-indigo-50/50 text-indigo-500 rounded-lg group-hover:bg-indigo-100/50 transition-colors duration-300">
                  <LayoutGrid size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 z-10 text-right">
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-none flex items-baseline justify-end">
                  <span>{formatNumberParts(currentStage?.gross || 0).integer}</span>
                  <span className="text-[0.78em] font-bold text-slate-600">{formatNumberParts(currentStage?.gross || 0).decimal}</span>
                  <span className="text-[11px] font-black text-slate-400 ml-0.5">㎡</span>
                </h3>
                <p className="text-slate-400 text-[10.5px] mt-2 font-medium leading-none">
                  지침 대비 <span className={cn(
                    "font-black tracking-tight",
                    ((currentStage?.gross || 0) / (baseStage?.gross || 1) * 100) - 100 > 0 ? "text-rose-500" : "text-emerald-500"
                  )}>
                    {(((currentStage?.gross || 0) / (baseStage?.gross || 1) * 100) - 100) > 0 ? "+" : ""}
                    {(((currentStage?.gross || 0) / (baseStage?.gross || 1) * 100) - 100).toFixed(1)}%
                  </span> 변동
                </p>
              </div>
            </motion.div>

            {/* KPI 2: 공용면적 */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white py-6 px-5 rounded-2xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-200/60 hover:border-blue-200 hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-default"
            >
              <div className="flex justify-between items-start z-10">
                <span className="text-slate-400 text-[12px] font-black tracking-normal">공용면적</span>
                <div className="p-1.5 bg-blue-50/50 text-blue-500 rounded-lg group-hover:bg-blue-100/50 transition-colors duration-300">
                  <Trees size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 z-10 text-right">
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-none flex items-baseline justify-end">
                  <span>{formatNumberParts(calculatedCommonArea).integer}</span>
                  <span className="text-[0.78em] font-bold text-slate-600">{formatNumberParts(calculatedCommonArea).decimal}</span>
                  <span className="text-[11px] font-black text-slate-400 ml-0.5">㎡</span>
                </h3>
                <p className="text-slate-400 text-[10px] mt-2 font-medium leading-none">
                  전용면적 대비 <span className="font-bold text-indigo-500 tracking-tight">{calculatedCommonToNetRatio.toFixed(1)}%</span>
                </p>
              </div>
            </motion.div>

            {/* KPI 3: G/N 비율 */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white py-6 px-5 rounded-2xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-200/60 hover:border-emerald-200 hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-default"
            >
              <div className="flex justify-between items-start z-10">
                <span className="text-slate-400 text-[12px] font-black tracking-normal">G/N 비율</span>
                <div className="p-1.5 bg-emerald-50/50 text-emerald-500 rounded-lg group-hover:bg-emerald-100/50 transition-colors duration-300">
                  <Activity size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 z-10 w-full text-right">
                <div className="flex items-baseline justify-end gap-x-2">
                  <span className="text-[32px] font-black text-slate-800 tracking-tight leading-none">{(currentStage?.gnRatio || 0).toFixed(2)}</span>
                </div>
                {/* Embedded Progress Bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 flex mt-3 shadow-inner">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-700 ease-out" 
                    style={{ width: `${Math.min(100, (1 / (currentStage?.gnRatio || 1)) * 100)}%` }} 
                    title="전용" 
                  />
                  <div className="h-full bg-emerald-500 transition-all duration-700 ease-out flex-1" title="공용+조정" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1.5 leading-none">
                  <span>전용 {((1 / (currentStage?.gnRatio || 1)) * 100).toFixed(1)}%</span>
                  <span>공용 {((1 - (1 / (currentStage?.gnRatio || 1))) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>

            {/* KPI 4: 의료 외 면적 */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white py-6 px-5 rounded-2xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-200/60 hover:border-amber-200 hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-default"
            >
              <div className="flex justify-between items-start z-10">
                <span className="text-slate-400 text-[12px] font-black tracking-normal">의료 외 면적</span>
                <div className="p-1.5 bg-amber-50/50 text-amber-500 rounded-lg group-hover:bg-amber-100/50 transition-colors duration-300">
                  <Box size={13} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 z-10 text-right">
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-none flex items-baseline justify-end">
                  <span>{formatNumberParts(calculatedNonMedicalArea).integer}</span>
                  <span className="text-[0.78em] font-bold text-slate-600">{formatNumberParts(calculatedNonMedicalArea).decimal}</span>
                  <span className="text-[11px] font-black text-slate-400 ml-0.5">㎡</span>
                </h3>
                <p className="text-slate-400 text-[10px] mt-2 font-medium leading-none truncate">
                  주차 <span className="font-bold text-slate-700">{(currentStage?.parking || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> + 옥외 <span className="font-bold text-slate-700">{(currentStage?.outdoor || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Step trend bar chart - Reordered for mobile */}
        <div className="lg:col-span-3 order-2 lg:order-2">
          {/* 5위치: 단계별 면적추이(전용/공용) */}
          <div className="bg-white p-5 h-full rounded-2xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} className="text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 tracking-tight">단계별 전용/공용면적</h3>
              </div>
            </div>
            
            <div className="h-[235px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <ComposedChart 
                  data={areaByStage} 
                  margin={{ top: 35, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="10%"
                  barSize={55}
                  style={{ outline: 'none' }}
                  tabIndex={-1}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <Area dataKey="other" stackId="b" type="monotone" fill="#cbd5e1" fillOpacity={0.15} stroke="none" isAnimationActive={false} activeDot={false} />
                  <Area dataKey="common" stackId="b" type="monotone" fill="#94a3b8" fillOpacity={0.15} stroke="none" isAnimationActive={false} activeDot={false} />
                  <Area dataKey="net" stackId="b" type="monotone" fill="#6366f1" fillOpacity={0.15} stroke="none" isAnimationActive={false} activeDot={false} />
                  
                  {/* Dotted trend line for net area behind the bar charts */}
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke="#6366f1" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4" 
                    dot={false} 
                    activeDot={false} 
                    isAnimationActive={false} 
                  />

                  <Line 
                    dataKey="gross" 
                    stroke="none" 
                    isAnimationActive={false}
                    activeDot={false}
                    dot={(props: any) => {
                      const { cx, cy, index, payload } = props;
                      if (!payload || index === 0) return null;
                      
                      const prevPayload = areaByStage[index - 1];
                      if (!prevPayload) return null;
                      
                      const prevTotal = prevPayload.gross || 0;
                      const currTotal = payload.gross || 0;
                      if (prevTotal === 0) return null;
                      
                      const diff = currTotal - prevTotal;
                      const percent = (diff / prevTotal) * 100;
                      
                      let sign = '';
                      let color = '#64748b';
                      let bg = 'rgba(248, 250, 252, 0.95)';
                      if (diff > 0) {
                        sign = '+';
                        color = '#ef4444';
                        bg = 'rgba(254, 242, 242, 0.95)';
                      } else if (diff < 0) {
                        color = '#6366f1';
                        bg = 'rgba(238, 242, 255, 0.95)';
                      }
                      
                      const dist = window.innerWidth > 1024 ? 90 : 50; 
                      
                      return (
                        <g style={{ zIndex: 50, pointerEvents: 'none' }}>
                          <rect 
                            x={cx - dist} 
                            y={Math.max(cy - 25, 5)} 
                            width={34} 
                            height={14} 
                            rx={4} 
                            fill={bg} 
                            stroke={color} 
                            strokeWidth={0.5} 
                          />
                          <text 
                            x={cx - dist + 17} 
                            y={Math.max(cy - 25, 5) + 7} 
                            fill={color} 
                            fontSize={8.5} 
                            fontWeight="800" 
                            textAnchor="middle" 
                            dominantBaseline="central"
                          >
                            {sign}{percent.toFixed(1)}%
                          </text>
                        </g>
                      );
                    }}
                  />
                  
                  <Line 
                    dataKey="net" 
                    stroke="none" 
                    isAnimationActive={false}
                    activeDot={false}
                    dot={(props: any) => {
                      const { cx, cy, index, payload } = props;
                      if (!payload || index === 0) return null;
                      
                      const prevPayload = areaByStage[index - 1];
                      if (!prevPayload) return null;
                      
                      const prevTotal = prevPayload.net || 0;
                      const currTotal = payload.net || 0;
                      if (prevTotal === 0) return null;
                      
                      const diff = currTotal - prevTotal;
                      const percent = (diff / prevTotal) * 100;
                      
                      let sign = '';
                      let color = '#64748b';
                      let bg = 'rgba(248, 250, 252, 0.95)';
                      if (diff > 0) {
                        sign = '+';
                        color = '#ef4444';
                        bg = 'rgba(254, 242, 242, 0.95)';
                      } else if (diff < 0) {
                        color = '#6366f1';
                        bg = 'rgba(238, 242, 255, 0.95)';
                      }
                      
                      const dist = window.innerWidth > 1024 ? 90 : 50; 
                      
                      return (
                        <g style={{ zIndex: 50, pointerEvents: 'none' }}>
                          <rect 
                            x={cx - dist} 
                            y={Math.max(cy + 5, 5)} 
                            width={34} 
                            height={14} 
                            rx={4} 
                            fill={bg} 
                            stroke={color} 
                            strokeWidth={0.5} 
                          />
                          <text 
                            x={cx - dist + 17} 
                            y={Math.max(cy + 5, 5) + 7} 
                            fill={color} 
                            fontSize={8.5} 
                            fontWeight="800" 
                            textAnchor="middle" 
                            dominantBaseline="central"
                          >
                            {sign}{percent.toFixed(1)}%
                          </text>
                        </g>
                      );
                    }}
                  />

                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }}
                    dy={5}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 500 }} 
                    tickFormatter={(val) => Math.round(val).toLocaleString()}
                  />
                  <Tooltip 
                    shared={false}
                    content={<CustomTooltip />} 
                    cursor={{ fill: '#f1f5f9' }} 
                    wrapperStyle={{ zIndex: 10000, pointerEvents: 'none' }} 
                  />
                  <Bar 
                    dataKey="net" 
                    stackId="a" 
                    fill="#6366f1" 
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    name="전용면적" 
                    isAnimationActive={false}
                    radius={[4, 4, 4, 4]}
                  >
                    <LabelList 
                      dataKey="net" 
                      content={<TrendBarLabel />}
                    />
                  </Bar>
                  <Bar 
                    dataKey="common" 
                    stackId="a" 
                    fill="#94a3b8" 
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    name="공용면적" 
                    isAnimationActive={false}
                    radius={[4, 4, 4, 4]}
                  >
                    <LabelList 
                      dataKey="common" 
                      content={<TrendBarLabel />}
                    />
                  </Bar>
                  <Bar 
                    dataKey="other" 
                    stackId="a" 
                    fill="#cbd5e1" 
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    name="의료외(주차/옥외)" 
                    isAnimationActive={false}
                    radius={[4, 4, 4, 4]}
                  >
                    <LabelList 
                      dataKey="other" 
                      content={<TrendBarLabel />}
                    />
                    <LabelList 
                      dataKey="gross" 
                      position="top" 
                      offset={6}
                      fill="#475569" 
                      fontSize={10.5} 
                      fontWeight="bold"
                      formatter={(v: number) => Math.round(v).toLocaleString()}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Donut Chart and Detailed Trends */}
        <div className="lg:col-span-2 order-3 lg:order-3">
          {/* Division share donut */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col justify-between" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChartIcon size={17} className="text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">부문 면적 구성비</h3>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center w-full h-full my-auto flex-1 min-h-[300px]">
                <div className="w-full h-full relative flex-1 mx-auto flex items-center justify-center z-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart 
                      key={`main-donut-chart-${currentStage?.id || 'default'}-${activeTrendDivId || 'all'}`}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      style={{ outline: 'none' }}
                      tabIndex={-1}
                    >
                      <Pie
                        data={divisionData}
                        innerRadius="56%" 
                        outerRadius="85%"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={4}
                        cornerRadius={7}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={400}
                        animationEasing="ease-out"
                        onClick={(data) => {
                          if (data && data.payload) {
                            const clickedId = data.payload.id;
                            if (activeTrendDivId === clickedId) {
                               setActiveTrendDivId(null);
                            } else {
                               setActiveTrendDivId(clickedId);
                            }
                          }
                        }}
                        cursor="pointer"
                        labelLine={false}
                        label={({ x, y, cx, cy, name, percent, value, payload }) => {
                          const isAnyActive = activeTrendDivId !== null;
                          const isActive = activeTrendDivId === payload.id;
                          const opacityVal = isAnyActive ? (isActive ? 1.0 : 0.35) : 1.0;
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill="#1e293b" 
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central" 
                              fontSize={11.5} 
                              fontWeight="bold"
                              style={{ fontFamily: '"Pretendard Variable", sans-serif', opacity: opacityVal, transition: 'opacity 300ms ease' }}
                            >
                              <tspan x={x} dy="-0.6em">{name}</tspan>
                              <tspan x={x} dy="1.3em" fill="#64748b" fontSize={10} fontWeight="medium">
                                {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}㎡ ({(percent * 100).toFixed(1)}%)
                              </tspan>
                            </text>
                          );
                        }}
                      >
                        {divisionData.map((entry, index) => {
                          const isAnyActive = activeTrendDivId !== null;
                          const isActive = activeTrendDivId === entry.id;
                          const opacityVal = isAnyActive ? (isActive ? 1.0 : 0.15) : 1.0;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke="#ffffff" 
                              strokeWidth={1.5} 
                              style={{ opacity: opacityVal, transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none', cursor: 'pointer' }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip isPie pieTotal={divisionData.reduce((acc, d) => acc + d.value, 0)} />} 
                        cursor={false} 
                        wrapperStyle={{ zIndex: 10000, pointerEvents: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center total text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">총 전용면적</span>
                    <span className="text-xl font-black text-slate-800 tracking-tight leading-none mt-1.5 font-sans">
                      {(currentStage?.net || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1">㎡</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 order-4 lg:order-4 group">
          {/* 단계별 부문별 면적 추이 (Big Line/Area Chart) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col justify-between" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={17} className="text-emerald-500" />
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">단계별 부문 면적 추이</h3>
                  </div>

                  {/* Top-Right Capsule Legend for Trends - Expanded width with hover margin */}
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end ml-4 py-2.5 px-2 -my-2">
                    {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map((d, i) => {
                      const isActive = activeTrendDivId === d.id;
                      return (
                        <motion.button 
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveTrendDivId(isActive ? null : d.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 flex-shrink-0",
                            isActive 
                              ? "bg-indigo-500 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-100" 
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-white" : "")} style={{ backgroundColor: isActive ? undefined : d.color }} />
                          <span className="text-[8.5px] font-bold whitespace-nowrap">{d.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-[280px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`area-trends-rc-${activeTrendDivId || 'all'}`}>
                    <AreaChart 
                      key={`area-trends-${activeTrendDivId || 'all'}`}
                      data={stageDivisionData} 
                      margin={{ top: 10, right: 35, left: 0, bottom: 2 }}
                      style={{ outline: 'none' }}
                      tabIndex={-1}
                    >
                      <defs>
                        {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map((div) => (
                          <linearGradient key={`grad-${div.id}`} id={`grad-div-${div.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={div.color || '#cbd5e1'} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={div.color || '#cbd5e1'} stopOpacity={0.0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }} 
                        tickLine={false} 
                        tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }}
                        dy={8}
                        padding={{ left: 20, right: 20 }}
                      />
                      <YAxis 
                        domain={[1000, 7000]}
                        axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }} 
                        tickLine={false} 
                        tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 500 }}
                        tickFormatter={(v) => `${(v/1000).toFixed(1)}천`}
                        width={45}
                        padding={{ top: 20, bottom: 0 }}
                      />
                      <Tooltip 
                        content={<CustomTooltip />} 
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} 
                        wrapperStyle={{ zIndex: 10000, pointerEvents: 'none' }}
                      />
                      {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map((div, i) => {
                        const isAnyActive = activeTrendDivId !== null;
                        const isActive = activeTrendDivId === div.id;

                        const strokeWidth = isAnyActive ? (isActive ? 4 : 1) : 2.5;
                        const strokeOpacity = isAnyActive ? (isActive ? 1.0 : 0.2) : 0.85;
                        const fillOpacity = isAnyActive ? (isActive ? 0.45 : 0.02) : 0.15;

                        return (
                          <Area 
                            key={div.id} 
                            type="monotone" 
                            dataKey={div.name} 
                            stroke={div.color || '#cbd5e1'} 
                            fill={`url(#grad-div-${div.id})`}
                            style={{ strokeWidth, strokeOpacity, fillOpacity, transition: 'fill-opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), stroke-opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), stroke-width 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                            dot={{ r: 2.5, strokeWidth: 1, fill: '#ffffff', strokeOpacity: strokeOpacity }}
                            activeDot={{ r: 4 }}
                            isAnimationActive={true}
                            animationDuration={400}
                          >
                            {(isActive || !isAnyActive) && (
                              <LabelList 
                                dataKey={div.name}
                                content={(props: any) => {
                                  const { x, y, value, index } = props;
                                  if (!value || value === 0) return null;
                                  
                                  const currentStage = stageDivisionData[index];
                                  let dy = -14;
                                  if (currentStage) {
                                    const allVals = divisions
                                      .map((d: any) => currentStage[d.name] as number)
                                      .filter((v: number) => v > 0);
                                    const closeVals = allVals.filter((v: number) => Math.abs(v - value) < 400).sort((a: number, b: number) => b - a);
                                    if (closeVals.length > 1) {
                                      const myRank = closeVals.indexOf(value);
                                      dy = -14 + (myRank * 16) - ((closeVals.length - 1) * 6);
                                    }
                                  }
                                  
                                  return (
                                    <g style={{ pointerEvents: 'none' }}>
                                      <text 
                                        x={x} 
                                        y={y + dy} 
                                        fill={isActive ? "#0f172a" : "#64748b"} 
                                        fontSize={10.5} 
                                        fontWeight="900" 
                                        textAnchor="middle" 
                                        dominantBaseline="central"
                                        stroke="#ffffff" 
                                        strokeWidth={4} 
                                        paintOrder="stroke"
                                        strokeLinejoin="round"
                                        style={{ transition: 'all 300ms ease' }}
                                      >
                                        {value > 1000 ? `${(value/1000).toFixed(1)}천` : Math.round(value)}
                                      </text>
                                    </g>
                                  );
                                }}
                              />
                            )}
                          </Area>
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>


            </div>
          </div>
        </div>
      </div>
      </div>
      </PrintPageWrapper>

      <PrintPageWrapper page={2} total={2}>
      {/* Floor & Ward Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full">
        {/* Floor Distribution - Scaled cleanly to 7/10 width */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] justify-between lg:col-span-7 col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-orange-500" />
                <h3 className="text-sm font-black text-slate-800 tracking-tight">층별 면적 분포</h3>
              </div>

              {/* Capsule Legend Filter for Floor Chart with hover margin */}
              <div 
                className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide py-2.5 px-2 -my-2 flex-1 justify-end"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', outline: 'none', border: 'none' }}
              >
                {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map((d, i) => {
                  const isActive = activeTrendDivId === d.id;
                  return (
                    <motion.button 
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTrendDivId(isActive ? null : d.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 flex-shrink-0",
                        isActive 
                          ? "bg-indigo-500 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-100" 
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-white" : "")} style={{ backgroundColor: isActive ? undefined : d.color }} />
                      <span className="text-[8.5px] font-bold whitespace-nowrap">{d.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div className="h-[310px] w-full relative">
               <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`bar-floors-rc-${medicalOnly}-${activeTrendDivId || 'all'}`}>
                 <BarChart 
                   layout="vertical" 
                   data={floorDivisionData} 
                   margin={{ top: 10, right: 55, left: -5, bottom: 10 }}
                   className="outline-none"
                   style={{ outline: 'none' }}
                   tabIndex={-1}
                   barCategoryGap={12}
                  >
                    <XAxis type="number" hide domain={[0, (dataMax: number) => dataMax * 1.15]} />
                    <YAxis 
                       dataKey="name" 
                       type="category" 
                       axisLine={false} 
                       tickLine={false} 
                       width={40}
                       tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      content={
                        <CustomTooltip 
                          highlightedDivId={activeTrendDivId} 
                          departments={departments}
                          rooms={rooms}
                          values={values}
                          activeStageId={currentStage?.id}
                          floors={floors}
                        />
                      } 
                      wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    {divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id)).map((div, i, arr) => {
                      const isAnyActive = activeTrendDivId !== null;
                      const isActive = activeTrendDivId === div.id;
                      const barOpacity = isAnyActive ? (isActive ? 1.0 : 0.15) : 1.0;
                      return (
                        <Bar 
                          key={div.id} 
                          dataKey={div.name} 
                          stackId="a" 
                          fill={div.color || '#cbd5e1'} 
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          radius={[4, 4, 4, 4]} 
                          barSize={20} 
                          isAnimationActive={true}
                          animationDuration={400}
                          style={{ fillOpacity: barOpacity, cursor: 'pointer', transition: 'fill-opacity 400ms ease', outline: 'none' }}
                          onClick={() => {
                            if (activeTrendDivId === div.id) {
                              setActiveTrendDivId(null);
                            } else {
                              setActiveTrendDivId(div.id);
                            }
                          }}
                          label={(props: any) => {
                            const { x, y, width, height, value } = props;
                            if (!value || width <= 35) return null;
                            
                            return (
                              <g style={{ pointerEvents: 'none' }}>
                                {isActive && (
                                   <text x={x + width / 2} y={y + height / 2 + 1} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold">
                                     {Math.round(value).toLocaleString()}
                                   </text>
                                )}
                              </g>
                            );
                          }}
                        />
                      );
                    })}

                    {/* Dummy stack bar at the end to render total area labels directly docked next to the last bar */}
                    <Bar 
                      dataKey="dummyTotal" 
                      stackId="a" 
                      fill="transparent" 
                      isAnimationActive={false}
                      label={(props: any) => {
                        const { x, y, width, height, index } = props;
                        const rowData = floorDivisionData[index];
                        if (!rowData) return null;
                        const total = rowData.totalArea;
                        
                        const isAnyActive = activeTrendDivId !== null;
                        const opacity = isAnyActive ? 0.35 : 1.0;

                        return (
                          <text 
                            x={x + 6} 
                            y={y + height / 2 + 1} 
                            fill="#475569" 
                            fontSize={11.5} 
                            fontWeight="900" 
                            textAnchor="start"
                            dominantBaseline="central"
                            opacity={opacity}
                            style={{ pointerEvents: 'none', transition: 'opacity 400ms ease' }}
                          >
                            {`${total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ㎡`}
                          </text>
                        );
                      }}
                    />
                          
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 병상 구성 (List Layout) - Placed on the right of floor distribution (3/10 width) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between lg:col-span-3 col-span-1 relative overflow-hidden h-[400px]"
          style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-50/45 transition-colors duration-500" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hospital size={18} className="text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 tracking-tight">허가병상 구성</h3>
            </div>
            <div className="text-right items-baseline flex gap-1">
              <span className="text-[11px] font-bold text-slate-400 mt-1">총</span>
              <h3 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">
                {wardBedsData.totalBedsSum}
              </h3>
              <span className="text-[11px] font-bold text-slate-400 mt-1">병상</span>
            </div>
          </div>
          
          <div className="z-10 flex flex-col flex-1 justify-between mt-auto">
            
            <div className="space-y-1 flex-1 flex flex-col justify-end">
              {wardBedsData.list.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-100/60 pb-1 last:border-0 last:pb-0">
                  <span className="text-slate-500 font-bold">{item.label}</span>
                  <div className="flex items-center text-right text-[10px]">
                    <div className="w-12 text-right pr-1">
                      {item.rooms !== null ? (
                        <span className="text-slate-400 font-semibold">{item.rooms}실</span>
                      ) : (
                        <span className="text-[9px] text-slate-300/40 select-none">-</span>
                      )}
                    </div>
                    <div className="w-13 text-right">
                      <span className="text-slate-800 font-black">{item.beds}병상</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200">
               <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                 <AlertCircle size={12} className="text-slate-400" />
                 허가 외 병상
               </div>
               <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-slate-500 w-full justify-between pr-4">
                  <span>응급 <span className="font-bold text-slate-600">20</span></span>
                  <span className="text-slate-200">|</span>
                  <span>내시경 <span className="font-bold text-slate-600">10</span></span>
                  <span className="text-slate-200">|</span>
                  <span>재활 <span className="font-bold text-slate-600">10</span></span>
                  <span className="text-slate-200">|</span>
                  <span>주사실 <span className="font-bold text-slate-600">8</span></span>
               </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Top Changes Grid - Grouped into Guideline and Intermediate Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Card Main 1: 공모지침 대비 현재면적 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid size={18} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800">공모지침 대비 면적변화</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sub Card: 최대 증가 */}
            <div className="bg-rose-50/20 p-4 rounded-xl border border-rose-100/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11.5px] font-black text-slate-700 flex items-center gap-1.5 leading-none">
                  <TrendingUp size={14} className="text-rose-500" />
                  최대 증가
                </h3>
              </div>
              <div className="space-y-2">
                {guidelineChanges.increased.map((c, i) => (
                  <div 
                    key={i} 
                    className="relative flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-rose-100/30 hover:border-rose-300 group transition-all cursor-help"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-xl pointer-events-none flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-slate-300 font-normal">공모지침 → 현재</span>
                      <span><span className="font-bold">{f(c.base)}</span> → <span className="font-bold">{f(c.target)}</span> <span className="text-rose-400 ml-1">(+{f(c.diff)})</span></span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                    </div>
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <div className="w-4 h-4 rounded bg-rose-100 text-rose-600 flex-shrink-0 flex items-center justify-center font-bold text-[9px]">{i+1}</div>
                      <div className="text-[10px] font-bold text-slate-700 truncate" title={c.name}>{c.name}</div>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      <div className="text-[10px] font-bold text-rose-600 whitespace-nowrap">
                        {f(c.target)}㎡ <span className="opacity-70 text-[9px] font-medium">(+{f(c.diff)})</span>
                      </div>
                    </div>
                  </div>
                ))}
                {guidelineChanges.increased.length === 0 && <p className="text-[9px] text-slate-400 italic text-center py-2">증가 없음</p>}
              </div>
            </div>

            {/* Sub Card: 최대 감소 */}
            <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11.5px] font-black text-slate-700 flex items-center gap-1.5 leading-none">
                  <TrendingDown size={14} className="text-emerald-500" />
                  최대 감소
                </h3>
              </div>
              <div className="space-y-2">
                {guidelineChanges.decreased.map((c, i) => (
                  <div 
                    key={i} 
                    className="relative flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-emerald-100/30 hover:border-emerald-300 group transition-all cursor-help"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-xl pointer-events-none flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-slate-300 font-normal">공모지침 → 현재</span>
                      <span><span className="font-bold">{f(c.base)}</span> → <span className="font-bold">{f(c.target)}</span> <span className="text-emerald-400 ml-1">({f(c.diff)})</span></span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                    </div>
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <div className="w-4 h-4 rounded bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-[9px]">{i+1}</div>
                      <div className="text-[10px] font-bold text-slate-700 truncate" title={c.name}>{c.name}</div>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      <div className="text-[10px] font-bold text-emerald-600 whitespace-nowrap">
                        {f(c.target)}㎡ <span className="opacity-70 text-[9px] font-medium">({f(c.diff)})</span>
                      </div>
                    </div>
                  </div>
                ))}
                {guidelineChanges.decreased.length === 0 && <p className="text-[9px] text-slate-400 italic text-center py-2">감소 없음</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Card Main 2: 중간설계 대비 현재면적 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800">중간설계 대비 면적변화</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sub Card: 최대 증가 */}
            <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11.5px] font-black text-slate-700 flex items-center gap-1.5 leading-none">
                  <TrendingUp size={14} className="text-indigo-600" />
                  최대 증가
                </h3>
              </div>
              <div className="space-y-2">
                {intermediateChanges.increased.map((c, i) => (
                  <div 
                    key={i} 
                    className="relative flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-indigo-100/30 hover:border-indigo-300 group transition-all cursor-help"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-xl pointer-events-none flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-slate-300 font-normal">중간설계 → 현재</span>
                      <span><span className="font-bold">{f(c.base)}</span> → <span className="font-bold">{f(c.target)}</span> <span className="text-indigo-400 ml-1">(+{f(c.diff)})</span></span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                    </div>
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-600 flex-shrink-0 flex items-center justify-center font-bold text-[9px]">{i+1}</div>
                      <div className="text-[10px] font-bold text-slate-700 truncate" title={c.name}>{c.name}</div>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      <div className="text-[10px] font-bold text-indigo-600 whitespace-nowrap">
                        {f(c.target)}㎡ <span className="opacity-70 text-[9px] font-medium">(+{f(c.diff)})</span>
                      </div>
                    </div>
                  </div>
                ))}
                {intermediateChanges.increased.length === 0 && <p className="text-[9px] text-slate-400 italic text-center py-2">증가 없음</p>}
              </div>
            </div>

            {/* Sub Card: 최대 감소 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11.5px] font-black text-slate-700 flex items-center gap-1.5 leading-none">
                  <TrendingDown size={14} className="text-slate-600" />
                  최대 감소
                </h3>
              </div>
              <div className="space-y-2">
                {intermediateChanges.decreased.map((c, i) => (
                  <div 
                    key={i} 
                    className="relative flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 group transition-all cursor-help"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-[11px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] whitespace-nowrap shadow-xl pointer-events-none flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-slate-300 font-normal">중간설계 → 현재</span>
                      <span><span className="font-bold">{f(c.base)}</span> → <span className="font-bold">{f(c.target)}</span> <span className="text-slate-400 ml-1">({f(c.diff)})</span></span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                    </div>
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-600 flex-shrink-0 flex items-center justify-center font-bold text-[9px]">{i+1}</div>
                      <div className="text-[10px] font-bold text-slate-700 truncate" title={c.name}>{c.name}</div>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      <div className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                        {f(c.target)}㎡ <span className="opacity-70 text-[9px] font-medium">({f(c.diff)})</span>
                      </div>
                    </div>
                  </div>
                ))}
                {intermediateChanges.decreased.length === 0 && <p className="text-[9px] text-slate-400 italic text-center py-2">감소 없음</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division Dept Shares */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope size={18} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">부문 내 부서 구성비</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-7 gap-y-6">
           {divisionDeptShares.map((div, i) => (
              <div key={i} className="flex flex-col p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/90 transition-all">
                {/* Visual Header for Division Block */}
                <div className="text-[12px] font-extrabold text-slate-800 mb-1.5 flex items-center justify-center gap-1.5 border-b border-slate-200/50 pb-1.5">
                  <span className="truncate">{div.divisionName}</span>
                  <span 
                    className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full select-none"
                    style={{ backgroundColor: `${div.color}18`, color: div.color }}
                  >
                    {div.data.length}개 부서
                  </span>
                </div>

                <div className="w-full aspect-square relative mb-0 pb-1">
                   <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                     <PieChart style={{ outline: 'none' }} tabIndex={-1}>
                        <Pie
                          data={div.data}
                          innerRadius="52%" 
                          outerRadius="82%"
                          dataKey="value"
                          isAnimationActive={false}
                          label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                            if (percent < 0.07) return null;
                            
                            const RADIAN = Math.PI / 180;
                            const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            
                            return (
                              <g style={{ pointerEvents: 'none' }}>
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="#ffffff" 
                                  textAnchor="middle" 
                                  dominantBaseline="central" 
                                  fontSize={11} 
                                  fontWeight="900" 
                                  style={{ 
                                    filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.7))',
                                    paintOrder: 'stroke',
                                    stroke: 'rgba(0,0,0,0.15)',
                                    strokeWidth: '1.5px'
                                  }}
                                >
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              </g>
                            );
                          }}
                          labelLine={false}
                        >
                          {div.data.map((entry, idx) => (
                            <Cell 
                              key={`cell-${idx}`} 
                              fill={div.color} 
                              fillOpacity={Math.max(0.2, 1 - (idx * (div.data.length >= 10 ? 0.08 : 0.15)))} 
                              stroke="#fff" 
                              strokeWidth={1.5}
                              style={{ outline: 'none' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={<CustomTooltip isPie pieTotal={div.data.reduce((acc, d) => acc + d.value, 0)} />} 
                          cursor={false} 
                          wrapperStyle={{ zIndex: 10000, pointerEvents: 'none' }} 
                        />
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="text-center mt-1">
                        <div className="text-[6.5px] font-bold text-slate-400 capitalize tracking-tighter">총 면적</div>
                        <div className="text-[16px] font-black text-slate-800 leading-none mt-0.5 tabular-nums">
                          {f(div.data.reduce((acc, d) => acc + d.value, 0))}
                        </div>
                      </div>
                   </div>
                </div>
                <div className="w-full relative z-10 px-0.5 mt-2 pt-1 border-t border-dashed border-slate-200/80">
                   <div className="space-y-0 text-[8px]">
                     {div.data.slice(0, 5).map((dept, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-white border border-transparent hover:border-slate-100/50 transition-all cursor-default">
                           <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1.5">
                             <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: div.color, opacity: 1 - (idx * 0.15) }} />
                             <span className="text-[8px] text-slate-600 font-bold truncate leading-none">{dept.name}</span>
                           </div>
                           <span className="text-[8px] font-extrabold text-slate-500 flex-shrink-0 tabular-nums">{f(dept.value)}</span>
                        </div>
                     ))}
                   </div>
                   {div.data.length > 5 && <div className="text-center text-[8px] text-slate-400 mt-1 italic font-medium">...외 {div.data.length - 5}개 부서</div>}
                </div>
              </div>
           ))}
        </div>
      </div>
      </PrintPageWrapper>
    </div>
  );
};

export default Dashboard;
