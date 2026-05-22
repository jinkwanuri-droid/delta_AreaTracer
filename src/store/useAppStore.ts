import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { fetchAllStagesFromSheets } from "@/lib/sheetsService";
import { getAccessToken } from "@/lib/auth";

export interface Division {
  id: string;
  name: string;
  order: number;
  color?: string;
}
export interface Stage {
  id: string;
  name: string;
  order: number;
  isTotalAreaOnly?: boolean;
  code?: string;
}
export interface Floor {
  id: string;
  name: string;
  order: number;
}
export interface Department {
  id: string;
  divisionId: string;
  name: string;
  order: number;
  code?: string;
  note?: string;
}
export interface Room {
  id: string;
  floorId: string;
  departmentId: string;
  no: string;
  name: string;
  note: string;
  isGrouped?: boolean;
  originalRoomIds?: string[];
}
export interface RoomValue {
  roomId: string;
  stageId: string;
  unitArea: number;
  quantity: number;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  data: {
    stages: Stage[];
    floors: Floor[];
    divisions: Division[];
    departments: Department[];
    rooms: Room[];
    values: RoomValue[];
    floorAreasByStage: Record<string, Record<string, number>>;
  };
}

export interface AppState {
  project: { id: string; name: string } | null;
  stages: Stage[];
  floors: Floor[];
  divisions: Division[];
  departments: Department[];
  rooms: Room[];
  values: RoomValue[];
  floorAreasByStage: Record<string, Record<string, number>>;
  summaryNotes: Record<string, string>;
  roomNotes: Record<string, string>; // roomKey -> note
  departmentNotes: Record<string, string>; // deptId -> note
  visibleStageIds: string[];
  comparison: {
    baseId: string | null;
    targetId: string | null;
  };
  activeTab: "dashboard" | "summary" | "detail";
  activeFloorId: string | "all" | null;
  isPdfExportMode: boolean;
  pdfExportOptions: {
    dashboard: boolean;
    summary: boolean;
    detail: boolean;
  };
  filters: {
    divisionIds: string[];
    departmentIds: string[];
  };
  snapshots: Snapshot[];
  medicalOnly: boolean;
  isLoading: boolean;
  spreadsheetId: string | null;
  floorWardOverrides: Record<string, number>; // floorId|deptId -> count
  fetchGlobalSettings: () => Promise<void>;
  saveGlobalSettings: () => Promise<void>;
  setVisibleStageIds: (ids: string[]) => void;
  setSpreadsheetId: (id: string | null) => void;
  verifyAndSetSpreadsheetId: (id: string) => Promise<void>;
  setComparisonStages: (baseId: string | null, targetId: string | null) => void;
  fetchSnapshots: () => Promise<void>;
  saveSnapshot: (name: string, id?: string) => Promise<void>;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => Promise<void>;
  deleteFloor: (id: string) => void;
  deleteDivision: (id: string) => void;
  deleteDepartment: (id: string) => void;
  addStage: (name: string, code?: string) => void;
  updateStage: (
    id: string,
    name: string,
    code?: string,
  ) => void;
  toggleStageTotalAreaOnly: (id: string, isTotalAreaOnly: boolean) => void;
  toggleMedicalOnly: (val: boolean) => void;
  setFloorWardOverride: (floorId: string, deptId: string, count: number) => void;
  deleteStage: (id: string) => void;
  setActiveTab: (tab: "dashboard" | "summary" | "detail") => void;
  setActiveFloorId: (id: string | null) => void;
  setIsPdfExportMode: (val: boolean) => void;
  setPdfExportOptions: (val: { dashboard: boolean; summary: boolean; detail: boolean; }) => void;
  toggleDivisionFilter: (id: string) => void;
  toggleDepartmentFilter: (id: string) => void;
  fetchData: (force?: boolean) => Promise<void>;
  updateValue: (
    roomId: string,
    stageId: string,
    field: "unitArea" | "quantity",
    val: number,
  ) => void;
  updateFloorArea: (stageId: string, floorId: string, area: number) => void;
  batchUpdateFloors: (
    floors: { id: string; name: string; area: number }[],
    stageId?: string,
  ) => void;
  updateDivisionColor: (divId: string, color: string) => void;
  batchUpdateMapping: (
    mappings: {
      divName: string;
      divId: string;
      deptName: string;
      deptId: string;
    }[],
  ) => void;
  updateDepartment: (id: string, field: "code" | "note", val: string) => void;
  updateRoomNote: (roomId: string, note: string) => void;
  updateSummaryNote: (summaryId: string, note: string) => void;
}

export const getFloorVal = (name: string) => {
  if (!name) return 0;
  const match = name.match(/([A-Z]+)?(\d+)?([A-Z]+)?/);
  if (!match) return 0;
  const prefix = match[1] || "";
  const num = parseInt(match[2] || "0");
  if (prefix === "B") return -num;
  return num;
};

export const standardizeFloorId = (val: string | undefined | null): string => {
  if (!val) return "";
  let levelStr = val.toString().trim().toUpperCase();
  const levelMatch = levelStr.match(/(B)?\s*(\d+)/);
  if (levelMatch) {
    const prefix = (levelMatch[1] || "").toUpperCase();
    const num = parseInt(levelMatch[2]);
    return prefix === "B" ? `B${num}` : `${num}F`;
  }
  return levelStr;
};

export const findRoomNote = (roomNotes: Record<string, string> | undefined | null, rNo: string | number, rLevel: string | number): string => {
  if (!roomNotes) return "";
  
  const targetNo = String(rNo).trim().toUpperCase();
  const targetLevel = standardizeFloorId(String(rLevel));
  const targetKey = `${targetNo}|${targetLevel}`;
  
  // 1. Direct key match
  if (roomNotes[targetKey]) {
    return roomNotes[targetKey];
  }
  
  // 2. Flexible match across all keys
  const keys = Object.keys(roomNotes);
  for (const key of keys) {
    const parts = key.split("|");
    if (parts.length === 2) {
      const keyNo = parts[0].trim().toUpperCase();
      const keyLevel = parts[1].trim().toUpperCase();
      
      if (keyNo === targetNo) {
        if (standardizeFloorId(keyLevel) === targetLevel) {
          return roomNotes[key];
        }
        const cleanKeyLevel = keyLevel.replace(/F$/i, '');
        const cleanTargetLevel = targetLevel.replace(/F$/i, '');
        if (cleanKeyLevel === cleanTargetLevel) {
          return roomNotes[key];
        }
      }
    }
  }
  
  return "";
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      project: null,
      stages: [],
      floors: [],
      divisions: [],
      departments: [],
      rooms: [],
      values: [],
      floorAreasByStage: {},
      summaryNotes: {},
      roomNotes: {},
      departmentNotes: {},
      visibleStageIds: [],
      comparison: { baseId: null, targetId: null },
      activeTab: "detail",
      activeFloorId: "all",
      isPdfExportMode: false,
      pdfExportOptions: { dashboard: true, summary: true, detail: true },
      filters: { divisionIds: [], departmentIds: [] },
      snapshots: [],
      medicalOnly: true,
      isLoading: false,
      spreadsheetId: null,
      floorWardOverrides: {},
      fetchGlobalSettings: async () => {
        try {
          const res = await fetch("/api/global-settings");
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const data = await res.json();
            if (data && Object.keys(data).length > 0) {
              set({
                spreadsheetId: data.spreadsheetId || get().spreadsheetId,
                stages: data.stages || get().stages,
                floors: data.floors || get().floors,
                divisions: data.divisions || get().divisions,
                departments: data.departments || get().departments,
                floorAreasByStage: data.floorAreasByStage || get().floorAreasByStage,
                comparison: data.comparison || get().comparison,
                roomNotes: data.roomNotes || get().roomNotes,
                departmentNotes: data.departmentNotes || get().departmentNotes,
                summaryNotes: data.summaryNotes || get().summaryNotes,
                floorWardOverrides: data.floorWardOverrides || get().floorWardOverrides,
              });
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch global settings via API. Attempting direct Supabase fallback.", e);
        }

        // Direct Supabase Fallback (e.g. for Vercel Serverless/Static Environments)
        if (supabase) {
          console.log("Using browser-side Supabase client to fetch global settings...");
          try {
            // Fetch core config
            const { data: configData, error: configErr } = await supabase
              .from("app_config")
              .select("*");
            
            if (configErr) throw configErr;

            const config: any = {};
            configData?.forEach((item: any) => {
              let val = item.value;
              if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                try {
                  val = JSON.parse(val);
                } catch (e) {
                  // Keep as string if not valid JSON
                }
              }
              config[item.key] = val;
            });

            // Fetch dept notes
            const { data: deptNotesData } = await supabase
              .from("dept_notes")
              .select("*");
            
            const deptNotes: Record<string, string> = {};
            deptNotesData?.forEach((item: any) => {
              const key = item.dept_no || item.dept_id || item.id;
              if (key) deptNotes[key] = item.content;
            });

            // Fetch room notes
            const { data: roomNotesData } = await supabase
              .from("room_notes")
              .select("*");
            
            const roomNotes: Record<string, string> = {};
            roomNotesData?.forEach((item: any) => {
              const key = item.room_no || item.room_id || item.id;
              if (key) roomNotes[key] = item.content;
            });

            set({
              spreadsheetId: config.spreadsheetId || get().spreadsheetId,
              stages: config.stages || get().stages,
              floors: config.floors || get().floors,
              divisions: config.divisions || get().divisions,
              departments: config.departments || get().departments,
              floorAreasByStage: config.floorAreasByStage || get().floorAreasByStage,
              comparison: config.comparison || get().comparison,
              summaryNotes: config.summaryNotes || get().summaryNotes,
              floorWardOverrides: config.floorWardOverrides || get().floorWardOverrides,
              roomNotes: roomNotes,
              departmentNotes: deptNotes,
            });
            console.log("Global settings successfully loaded directly from Supabase.");
          } catch (supErr) {
            console.error("Direct Supabase fetch fallback failed:", supErr);
          }
        }
      },
      saveGlobalSettings: async () => {
        const state = get();
        const dataToSave = {
          spreadsheetId: state.spreadsheetId,
          stages: state.stages,
          floors: state.floors,
          divisions: state.divisions,
          departments: state.departments,
          floorAreasByStage: state.floorAreasByStage,
          comparison: state.comparison,
          summaryNotes: state.summaryNotes,
          floorWardOverrides: state.floorWardOverrides,
          roomNotes: state.roomNotes,
          departmentNotes: state.departmentNotes,
        };
        
        let apiSuccess = false;
        try {
          const res = await fetch("/api/global-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSave),
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const data = await res.json();
            if (data && data.success) {
              apiSuccess = true;
            }
          }
        } catch (e) {
          console.warn("Failed to save global settings via API. Attempting direct Supabase fallback.", e);
        }

        // Direct Supabase Fallback for Saving
        if (!apiSuccess && supabase) {
          console.log("Using browser-side Supabase client to save global settings...");
          try {
            const { departmentNotes, roomNotes, ...coreConfig } = dataToSave;
            
            const configEntries = Object.entries(coreConfig).map(([key, value]) => ({
              key,
              value
            }));

            if (configEntries.length > 0) {
              const { error: configErr } = await supabase.from("app_config").upsert(configEntries);
              if (configErr) throw configErr;
            }

            if (departmentNotes) {
              const deptEntries = Object.entries(departmentNotes).map(([dept_no, content]) => ({
                dept_no,
                content: content as string
              }));
              if (deptEntries.length > 0) {
                const { error: deptErr } = await supabase.from("dept_notes").upsert(deptEntries);
                if (deptErr) throw deptErr;
              }
            }

            if (roomNotes) {
              const roomEntries = Object.entries(roomNotes).map(([room_no, content]) => ({
                room_no,
                content: content as string
              }));
              if (roomEntries.length > 0) {
                const { error: roomErr } = await supabase.from("room_notes").upsert(roomEntries);
                if (roomErr) throw roomErr;
              }
            }
            console.log("Global settings successfully saved directly to Supabase.");
          } catch (supErr) {
            console.error("Direct Supabase save fallback failed:", supErr);
          }
        }
      },
      setVisibleStageIds: (ids) => set({ visibleStageIds: ids }),
      setSpreadsheetId: (id) => {
        set({ spreadsheetId: id });
        get().saveGlobalSettings().catch(console.error);
      },
      verifyAndSetSpreadsheetId: async (id) => {
        const state = get();
        const stagesToUse = state.stages.length > 0 ? state.stages : [
          { id: "s1", name: "공모지침", code: "G", order: 0 },
          { id: "s2", name: "계획설계", code: "S", order: 1 },
          { id: "s3", name: "중간설계", code: "D", order: 2 },
          { id: "s4", name: "인허가", code: "P", order: 3 },
          { id: "s5", name: "실시설계90", code: "C", order: 4 },
        ];
        
        // 1. Dry Run Validation
        const sheetData = await fetchAllStagesFromSheets(id, stagesToUse);
        const totalRowsLoaded = Object.values(sheetData).reduce((acc, rows) => acc + (rows?.length || 0), 0);
        
        if (totalRowsLoaded === 0) {
          throw new Error("스프레드시트 탭 명칭이 현재 설정된 설계 단계명('공모지침', '계획설계' 등)과 하나도 일치하지 않거나, 실 데이터 행이 전혀 없습니다.");
        }
        
        // 2. Success - apply spreadsheetId and fetch and populate
        set({ spreadsheetId: id });
        await get().fetchData(true);
      },
      setComparisonStages: (baseId, targetId) => {
        set({ comparison: { baseId, targetId } });
        get().saveGlobalSettings().catch(console.error);
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveFloorId: (id) => set({ activeFloorId: id }),
      setIsPdfExportMode: (val) => set({ isPdfExportMode: val }),
      setPdfExportOptions: (val) => set({ pdfExportOptions: val }),
      toggleDivisionFilter: (id) =>
        set((state) => {
          const ids = state.filters.divisionIds;
          const isRemoving = ids.includes(id);
          const newDivisionIds = isRemoving
            ? ids.filter((i) => i !== id)
            : [...ids, id];

          // When removing a division, also remove its departments
          let newDeptIds = state.filters.departmentIds;
          if (isRemoving) {
            const deptsInDiv = state.departments
              .filter((d) => d.divisionId === id)
              .map((d) => d.id);
            newDeptIds = newDeptIds.filter((did) => !deptsInDiv.includes(did));
          }

          return {
            filters: {
              ...state.filters,
              divisionIds: newDivisionIds,
              departmentIds: newDeptIds,
            },
          };
        }),
      toggleDepartmentFilter: (id) =>
        set((state) => {
          const ids = state.filters.departmentIds;
          return {
            filters: {
              ...state.filters,
              departmentIds: ids.includes(id)
                ? ids.filter((i) => i !== id)
                : [...ids, id],
            },
          };
        }),
      fetchData: async (force = false) => {
        set({ isLoading: true });
        const state = get();
        
        // Define default stages in case none exist in state yet
        const defaultStages = [
          { id: "s1", name: "공모지침", code: "G", order: 0 },
          { id: "s2", name: "계획설계", code: "S", order: 1 },
          { id: "s3", name: "중간설계", code: "D", order: 2 },
          { id: "s4", name: "인허가", code: "P", order: 3 },
          { id: "s5", name: "실시설계90", code: "C", order: 4 },
        ];

        // Use existing stages if available, else use defaults
        const stagesToUse = state.stages.length > 0 ? state.stages : defaultStages;

        try {
          const rawDataByStage: Record<string, any[]> = {};

          if (state.spreadsheetId) {
            const sheetData = await fetchAllStagesFromSheets(state.spreadsheetId, stagesToUse);
            Object.assign(rawDataByStage, sheetData);
            
            // Check if we got any data at all from Sheets to avoid blanking current screens
            const totalRowsLoaded = Object.values(rawDataByStage).reduce((acc, rows) => acc + (rows?.length || 0), 0);
            if (totalRowsLoaded === 0) {
              throw new Error("구글 시트로부터 실(Room) 데이터를 불러올 수 없습니다. 스프레드시트의 탭(Tab) 명칭이 설계 단계명('공모지침', '계획설계' 등)과 맞는지, 혹은 시트에 데이터가 올바른 형식으로 기재되어 있는지 확인해주세요.");
            }
          } else {
            console.warn("No Spreadsheet ID configured.");
            set({ isLoading: false });
            return;
          }

          const roomMap: Record<
            string,
            { no: string; name: string; level: string; maxStageIdx: number; note?: string }
          > = {};
          const valuesMap: Record<
            string,
            Record<string, { totalArea: number; qty: number }>
          > = {};

          const floorSet = new Set<string>();
          const deptSet = new Set<string>();

          stagesToUse.forEach((st, idx) => {
            const data = rawDataByStage[st.id] || [];
            data.forEach((row) => {
              // Extract values supporting common column names
              let room_no = row.room_no || row.roomNo || row.no || row.room_id || row.ROOM_NO;
              let level = row.level || row.floor || row.lv || row.floor_id || row.LEVEL;
              let name = row.name || row.room_name || row.NAME || row.ROOM_NAME;
              let area = row.area || row.net_area || row.total_area || row.AREA;
              let noteVal = row.note || row.notes || row.memo || row.비고 || row.MEMO || row.NOTE || row.NOTES || "";

              if (!room_no) return;
              room_no = room_no.toString().trim();

              const deptMatch = room_no.match(/^([A-Za-z0-9]+)/);
              if (deptMatch) {
                deptSet.add(deptMatch[1].toUpperCase());
              }

              const numArea = typeof area === "string" ? parseFloat(area) : area;
              const validArea = !isNaN(numArea);

              // Standardize room number: just trim and uppercase for stable matching
              let sanitizedNo = room_no.toString().trim().toUpperCase();
              
              // Standardize level using standard helper
              let levelStr = standardizeFloorId(level);
              
              if (levelStr) floorSet.add(levelStr);
              
              const roomKey = `${sanitizedNo}|${levelStr}`;

              if (!roomMap[roomKey]) {
                roomMap[roomKey] = {
                  no: room_no,
                  name: name || "",
                  level: levelStr,
                  maxStageIdx: idx,
                  note: noteVal ? noteVal.toString().trim() : "",
                };
              } else {
                if (idx >= roomMap[roomKey].maxStageIdx) {
                  if (idx > roomMap[roomKey].maxStageIdx) {
                    if (name) roomMap[roomKey].name = name;
                    if (levelStr) roomMap[roomKey].level = levelStr;
                    if (noteVal) roomMap[roomKey].note = noteVal.toString().trim();
                    roomMap[roomKey].maxStageIdx = idx;
                  } else if (idx === roomMap[roomKey].maxStageIdx) {
                    if (name && !roomMap[roomKey].name) {
                      roomMap[roomKey].name = name;
                    }
                    if (noteVal && !roomMap[roomKey].note) {
                      roomMap[roomKey].note = noteVal.toString().trim();
                    }
                  }
                } else {
                  if (noteVal && !roomMap[roomKey].note) {
                    roomMap[roomKey].note = noteVal.toString().trim();
                  }
                }
              }

              if (validArea) {
                if (!valuesMap[roomKey]) valuesMap[roomKey] = {};
                if (!valuesMap[roomKey][st.id])
                  valuesMap[roomKey][st.id] = { totalArea: 0, qty: 0 };

                valuesMap[roomKey][st.id].totalArea += numArea;
                valuesMap[roomKey][st.id].qty += 1;
              }
            });
          });

          const floors: Floor[] = Array.from(floorSet)
            .sort((a, b) => getFloorVal(b) - getFloorVal(a))
            .map((f, i) => ({ id: f, name: f, order: i }));

          const divisionsMap = new Map<string, Division>();
          const departments: Department[] = Array.from(deptSet)
            .sort()
            .map((d, i) => {
              const existingDept = state.departments.find(
                (dept) => dept.id.toUpperCase() === d.toUpperCase(),
              );
              const divCode = existingDept?.divisionId || d.charAt(0);
              const existingDiv = state.divisions.find(
                (div) => div.id === divCode,
              );
              if (!divisionsMap.has(divCode)) {
                divisionsMap.set(divCode, {
                  id: divCode,
                  name: existingDiv?.name || `부문 ${divCode}`,
                  order: divisionsMap.size,
                  color: existingDiv?.color,
                });
              }
              
              const findDeptNote = (deptCode: string) => {
                const foundKey = Object.keys(state.departmentNotes).find(
                  k => k.toUpperCase() === deptCode.toUpperCase()
                );
                return foundKey ? state.departmentNotes[foundKey] : "";
              };
              const note = findDeptNote(d) || existingDept?.note || "";

              return {
                id: d,
                divisionId: divCode,
                code: d,
                name: existingDept?.name || `부서 ${d}`,
                order: i,
                note,
              };
            });

          const divisions = Array.from(divisionsMap.values());

          const newRoomNotes = { ...state.roomNotes };

          const generatedRooms: Room[] = [];
          const generatedValues: RoomValue[] = [];

          Object.entries(roomMap).forEach(([roomKey, r]) => {
            const roomId = `room-${roomKey}`;
            const deptMatch = r.no.match(/^([A-Za-z0-9]+)/);
            const deptCode = deptMatch ? deptMatch[1].toUpperCase() : "";
            const floorId = r.level;

            const existingRoom = state.rooms.find(er => 
              er.id === roomId || 
              (er.no.trim().toUpperCase() === r.no.trim().toUpperCase() && 
               standardizeFloorId(er.floorId) === standardizeFloorId(r.level))
            );

              // Use roomNotes as primary source, fallback to sheet note or existingRoom note
            // Try matching by room number first (DB preference)
            const roomNoKey = r.no.trim().toUpperCase();
            const compositeKey = `${roomNoKey}|${standardizeFloorId(r.level)}`;
            const note = newRoomNotes[roomNoKey] || findRoomNote(newRoomNotes, r.no, r.level) || r.note || existingRoom?.note || "";

            generatedRooms.push({
              id: roomId,
              no: r.no,
              name: r.name,
              floorId: floorId,
              departmentId: deptCode,
              note,
            });
            
            // Auto-populate roomNotes if it was found in existingRoom or sheet for future stability
            if (note && !newRoomNotes[roomNoKey]) {
              newRoomNotes[roomNoKey] = note;
            }

            // Create values
            stagesToUse.forEach((s) => {
              const v = valuesMap[roomKey]?.[s.id];
              if (v && v.qty > 0) {
                generatedValues.push({
                  roomId,
                  stageId: s.id,
                  unitArea: v.totalArea / v.qty,
                  quantity: v.qty,
                });
              }
            });
          });

          // Compute floor Areas if needed, preserve existing data (especially _TOTAL_)
          const floorAreasByStage: Record<string, Record<string, number>> = {};
          stagesToUse.forEach((s) => {
            const existingForStage = state.floorAreasByStage[s.id] || {};
            floorAreasByStage[s.id] = { ...existingForStage };
            
            floors.forEach((f) => {
              if (floorAreasByStage[s.id][f.id] === undefined) {
                floorAreasByStage[s.id][f.id] = 0;
              }
            });
          });

          set({
            project: { id: "p1", name: "경상남도 서부의료원" },
            stages: stagesToUse,
            floors,
            divisions,
            departments,
            rooms: generatedRooms,
            values: generatedValues,
            floorAreasByStage: floorAreasByStage,
            roomNotes: newRoomNotes,
            visibleStageIds: stagesToUse.map((s) => s.id),
            comparison: {
              baseId: stagesToUse.find(s => s.name === '중간설계')?.id || stagesToUse[0]?.id || null,
              targetId: stagesToUse[stagesToUse.length - 1]?.id || null,
            },
            activeFloorId: "all",
          });

          // Persist the sheet-derived schema to Supabase for stability across refreshes
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 100);
        } catch (e: any) {
          if (e?.message?.includes("구글 스프레드시트")) {
            set({ spreadsheetId: null, isLoading: false });
            // Soft reset to allow app to function without the invalid spreadsheet
            return;
          }
          console.error("Data fetch error:", e);
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },
      fetchTableList: async () => {}, // No-op, removed
      updateValue: (roomId, stageId, field, val) =>
        set((state) => {
          const newValues = [...state.values];
          const idx = newValues.findIndex(
            (v) => v.roomId === roomId && v.stageId === stageId,
          );
          if (idx >= 0) {
            newValues[idx] = { ...newValues[idx], [field]: val };
          } else {
            newValues.push({
              roomId,
              stageId,
              unitArea: field === "unitArea" ? val : 0,
              quantity: field === "quantity" ? val : 0,
            });
          }
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { values: newValues };
        }),
      updateFloorArea: (stageId, floorId, area) =>
        set((state) => {
          const newFloorAreasByStage = {
            ...state.floorAreasByStage,
            [stageId]: {
              ...(state.floorAreasByStage[stageId] || {}),
              [floorId]: area,
            },
          };
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { floorAreasByStage: newFloorAreasByStage };
        }),
      batchUpdateFloors: (floorData, stageId) =>
        set((state) => {
          const getVal = (name: string) => {
            const match = name.match(/([A-Z]+)?(\d+)?([A-Z]+)?/);
            if (!match) return 0;
            const prefix = match[1] || "";
            const num = parseInt(match[2] || "0");
            if (prefix === "B") return -num;
            return num;
          };

          const sortedData = [...floorData].sort(
            (a, b) => getVal(a.name) - getVal(b.name),
          );

          const newFloors: Floor[] = sortedData.map((f, i) => ({
            id: f.id,
            name: f.name,
            order: i,
          }));

          const newFloorAreasForStage: Record<string, number> = {};
          sortedData.forEach((f) => {
            newFloorAreasForStage[f.id] = f.area;
          });

          // If stageId provided, only update that stage. Otherwise initialize all stages with same data?
          const targetStageId = stageId || state.stages[0]?.id;
          const newFloorAreasByStage = { ...state.floorAreasByStage };

          if (targetStageId) {
            newFloorAreasByStage[targetStageId] = newFloorAreasForStage;
          }

          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);

          return {
            floors: newFloors,
            floorAreasByStage: newFloorAreasByStage,
            activeFloorId: "all",
          };
        }),
      updateDivisionColor: (divId, color) =>
        set((state) => {
          const newDivs = state.divisions.map((d) =>
            d.id === divId ? { ...d, color } : d,
          );
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { divisions: newDivs };
        }),
      updateDepartment: (id, field, val) =>
        set((state) => {
          const newDepartmentNotes = { ...state.departmentNotes };
          if (field === "note") {
            newDepartmentNotes[id] = val;
          }
          const newDepts = state.departments.map((d) =>
            d.id === id ? { ...d, [field]: val } : d,
          );
          
          // Explicitly sync to DB
          get().saveGlobalSettings().catch(console.error);
          
          return { departments: newDepts, departmentNotes: newDepartmentNotes };
        }),
      updateRoomNote: (roomId, note) =>
        set((state) => {
          const newRoomNotes = { ...state.roomNotes };
          
          if (Array.isArray(roomId)) {
            roomId.forEach(rid => {
               const room = state.rooms.find(r => r.id === rid);
               if (room) {
                 // Using room number as the key for DB consistency as requested
                 const key = room.no.trim().toUpperCase();
                 newRoomNotes[key] = note;
               }
            });
          } else {
             const room = state.rooms.find(r => r.id === roomId);
             if (room) {
               const key = room.no.trim().toUpperCase();
               newRoomNotes[key] = note;
             }
          }

          // Explicitly sync to DB
          get().saveGlobalSettings().catch(console.error);

          return {
            roomNotes: newRoomNotes,
            rooms: state.rooms.map((r) =>
              (Array.isArray(roomId) ? roomId.includes(r.id) : r.id === roomId)
                ? { ...r, note }
                : r,
            ),
          };
        }),
      updateSummaryNote: (summaryId, note) =>
        set((state) => {
          const newSummaryNotes = { ...state.summaryNotes, [summaryId]: note };
          
          // Explicitly sync to DB
          get().saveGlobalSettings().catch(console.error);
          
          return {
            summaryNotes: newSummaryNotes,
          };
        }),
      batchUpdateMapping: (mappings) =>
        set((state) => {
          // Collect existing to merge
          const divisionsMap = new Map(state.divisions.map((d) => [d.id, d]));
          const departmentsMap = new Map(
            state.departments.map((d) => [d.id, d]),
          );

          mappings.forEach((m) => {
            // Update or Add Division
            const existingDiv = divisionsMap.get(m.divId);
            divisionsMap.set(m.divId, {
              id: m.divId,
              name: m.divName,
              order: existingDiv ? existingDiv.order : divisionsMap.size,
              color: existingDiv?.color,
            });

            // Update or Add Department
            const existingDept = departmentsMap.get(m.deptId);
            departmentsMap.set(m.deptId, {
              id: m.deptId,
              divisionId: m.divId,
              name: m.deptName,
              code: m.deptId,
              order: existingDept ? existingDept.order : departmentsMap.size,
            });
          });

          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);

          return {
            divisions: Array.from(divisionsMap.values()).sort(
              (a, b) => a.order - b.order,
            ),
            departments: Array.from(departmentsMap.values()).sort(
              (a, b) => a.order - b.order,
            ),
          };
        }),
      fetchSnapshots: async () => {
        if (!supabase) {
          console.warn(
            "Supabase is not configured. Snapshots will not be saved to cloud.",
          );
          return;
        }
        try {
          const { data, error } = await supabase
            .from("settings")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            set({
              snapshots: data
                .filter((d) => d.name && !d.name.startsWith("_DELETED_"))
                .map((d, index) => ({
                  id: d.id || `fallback-${index}-${d.name}`,
                  name: d.name,
                  createdAt: d.created_at,
                  data: d.settings,
                })),
            });
          }
        } catch (e) {
          console.error(e);
        }
      },
      saveSnapshot: async (name, id) => {
        if (!supabase)
          throw new Error("Supabase is not configured. Check your .env file.");
        const state = get();
        const dataToSave = {
          stages: state.stages,
          floors: state.floors,
          divisions: state.divisions,
          departments: state.departments,
          floorAreasByStage: state.floorAreasByStage,
          summaryNotes: state.summaryNotes,
          roomNotes: state.roomNotes,
          departmentNotes: state.departmentNotes,
          visibleStageIds: state.visibleStageIds,
          comparison: state.comparison,
        };

        let error = null;
        const now = new Date().toISOString();

        if (id && !id.toString().startsWith("fallback-")) {
          const res = await supabase
            .from("settings")
            .update({
              name,
              settings: dataToSave,
              created_at: now,
            })
            .eq("id", id);
          error = res.error;
        } else {
          // Check if there is an existing one with same name to avoid duplicates if possible
          // But usually we prefer insert for new snapshots
          const res = await supabase.from("settings").insert({
            id: `snap-${Date.now()}`,
            name,
            settings: dataToSave,
            created_at: now,
          });
          error = res.error;
        }

        if (error) {
          console.error("Error saving snapshot:", error);
          throw error;
        }

        await get().fetchSnapshots();
      },
      loadSnapshot: (id) =>
        set((state) => {
          const snapshot = state.snapshots.find((s) => s.id === id);
          if (!snapshot) throw new Error("Snapshot not found");

          return {
            stages: snapshot.data.stages || state.stages,
            floors: snapshot.data.floors || state.floors,
            divisions: snapshot.data.divisions || state.divisions,
            departments: snapshot.data.departments || state.departments,
            floorAreasByStage:
              (snapshot.data as any).floorAreasByStage ||
              ((snapshot.data as any).floorAreas
                ? {
                    [state.stages[0]?.id || "s1"]: (snapshot.data as any)
                      .floorAreas,
                  }
                : state.floorAreasByStage),
            summaryNotes: (snapshot.data as any).summaryNotes || state.summaryNotes,
            roomNotes: (snapshot.data as any).roomNotes || state.roomNotes,
            departmentNotes: (snapshot.data as any).departmentNotes || state.departmentNotes,
            visibleStageIds:
              (snapshot.data as any).visibleStageIds ||
              (snapshot.data.stages
                ? snapshot.data.stages.map((s: any) => s.id)
                : state.visibleStageIds),
            comparison: (snapshot.data as any).comparison || state.comparison,
            activeFloorId: "all", // Reset view to home/all
            filters: { divisionIds: [], departmentIds: [] }, // Clear filters
          };
        }),
      deleteSnapshot: async (id) => {
        if (!supabase)
          throw new Error("Supabase is not configured. Check your .env file.");

        const snap = get().snapshots.find((s) => s.id === id);
        if (!snap) return;

        // Remove locally directly to ensure UI responsiveness
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        }));

        try {
          if (id && !id.toString().startsWith("fallback-")) {
            const { error } = await supabase
              .from("settings")
              .update({
                name: `_DELETED_${snap.name}_${Date.now()}`,
                settings: {},
              })
              .eq("id", id);

            if (error) {
              console.error("Soft-delete failed:", error);
              throw error;
            }
          } else {
            const { error } = await supabase
              .from("settings")
              .update({
                name: `_DELETED_${snap.name}_${Date.now()}`,
                settings: {},
              })
              .eq("name", snap.name)
              .eq("created_at", snap.createdAt);

            if (error) {
              console.error("Soft-delete failed:", error);
              throw error;
            }
          }

          await get().fetchSnapshots();
        } catch (err) {
          // Ensure snapshots are re-fetched if anything goes wrong to restore UI state
          await get().fetchSnapshots();
          throw err;
        }
      },
      deleteFloor: (id) =>
        set((state) => {
          const newFloors = state.floors.filter((f) => f.id !== id);
          const newFloorAreasByStage = { ...state.floorAreasByStage };
          Object.keys(newFloorAreasByStage).forEach((sId) => {
            const stageAreas = { ...newFloorAreasByStage[sId] };
            delete stageAreas[id];
            newFloorAreasByStage[sId] = stageAreas;
          });
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { floors: newFloors, floorAreasByStage: newFloorAreasByStage };
        }),
      deleteDivision: (id) =>
        set((state) => {
          const newDivisions = state.divisions.filter((d) => d.id !== id);
          const newDepartments = state.departments.filter(
            (d) => d.divisionId !== id,
          );
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { divisions: newDivisions, departments: newDepartments };
        }),
      deleteDepartment: (id) =>
        set((state) => {
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { departments: state.departments.filter((d) => d.id !== id) };
        }),
      addStage: (name, code) =>
        set((state) => {
          const id = `s-${Date.now()}`;
          const newStages = [
            ...state.stages,
            { id, name, code, order: state.stages.length },
          ].sort((a, b) => {
            const codeA = a.code || a.name;
            const codeB = b.code || b.name;
            return codeA.localeCompare(codeB);
          });
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return {
            stages: newStages,
            visibleStageIds: [...state.visibleStageIds, id],
          };
        }),
      updateStage: (id, name, code) => {
        set((state) => {
          const newStages = state.stages
            .map((s) =>
              s.id === id
                ? { ...s, name, code }
                : s,
            )
            .sort((a, b) => {
              const codeA = a.code || a.name;
              const codeB = b.code || b.name;
              return codeA.localeCompare(codeB);
            });
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { stages: newStages };
        });
        // Trigger re-fetch after stage update
        get().fetchData(true).catch(console.error);
      },
      toggleStageTotalAreaOnly: (id, isTotalAreaOnly) =>
        set((state) => {
          const newStages = state.stages.map((s) =>
            s.id === id ? { ...s, isTotalAreaOnly } : s,
          );
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { stages: newStages };
        }),
      toggleMedicalOnly: (medicalOnly) => {
        set((state) => {
          let newFilters = state.filters;
          if (medicalOnly) {
            const medicalDivIds = state.divisions.filter(d => /^\d+$/.test(d.id)).map(d => d.id);
            const medicalDeptIds = state.departments.filter(d => medicalDivIds.includes(d.divisionId)).map(d => d.id);
            
            newFilters = {
              divisionIds: state.filters.divisionIds.filter(id => medicalDivIds.includes(id)),
              departmentIds: state.filters.departmentIds.filter(id => medicalDeptIds.includes(id))
            };
          }
          return { medicalOnly, filters: newFilters };
        });
        get().saveGlobalSettings().catch(console.error);
      },
      setFloorWardOverride: (floorId, deptId, count) =>
        set((state) => {
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return {
            floorWardOverrides: {
              ...state.floorWardOverrides,
              [`${floorId}|${deptId}`]: count,
            },
          };
        }),
      deleteStage: (id) =>
        set((state) => {
          const newStages = state.stages.filter((s) => s.id !== id);
          setTimeout(() => get().saveGlobalSettings().catch(console.error), 0);
          return { stages: newStages };
        }),
    }),
    {
      name: "hospital-area-settings-v8",
      partialize: (state) => ({
        project: state.project,
        stages: state.stages,
        rooms: state.rooms,
        divisions: state.divisions,
        departments: state.departments,
        floors: state.floors,
        comparison: state.comparison,
        visibleStageIds: state.visibleStageIds,
        values: state.values,
        summaryNotes: state.summaryNotes,
        roomNotes: state.roomNotes,
        departmentNotes: state.departmentNotes,
        spreadsheetId: state.spreadsheetId,
        activeTab: state.activeTab,
        activeFloorId: state.activeFloorId,
        filters: state.filters,
        medicalOnly: state.medicalOnly,
        floorAreasByStage: state.floorAreasByStage,
        floorWardOverrides: state.floorWardOverrides,
      }),
    },
  ),
);
