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
  tableName?: string;
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
  visibleStageIds: string[];
  comparison: {
    baseId: string | null;
    targetId: string | null;
  };
  activeTab: "dashboard" | "summary" | "detail";
  activeFloorId: string | "all" | null;
  filters: {
    divisionIds: string[];
    departmentIds: string[];
  };
  snapshots: Snapshot[];
  availableTables: string[];
  medicalOnly: boolean;
  isLoading: boolean;
  spreadsheetId: string | null;
  floorWardOverrides: Record<string, number>; // floorId|deptId -> count
  setVisibleStageIds: (ids: string[]) => void;
  setSpreadsheetId: (id: string | null) => void;
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
    tableName?: string,
  ) => void;
  toggleStageTotalAreaOnly: (id: string, isTotalAreaOnly: boolean) => void;
  toggleMedicalOnly: (val: boolean) => void;
  setFloorWardOverride: (floorId: string, deptId: string, count: number) => void;
  deleteStage: (id: string) => void;
  setActiveTab: (tab: "dashboard" | "summary" | "detail") => void;
  setActiveFloorId: (id: string | null) => void;
  toggleDivisionFilter: (id: string) => void;
  toggleDepartmentFilter: (id: string) => void;
  fetchData: (force?: boolean) => Promise<void>;
  fetchTableList: () => Promise<void>;
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
      visibleStageIds: [],
      comparison: { baseId: null, targetId: null },
      activeTab: "detail",
      activeFloorId: "all",
      filters: { divisionIds: [], departmentIds: [] },
      snapshots: [],
      availableTables: [],
      medicalOnly: true,
      isLoading: false,
      spreadsheetId: null,
      floorWardOverrides: {},
      setVisibleStageIds: (ids) => set({ visibleStageIds: ids }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),
      setComparisonStages: (baseId, targetId) =>
        set({ comparison: { baseId, targetId } }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveFloorId: (id) => set({ activeFloorId: id }),
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
        const state = get();
        if (!force && state.stages.length > 0 && state.rooms.length > 2) {
          return;
        }

        set({ isLoading: true });

        // Await table list fetch to know what's available
        await get().fetchTableList();
        const available = get().availableTables;

        // Default stages definition matching Sheet tab names
        const defaultStages: Stage[] = [
          {
            id: "s1",
            name: "공모지침",
            code: "G",
            tableName: "area_guideline",
            order: 0,
          },
          {
            id: "s2",
            name: "계획설계",
            code: "S",
            tableName: "area_sd",
            order: 1,
          },
          {
            id: "s3",
            name: "중간설계",
            code: "D",
            tableName: "area_dd",
            order: 2,
          },
          {
            id: "s4",
            name: "인허가",
            code: "P",
            tableName: "area_permit",
            order: 3,
          },
          {
            id: "s5",
            name: "실시설계90",
            code: "C",
            tableName: "area_cd90",
            order: 4,
          },
        ];

        // Use existing stages if available, else use defaults
        const stagesToUse = state.stages.length > 0 ? state.stages : defaultStages;

        try {
          const rawDataByStage: Record<string, any[]> = {};

          if (state.spreadsheetId) {
            const token = getAccessToken();
            if (token) {
              const sheetData = await fetchAllStagesFromSheets(state.spreadsheetId, stagesToUse);
              Object.assign(rawDataByStage, sheetData);
            } else {
              // We have a spreadsheetId but no token yet. 
              // Don't fall back to Supabase to avoid confusing errors.
              set({ isLoading: false });
              return;
            }
          } else if (supabase) {
            // Fetch data concurrently from all tables using exact stage mappings
            const availableTables = available || [];
            
            await Promise.all(
              stagesToUse.map(async (st) => {
                if (!st.tableName) return;
                
                // Only try to fetch if table exists in available list
                if (availableTables.length > 0 && !availableTables.includes(st.tableName.trim())) {
                  // Fallback for permit stage even if main table missing
                  const isPermitStage = st.id === "s4" || st.name.includes("인허가") || st.code === "P";
                  if (!isPermitStage) return;
                }

                // Try the designated table name
                let activeTable = st.tableName.trim();
                
                const tryFetch = async (tableName: string) => {
                  const target = tableName.trim();
                  if (!supabase) return { data: null, error: new Error("No supabase client") };
                  try {
                    const { data, error } = await supabase
                      .from(target)
                      .select("*");
                    return { data, error };
                  } catch (err: any) {
                    return { data: null, error: err };
                  }
                };

                let { data, error } = await tryFetch(activeTable);
                
                // Fallback for 인허가 stage if it fails or returns no data
                const isPermitStage = st.id === "s4" || st.name.includes("인허가") || st.code === "P";
                
                if (isPermitStage && (error || !data || data.length === 0)) {
                  const permitTables = ["area_permit", "permit_design", "permit_area", "area_pm", "area_master", "area_guideline"];
                  
                  for (const table of permitTables) {
                    if (table === activeTable) continue; // Already tried
                    const fallback = await tryFetch(table);
                    if (!fallback.error && fallback.data && fallback.data.length > 0) {
                      data = fallback.data;
                      error = null;
                      // Auto-update the stage's tableName in the store so it's persistent
                      set((state) => ({
                        stages: state.stages.map(s => s.id === st.id ? { ...s, tableName: table } : s)
                      }));
                      break;
                    }
                  }
                }

                if (error) {
                  // Only log if we really couldn't find any data after fallbacks
                  if (!data || data.length === 0) {
                    console.error(`Error fetching ${activeTable} for stage ${st.name}:`, error.message || error);
                  }
                } else if (data) {
                  rawDataByStage[st.id] = data || [];
                }
              }),
            );
          } else {
            set({ isLoading: false });
            return; // No data source available
          }

          const roomMap: Record<
            string,
            { no: string; name: string; level: string; maxStageIdx: number }
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

              if (!room_no) return;
              room_no = room_no.toString().trim();

              const deptMatch = room_no.match(/^([A-Za-z0-9]+)/);
              if (deptMatch) {
                deptSet.add(deptMatch[1].toUpperCase());
              }

              const numArea = typeof area === "string" ? parseFloat(area) : area;
              const validArea = !isNaN(numArea);

              // Standardize room number: remove ALL non-alphanumeric and common prefixes
              let normalizedNo = room_no.toString().trim();
              
              // Handle ranges like "101-103" - if the base room is "101", we should match it?
              // Or just keep the full string but normalize separators
              let sanitizedNo = normalizedNo
                .replace(/[^A-Z0-9]/gi, '')
                .toUpperCase();
              
              // Strip leading common prefixes
              sanitizedNo = sanitizedNo.replace(/^(RM|ROOM|NO|N|R)/i, '');
              
              // If empty after stripping, use original (some rooms might be named just "R" or "N")
              if (!sanitizedNo) sanitizedNo = normalizedNo.toUpperCase();

              // Standardize level: extract number and prefix (B), normalize to #F or B#F
              let levelStr = level ? level.toString().trim().toUpperCase() : "";
              // Handle "B1", "1F", "FLOOR 3", "LEVEL 4", etc.
              const levelMatch = levelStr.match(/(B)?\s*(\d+)/);
              if (levelMatch) {
                const prefix = levelMatch[1] || "";
                const num = parseInt(levelMatch[2]);
                levelStr = `${prefix}${num}F`;
              }
              
              if (levelStr) floorSet.add(levelStr);
              
              const roomKey = `${sanitizedNo}|${levelStr}`;

              if (!roomMap[roomKey]) {
                roomMap[roomKey] = {
                  no: room_no,
                  name: name || "",
                  level: levelStr,
                  maxStageIdx: idx,
                };
              } else {
                if (idx >= roomMap[roomKey].maxStageIdx) {
                  if (idx > roomMap[roomKey].maxStageIdx) {
                    if (name) roomMap[roomKey].name = name;
                    if (levelStr) roomMap[roomKey].level = levelStr;
                    roomMap[roomKey].maxStageIdx = idx;
                  } else if (
                    idx === roomMap[roomKey].maxStageIdx &&
                    name &&
                    !roomMap[roomKey].name
                  ) {
                    roomMap[roomKey].name = name;
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
              const divCode = d.charAt(0);
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
              const existingDept = state.departments.find(
                (dept) => dept.id === d,
              );
              return {
                id: d,
                divisionId: divCode,
                code: d,
                name: existingDept?.name || `부서 ${d}`,
                order: i,
              };
            });

          const divisions = Array.from(divisionsMap.values());

          const generatedRooms: Room[] = [];
          const generatedValues: RoomValue[] = [];

          Object.entries(roomMap).forEach(([roomKey, r]) => {
            const roomId = `room-${roomKey}`;
            const deptMatch = r.no.match(/^([A-Za-z0-9]+)/);
            const deptCode = deptMatch ? deptMatch[1].toUpperCase() : "";
            const floorId = r.level;

            generatedRooms.push({
              id: roomId,
              no: r.no,
              name: r.name,
              floorId: floorId,
              departmentId: deptCode,
              note: "",
            });

            // Create values
            stagesToUse.forEach((s) => {
              const v = valuesMap[roomKey]?.[s.id];
              if (v && v.qty > 0) {
                generatedValues.push({
                  roomId,
                  stageId: s.id,
                  unitArea: Number((v.totalArea / v.qty).toFixed(2)),
                  quantity: v.qty,
                });
              }
            });
          });

          // Compute floor Areas if needed, but initially 0
          const floorAreasByStage: Record<string, Record<string, number>> = {};
          stagesToUse.forEach((s) => {
            floorAreasByStage[s.id] = {};
            floors.forEach((f) => {
              floorAreasByStage[s.id][f.id] = (state.floorAreasByStage[s.id] || {})[f.id] || 0;
            });
          });

          set({
            project: { id: "p1", name: "delta : Area tracer" },
            stages: stagesToUse,
            floors,
            divisions,
            departments,
            rooms: generatedRooms,
            values: generatedValues,
            floorAreasByStage: floorAreasByStage,
            visibleStageIds: stagesToUse.map((s) => s.id),
            comparison: {
              baseId: stagesToUse[0]?.id || null,
              targetId: stagesToUse[stagesToUse.length - 1]?.id || null,
            },
            activeFloorId: "all",
          });
        } catch (e) {
          console.error("Data fetch error:", e);
        } finally {
          set({ isLoading: false });
        }
      },
      fetchTableList: async () => {
        if (!supabase || get().spreadsheetId) return;

        const candidateTables = [
          "area_guideline",
          "area_sd",
          "area_dd",
          "area_permit",
          "area_cd90",
          "area_master",
          "permit_design",
          "permit_area",
          "area_pm",
          "area_pre",
          "area_final",
        ];

        try {
          const results = await Promise.all(
            candidateTables.map(async (table) => {
              const { error } = await supabase!
                .from(table)
                .select("count", { count: "exact", head: true });
              return error ? null : table;
            }),
          );

          const found = results.filter((t): t is string => t !== null);
          set({ availableTables: found });
        } catch (e) {
          console.error("Error fetching table list:", e);
          set({
            availableTables: [
              "area_guideline",
              "area_sd",
              "area_dd",
              "area_permit",
            ],
          });
        }
      },
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
          return { values: newValues };
        }),
      updateFloorArea: (stageId, floorId, area) =>
        set((state) => ({
          floorAreasByStage: {
            ...state.floorAreasByStage,
            [stageId]: {
              ...(state.floorAreasByStage[stageId] || {}),
              [floorId]: area,
            },
          },
        })),
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
          // Let's assume if it's a batch update from settings, we either apply to a specific stage or the "first"
          const targetStageId = stageId || state.stages[0]?.id;
          const newFloorAreasByStage = { ...state.floorAreasByStage };

          if (targetStageId) {
            newFloorAreasByStage[targetStageId] = newFloorAreasForStage;
          }

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
          return { divisions: newDivs };
        }),
      updateDepartment: (id, field, val) =>
        set((state) => {
          const newDepts = state.departments.map((d) =>
            d.id === id ? { ...d, [field]: val } : d,
          );
          return { departments: newDepts };
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
          return { floors: newFloors, floorAreasByStage: newFloorAreasByStage };
        }),
      deleteDivision: (id) =>
        set((state) => {
          const newDivisions = state.divisions.filter((d) => d.id !== id);
          const newDepartments = state.departments.filter(
            (d) => d.divisionId !== id,
          );
          return { divisions: newDivisions, departments: newDepartments };
        }),
      deleteDepartment: (id) =>
        set((state) => {
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
          return {
            stages: newStages,
            visibleStageIds: [...state.visibleStageIds, id],
          };
        }),
  updateStage: (id, name, code, tableName) => {
    set((state) => {
      const newStages = state.stages
        .map((s) =>
          s.id === id
            ? { ...s, name, code, tableName: tableName ?? s.tableName }
            : s,
        )
        .sort((a, b) => {
          const codeA = a.code || a.name;
          const codeB = b.code || b.name;
          return codeA.localeCompare(codeB);
        });
      return { stages: newStages };
    });
    // Trigger re-fetch after stage update to apply new table mappings
    get().fetchData(true).catch(console.error);
  },
      toggleStageTotalAreaOnly: (id, isTotalAreaOnly) =>
        set((state) => {
          const newStages = state.stages.map((s) =>
            s.id === id ? { ...s, isTotalAreaOnly } : s,
          );
          return { stages: newStages };
        }),
      toggleMedicalOnly: (medicalOnly) => set({ medicalOnly }),
      setFloorWardOverride: (floorId, deptId, count) =>
        set((state) => ({
          floorWardOverrides: {
            ...state.floorWardOverrides,
            [`${floorId}|${deptId}`]: count,
          },
        })),
      deleteStage: (id) =>
        set((state) => {
          const newStages = state.stages.filter((s) => s.id !== id);
          return { stages: newStages };
        }),
    }),
    {
      name: "hospital-area-settings-v8",
      partialize: (state) => ({
        stages: state.stages,
        comparison: state.comparison,
        visibleStageIds: state.visibleStageIds,
        values: state.values,
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
