import React, { useMemo, useState } from 'react';
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
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to format numbers with commas
const f = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

// High-fidelity, glossmorphic custom tooltip for visual excellence
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isBed?: boolean;
  isPie?: boolean;
  pieTotal?: number;
  highlightedDivId?: string | null;
  departments?: Department[];
  rooms?: Room[];
  values?: RoomValue[];
  activeStageId?: string;
  floors?: any[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, payload, label, isBed, isPie, pieTotal, 
  highlightedDivId, departments, rooms, values, activeStageId, floors 
}) => {
  if (!active || !payload || !payload.length) return null;

  const validPayload = payload.filter((entry: any) => Number(entry.value) > 0);
  if (validPayload.length === 0) return null;

  const totalSum = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  // Dynamic Content for Floor Chart when a Division is highlighted
  const isFloorChart = !!highlightedDivId && !!departments && !!floors;
  let floorDeptItems: { name: string, value: number, color: string }[] = [];

  if (isFloorChart && highlightedDivId) {
    const currentFloor = floors.find(f => f.name === label);
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
    const pTotal = pieTotal || React.Children.toArray(validPayload).reduce((acc: any, val: any) => acc + val.value, 0); 
    const percentageText = pTotal > 0 
      ? `(${((value / pTotal) * 100).toFixed(2)}%)` 
      : (entry.payload?.percent ? `(${(entry.payload.percent * 100).toFixed(2)}%)` : '');
    
    return (
      <div 
        className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-2 py-1.5 rounded-lg shadow-lg z-[10000] pointer-events-none"
        style={{ fontFamily: '"Noto Sans KR", "Pretendard Variable", sans-serif', outline: 'none' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-[11px] font-medium text-slate-700 truncate max-w-[100px]">{entry.name}</span>
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
          {label || displayPayload[0]?.name}
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
          const name = entry.name || '';
          
          let percentageText = '';
          if (showSummarySum && currentTotal > 0) {
            percentageText = ` (${((value / currentTotal) * 100).toFixed(2)}%)`;
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
  const isPdfExportMode = useAppStore(state => state.isPdfExportMode);
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

  // Filter components based on medicalOnly (Division IDs 1-5 usually)
  const medicalDivisionIds = useMemo(() => {
    return divisions.slice(0, 5).map(d => d.id);
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
          row[dept.name] = Number(area.toFixed(2));
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
      
      // Calculate Net Area (Medical Only filter applied if active)
      const medicalStageValues = stageValues.filter(v => {
        if (!medicalOnly) return true;
        const room = rooms.find(r => r.id === v.roomId);
        const dept = departments.find(d => d.id === room?.departmentId);
        return dept && medicalDivisionIds.includes(dept.divisionId);
      });
      const netTotal = medicalStageValues.reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      
      // Calculate specific deduction areas: Parking and Outdoor Common
      // These are calculated across ALL departments, not just medical ones
      const parkingArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        const dept = departments.find(d => d.id === room?.departmentId);
        const div = divisions.find(d => d.id === dept?.divisionId);
        const isParking = (dept?.name || "").includes("주차장") || (div?.name || "").includes("주차장");
        return isParking ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);

      const outdoorArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        const dept = departments.find(d => d.id === room?.departmentId);
        const div = divisions.find(d => d.id === dept?.divisionId);
        const isOutdoor = (dept?.name || "").includes("옥외공용") || (div?.name || "").includes("옥외공용");
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
      // User requested: Excude Parking/Outdoor from both when medical filter is on
      const adjustedGross = finalGross - parkingArea - outdoorArea;
      
      // Calculate overall total net for proportional distribution of common area
      const totalNetAll = stageValues.reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      const overallCommon = adjustedGross - totalNetAll;
      
      let common = 0;
      let displayGross = adjustedGross;

      if (medicalOnly) {
        // Proportional distribution of common area for medical divisions
        const medicalNetRatio = totalNetAll > 0 ? (netTotal / totalNetAll) : 0;
        common = overallCommon * medicalNetRatio;
        displayGross = netTotal + common;
      } else {
        common = overallCommon;
        displayGross = adjustedGross;
      }
      
      const gnRatio = netTotal > 0 ? (displayGross / netTotal) : 0;
      
      return {
        id: stage.id,
        name: stage.name,
        net: netTotal,
        gross: finalGross,
        adjustedGross: displayGross, // Using the adjusted one for display/KPIs
        parking: parkingArea,
        outdoor: outdoorArea,
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

  // High precision calculation for Ward Bed configuration (병동부 병상 구성)
  const wardBedsData = useMemo(() => {
    if (!currentStage) return { total: 0, items: [] };
    const stageValues = values.filter(v => v.stageId === currentStage.id);
    const wardRooms = rooms.filter(r => {
      const dept = departments.find(d => d.id === r.departmentId);
      return r.departmentId === "101" || dept?.name.includes("병동");
    });

    let beds4 = 0;
    let beds2 = 0;
    let beds1 = 0;
    let bedsSpecial = 0;

    wardRooms.forEach(room => {
      const roomVal = stageValues.find(v => v.roomId === room.id);
      if (!roomVal) return;
      const q = roomVal.quantity || 0;
      const multiplier = room.departmentId === "101" 
        ? (floorWardOverrides[`${room.floorId}|101`] ?? 1) 
        : 1;
      const totalQty = q * multiplier;

      const name = room.name || "";
      if (name.includes("4인") || name.includes("4인실")) {
        beds4 += totalQty * 4;
      } else if (name.includes("2인") || name.includes("2인실")) {
        beds2 += totalQty * 2;
      } else if (name.includes("1인") || name.includes("1인실") || name.includes("독실") || name.includes("특실") || name.includes("임종")) {
        beds1 += totalQty * 1;
      } else if (name.includes("중환자") || name.includes("ICU") || name.includes("격리") || name.includes("무균") || name.includes("특수")) {
        const matchBeds = name.match(/(\d+)인/);
        const perRoom = matchBeds ? parseInt(matchBeds[1]) : 1;
        bedsSpecial += totalQty * perRoom;
      } else {
        // Fallback for ward rooms that are generic multi-beds
        const matchBeds = name.match(/(\d+)인/);
        if (matchBeds) {
          const perRoom = parseInt(matchBeds[1]);
          bedsSpecial += totalQty * perRoom;
        }
      }
    });

    const calculatedTotal = beds4 + beds2 + beds1 + bedsSpecial;

    // Standard baseline fallback if beds calculation result is zero, based on 300-bed scale guidelines for Gyeongnam West Medical Center
    if (calculatedTotal === 0) {
      return {
        total: 300,
        items: [
          { name: "4인실", value: 212, percentage: 70.67, color: "#6366f1" },
          { name: "2인실", value: 48, percentage: 16.00, color: "#38bdf8" },
          { name: "1인실", value: 24, percentage: 8.00, color: "#34d399" },
          { name: "특수/격리", value: 16, percentage: 5.33, color: "#f43f5e" }
        ]
      };
    }

    const items = [
      { name: "4인실", value: beds4, percentage: (beds4 / calculatedTotal) * 100, color: "#6366f1" },
      { name: "2인실", value: beds2, percentage: (beds2 / calculatedTotal) * 100, color: "#38bdf8" },
      { name: "1인실", value: beds1, percentage: (beds1 / calculatedTotal) * 100, color: "#34d399" },
      { name: "특수/격리", value: bedsSpecial, percentage: (bedsSpecial / calculatedTotal) * 100, color: "#f43f5e" }
    ].filter(i => i.value > 0);

    return {
      total: calculatedTotal,
      items: items
    };
  }, [currentStage, values, rooms, departments, floorWardOverrides]);

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
      const data: any = { name: floor.name, totalArea: 0 };
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

  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto flex flex-col gap-6 p-6 bg-slate-50 select-none">
      {/* Dashboard Toolbar */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            실시간 면적 분석 대시보드
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">Live</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">경상남도 서부의료원 신축사업 설계 단계별 면적 추적</p>
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

      {/* 5-Column High-Performance Core KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: 전용면적 (Net) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-default"
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-50/45 transition-colors duration-500" />
          
          <div className="flex justify-between items-center z-10">
            <span className="text-slate-500 text-[13.5px] font-bold tracking-tight">전용면적 (Net)</span>
            <div className="p-2 bg-indigo-50/80 text-indigo-600 rounded-xl border border-indigo-100/30">
              <LayoutGrid size={16} />
            </div>
          </div>
          <div className="mt-5 z-10">
            <h3 className="text-[26px] font-black text-slate-800 tracking-tight leading-none">
              {(currentStage?.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">㎡</span>
            </h3>
            <p className="text-slate-400 text-[11.5px] mt-2 font-medium">
              지침 대비 <span className={cn(
                "font-black tracking-tight",
                ((currentStage?.net || 0) / (baseStage?.net || 1) * 100) - 100 > 0 ? "text-rose-500" : "text-emerald-500"
              )}>
                {(((currentStage?.net || 0) / (baseStage?.net || 1) * 100) - 100) > 0 ? "+" : ""}
                {(((currentStage?.net || 0) / (baseStage?.net || 1) * 100) - 100).toFixed(2)}%
              </span> 변동
            </p>
          </div>
        </motion.div>

        {/* KPI 2: 공용면적 (Common) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)" }}
          className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-default"
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-50/45 transition-colors duration-500" />

          <div className="flex justify-between items-center z-10">
            <span className="text-slate-500 text-[13.5px] font-bold tracking-tight">공용면적 (Common)</span>
            <div className="p-2 bg-blue-50/80 text-blue-600 rounded-xl border border-blue-100/30">
              <Box size={16} />
            </div>
          </div>
          <div className="mt-5 z-10">
            <h3 className="text-[26px] font-black text-slate-800 tracking-tight leading-none">
              {calculatedCommonArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">㎡</span>
            </h3>
            <p className="text-slate-400 text-[11.5px] mt-2 font-medium">
              전용면적 대비 <span className="font-bold text-indigo-500 tracking-tight">{calculatedCommonToNetRatio.toFixed(2)}%</span>
            </p>
          </div>
        </motion.div>

        {/* KPI 3: GN비 (Gross / Net) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)" }}
          className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-default"
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-50/45 transition-colors duration-500" />

          <div className="flex justify-between items-center z-10">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[13.5px] font-bold tracking-tight">G/N 비율</span>
              <span className="text-[9px] text-slate-400 font-medium">(전용+공용) / 전용</span>
            </div>
            <div className="p-2 bg-emerald-50/80 text-emerald-600 rounded-xl border border-emerald-100/30">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3 text-center z-10">
            <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-none mb-1">
              {(currentStage?.gnRatio || 0).toFixed(2)} <span className="text-[13px] font-bold text-slate-400">배</span>
            </h3>
            {/* Embedded 100% Dual Bar representing adjusted Gross vs Net */}
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 flex mt-3 shadow-inner">
              <div 
                className="h-full bg-indigo-500 transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, (1 / (currentStage?.gnRatio || 1)) * 100)}%` }} 
                title="전용" 
              />
              <div className="h-full bg-emerald-500 transition-all duration-700 ease-out flex-1" title="공합(공용+조정)" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1.5 leading-none">
              <span>전용 {((1 / (currentStage?.gnRatio || 1)) * 100).toFixed(2)}%</span>
              <span>공용 {((1 - (1 / (currentStage?.gnRatio || 1))) * 100).toFixed(2)}%</span>
            </div>
          </div>
        </motion.div>

        {/* KPI 4: 단계별 면적 추세 (임베디드 미니 라인차트) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)" }}
          className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-default"
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-50/45 transition-colors duration-500" />

          <div className="flex justify-between items-center z-10">
            <span className="text-slate-500 text-[13.5px] font-bold tracking-tight">단계별 면적 추세</span>
            <div className="p-2 bg-violet-50/80 text-violet-600 rounded-xl border border-violet-100/30">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="h-[46px] w-full mt-3.5 z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                key={`composed-${activeTrendDivId || 'all'}`}
                data={areaByStage} 
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                style={{ outline: 'none' }}
                tabIndex={-1}
              >
                <defs>
                  <linearGradient id="miniGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ zIndex: 10000, pointerEvents: 'none' }} />
                <Area type="monotone" dataKey="gross" fill="url(#miniGross)" stroke="#6366f1" strokeWidth={1.5} name="연면적" dot={false} activeDot={{ r: 4 }} isAnimationActive={!isPdfExportMode} animationDuration={400}>
                    <LabelList 
                      dataKey="gross" 
                      position="top" 
                      offset={5} 
                      fontSize={6} 
                      fill="#6366f1" 
                      formatter={(v: number) => Math.round(v).toLocaleString()}
                    />
                </Area>
                <Line type="monotone" dataKey="net" stroke="#f43f5e" strokeWidth={2} dot={false} name="전용면적" activeDot={{ r: 4 }} isAnimationActive={!isPdfExportMode} animationDuration={400}>
                    <LabelList 
                      dataKey="net" 
                      position="bottom" 
                      offset={5} 
                      fontSize={6} 
                      fill="#f43f5e" 
                      formatter={(v: number) => Math.round(v).toLocaleString()}
                    />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 leading-none z-10">
            <span>{areaByStage[0]?.name || ''}</span>
            <span>{areaByStage[areaByStage.length-1]?.name || ''}</span>
          </div>
        </motion.div>

        {/* KPI 5: 병동부 병상 구성 (List Layout) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)" }}
          className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-default"
        >
          {/* Subtle gradient glow in bg */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-50/45 transition-colors duration-500" />

          <div className="flex justify-between items-center z-10">
            <span className="text-slate-500 text-[13.5px] font-bold tracking-tight">병동부 병상 구성</span>
            <div className="p-2 bg-amber-50/80 text-amber-600 rounded-xl border border-amber-100/30">
              <Hospital size={16} />
            </div>
          </div>
          <div className="mt-3 z-10 flex flex-col">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">
              총 15 <span className="text-xs font-bold text-slate-400">병상</span>
            </h3>
          </div>
          
          <div className="space-y-1.5 mt-1">
            {[
              { label: '4인실', rooms: 0, beds: 0 },
              { label: '2인실', rooms: 0, beds: 0 },
              { label: '1인실', rooms: 0, beds: 0 },
              { label: '4인실(격리)', rooms: 0, beds: 0 },
              { label: '1인실(격리)', rooms: 0, beds: 0 },
              { label: '개방(ICU)', beds: 12 },
              { label: '격리(ICU)', beds: 3 },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10.5px]">
                <span className="text-slate-500 font-bold">{item.label}</span>
                <div className="flex gap-2">
                  {'rooms' in item && <span className="text-slate-400 font-medium">{item.rooms}실</span>}
                  <span className="text-slate-800 font-black">{item.beds}병상</span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Division share donut - Takes 2/5 (40%) width */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 lg:col-span-2 min-h-[340px] flex flex-col justify-between" style={{ fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChartIcon size={18} className="text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 tracking-tight">부문별 면적 비중</h3>
              </div>
              
              {/* Top-Right Capsule Legend - Expanded width */}
              <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end ml-4">
                {divisionData.map((d, i) => {
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
                          ? "bg-indigo-500 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-100 font-bold" 
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 font-medium"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-white" : "")} style={{ backgroundColor: isActive ? undefined : d.color }} />
                      <span className="text-[9px] whitespace-nowrap">{d.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center w-full h-full">
              {/* Centered Circular Chart (Expanded size as requested: 500x400) */}
              <div className="w-[500px] h-[400px] relative flex-shrink-0 mx-auto flex items-center justify-center z-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart 
                    key={`pie-main-${activeTrendDivId || 'all'}`}
                    margin={{ top: 20, right: 80, left: 80, bottom: 20 }}
                    style={{ outline: 'none' }}
                    tabIndex={-1}
                  >
                    <Pie
                      data={divisionData}
                      innerRadius="55%" 
                      outerRadius="86%"
                      paddingAngle={4}
                      cornerRadius={7} // Rounded edges
                      dataKey="value"
                      isAnimationActive={!isPdfExportMode}
                      animationDuration={700}
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
                      label={({ x, y, cx, cy, name, percent, value }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#1e293b" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central" 
                          fontSize={11.5} 
                          fontWeight="bold"
                          style={{ fontFamily: '"Pretendard Variable", sans-serif' }}
                        >
                          <tspan x={x} dy="-0.6em">{name}</tspan>
                          <tspan x={x} dy="1.3em" fill="#64748b" fontSize={10.5} fontWeight="medium">
                            {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}㎡ ({(percent * 100).toFixed(2)}%)
                          </tspan>
                        </text>
                      )}
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
                            style={{ opacity: opacityVal, transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none', cursor: 'pointer' }}
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
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">총 전용면적</span>
                  <span className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1.5 font-sans">
                    {(currentStage?.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">㎡</span>
                </div>
              </div>

              {/* Legend moved to header */}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 lg:col-span-3 min-h-[340px] flex flex-col justify-between">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-800">단계별 부문별 면적 추이</h3>
                </div>

                {/* Top-Right Capsule Legend for Trends - Expanded width */}
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end ml-4">
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
                            ? "bg-indigo-500 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-100 font-bold" 
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 font-medium"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-white" : "")} style={{ backgroundColor: isActive ? undefined : d.color }} />
                        <span className="text-[9px] whitespace-nowrap">{d.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="h-[300px] sm:h-[330px] md:h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    key={`area-trends-${activeTrendDivId || 'all'}`}
                    data={stageDivisionData} 
                    margin={{ top: 10, right: 20, left: 0, bottom: 2 }}
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
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      dy={10}
                      padding={{ left: 20, right: 20 }}
                    />
                    <YAxis 
                      axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(1)}k`}
                      width={50}
                      padding={{ top: 20, bottom: 0 }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={false} 
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
                          dot={{ r: 3, strokeWidth: 1, fill: '#ffffff', strokeOpacity: strokeOpacity }}
                          activeDot={{ r: 5 }}
                          isAnimationActive={!isPdfExportMode}
                          animationDuration={450}
                          animationEasing="ease-out"
                        >
                          {(isActive || !isAnyActive) && (
                            <LabelList 
                              dataKey={div.name} 
                              position="top" 
                              offset={12} 
                              fontSize={11} 
                              fill={div.color} 
                              fontWeight="bold"
                              formatter={(v: number) => v > 0 ? (v > 1000 ? `${(v/1000).toFixed(1)}k` : Math.round(v).toString()) : ""}
                            />
                          )}
                        </Area>
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>


            {/* Legend moved to header */}
          </div>
        </div>
      </div>

      {/* Trend & Floor Row -> Replaced with Full-Width elegant floor distribution */}
      <div className="w-full">
        {/* Floor Distribution - Scaled cleanly to full width */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] justify-between w-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-orange-500" />
                <h3 className="text-sm font-black text-slate-800 tracking-tight">층별 부문 면적 분포</h3>
              </div>

              {/* Capsule Legend Filter for Floor Chart */}
              <div 
                className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 max-w-[400px] scrollbar-hide"
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
                      <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-white" : "")} style={{ backgroundColor: isActive ? undefined : d.color }} />
                      <span className="text-[9px] font-bold whitespace-nowrap">{d.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div className="h-[310px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart 
                   key={`bar-floors-${activeTrendDivId || 'all'}`}
                   layout="vertical" 
                   data={floorDivisionData} 
                   margin={{ top: 5, right: 45, left: -20, bottom: 5 }}
                   className="outline-none"
                   style={{ outline: 'none' }}
                   tabIndex={-1}
                   barCategoryGap={10}
                  >
                    <XAxis type="number" hide />
                    <YAxis 
                       dataKey="name" 
                       type="category" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip 
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
                      cursor={false}
                      wrapperStyle={{ pointerEvents: 'none', transition: 'transform 0.1s ease-out' }}
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
                          radius={[6, 6, 6, 6]} 
                          barSize={24} 
                          isAnimationActive={!isPdfExportMode}
                          animationDuration={800}
                          animationEasing="ease-in-out"
                          style={{ fillOpacity: barOpacity, cursor: 'pointer', transition: 'fill-opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none' }}
                          onClick={() => {
                            if (activeTrendDivId === div.id) {
                              setActiveTrendDivId(null);
                            } else {
                              setActiveTrendDivId(div.id);
                            }
                          }}
                          label={(props: any) => {
                            const { x, y, width, height, value, payload } = props;
                            if (!value || !payload) return null;
                            
                            const isLast = payload.lastDivName === div.name;

                            return (
                              <g style={{ pointerEvents: 'none' }}>
                                {(isActive || isPdfExportMode) && width > 35 && (
                                   <text x={x + width / 2} y={y + height / 2 + 1} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={isPdfExportMode ? 7 : 8} fontWeight="bold">
                                     {Math.round(value).toLocaleString()}
                                   </text>
                                )}
                                {isLast && (
                                   <text x={x + width + 5} y={y + height / 2 + 1} fill="#64748b" textAnchor="start" dominantBaseline="central" fontSize={9} fontWeight="black" style={{ opacity: (isAnyActive && !isActive && !isPdfExportMode) ? 0.15 : 1, transition: 'opacity 600ms ease' }}>
                                     {Math.round(payload.totalArea).toLocaleString()}
                                   </text>
                                )}
                              </g>
                            );
                          }}
                        />
                      );
                    })}
                          
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top Changes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compared to Guideline */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-rose-500" />
              공모지침 대비 변동 TOP 3
            </h3>
            <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-lg">전용면적 기준</span>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-3">최대 증가 부서</p>
              <div className="grid grid-cols-1 gap-2">
                {guidelineChanges.increased.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100 group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                      <div className="text-sm font-bold text-slate-700">{c.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600">+{f(c.diff)} ㎡</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-rose-400">지침: {f(c.base)} → 현재: {f(c.target)}</div>
                    </div>
                  </div>
                ))}
                {guidelineChanges.increased.length === 0 && <p className="text-[10px] text-slate-400 italic">증가한 부서가 없습니다.</p>}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-3">최대 감소 부서</p>
              <div className="grid grid-cols-1 gap-2">
                {guidelineChanges.decreased.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                      <div className="text-sm font-bold text-slate-700">{c.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600">{f(c.diff)} ㎡</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-emerald-400">지침: {f(c.base)} → 현재: {f(c.target)}</div>
                    </div>
                  </div>
                ))}
                {guidelineChanges.decreased.length === 0 && <p className="text-[10px] text-slate-400 italic">감소한 부서가 없습니다.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Compared to Intermediate Design */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              중간설계 대비 변동 TOP 3
            </h3>
            <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-lg">전용면적 기준</span>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-3">최대 증가 부서</p>
              <div className="grid grid-cols-1 gap-2">
                {intermediateChanges.increased.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                      <div className="text-sm font-bold text-slate-700">{c.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-indigo-600">+{f(c.diff)} ㎡</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-indigo-400">중간: {f(c.base)} → 현재: {f(c.target)}</div>
                    </div>
                  </div>
                ))}
                {intermediateChanges.increased.length === 0 && <p className="text-[10px] text-slate-400 italic">증가한 부서가 없습니다.</p>}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">최대 감소 부서</p>
              <div className="grid grid-cols-1 gap-2">
                {intermediateChanges.decreased.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                      <div className="text-sm font-bold text-slate-700">{c.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-600">{f(c.diff)} ㎡</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-amber-600">중간: {f(c.base)} → 현재: {f(c.target)}</div>
                    </div>
                  </div>
                ))}
                {intermediateChanges.decreased.length === 0 && <p className="text-[10px] text-slate-400 italic">감소한 부서가 없습니다.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division Dept Shares */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-8">
          <Stethoscope size={18} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">부문 내 부서 비중 분석 <span className="text-[10px] text-slate-400 font-normal italic">(의료시설 1~5부문)</span></h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
           {divisionDeptShares.map((div, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full aspect-square relative mb-4">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart style={{ outline: 'none' }} tabIndex={-1}>
                        <Pie
                          data={div.data}
                          innerRadius="60%" 
                          outerRadius="90%"
                          dataKey="value"
                          isAnimationActive={!isPdfExportMode}
                          animationDuration={450}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {div.data.map((entry, idx) => (
                            <Cell 
                              key={`cell-${idx}`} 
                              fill={div.color} 
                              fillOpacity={1 - (idx * 0.15)} 
                              stroke="#fff" 
                              strokeWidth={2}
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
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-700 leading-tight">{div.divisionName}</div>
                      </div>
                   </div>
                </div>
                <div className="w-full space-y-2">
                   {div.data.slice(0, 3).map((dept, idx) => (
                      <div key={idx} className="flex items-center justify-between group">
                         <span className="text-[9px] text-slate-500 truncate max-w-[80px] group-hover:text-indigo-600">{dept.name}</span>
                         <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-800">{f(dept.value)}</span>
                      </div>
                   ))}
                   {div.data.length > 3 && <div className="text-center text-[8px] text-slate-300">...외 {div.data.length - 3}개</div>}
                </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
