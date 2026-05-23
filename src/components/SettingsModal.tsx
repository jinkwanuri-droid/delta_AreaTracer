import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore, Snapshot, hashPassword } from "@/store/useAppStore";
import {
  X,
  Upload,
  Layers,
  Network,
  ChevronRight,
  ChevronDown,
  Save,
  FolderOpen,
  Trash2,
  Clock,
  Link,
  Sheet,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { clsx } from "clsx";

interface SettingsModalProps {
  onClose: () => void;
}

const COLORS = [
  { name: "Rose", value: "#E29595" },
  { name: "Peach", value: "#E2B695" },
  { name: "Amber", value: "#E2D795" },
  { name: "Sage", value: "#B6E295" },
  { name: "Mint", value: "#95E2B6" },
  { name: "Aqua", value: "#95E2D7" },
  { name: "Sky", value: "#95B6E2" },
  { name: "Lavender", value: "#B695E2" },
  { name: "Orchid", value: "#E295D7" },
  { name: "Slate", value: "#B0B0B0" },
];

function SnapshotManager() {
  const snapshots = useAppStore(state => state.snapshots);
  const saveSnapshot = useAppStore(state => state.saveSnapshot);
  const loadSnapshot = useAppStore(state => state.loadSnapshot);
  const deleteSnapshot = useAppStore(state => state.deleteSnapshot);
  const fetchSnapshots = useAppStore(state => state.fetchSnapshots);
  const [isOpen, setIsOpen] = useState(false);
  const [newSnapName, setNewSnapName] = useState("");

  const [confirmState, setConfirmState] = useState<{
    id: string;
    type: "overwrite" | "delete" | "load" | null;
  }>({ id: "", type: null });

  React.useEffect(() => {
    fetchSnapshots().catch((err) => {
      console.error("Fetch error:", err);
    });
  }, [fetchSnapshots]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-sm"
      >
        <FolderOpen size={14} />
        세팅값 저장/불러오기
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-9 z-[70] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-[340px] animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
              <Save size={14} className="text-indigo-500" />
              현재 설정 저장하기
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="버전 이름 (예: 프로젝트A v1.0)"
                value={newSnapName}
                onChange={(e) => setNewSnapName(e.target.value)}
                className="flex-1 text-[11px] border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSnapName.trim()) {
                    saveSnapshot(newSnapName)
                      .then(() => {
                        setNewSnapName("");
                      })
                      .catch((err) => alert(`실패: ${err.message}`));
                  }
                }}
              />
              <button
                disabled={!newSnapName.trim()}
                onClick={() => {
                  saveSnapshot(newSnapName)
                    .then(() => {
                      setNewSnapName("");
                    })
                    .catch((err) => alert(`실패: ${err.message}`));
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[11px] font-bold disabled:opacity-50 hover:bg-indigo-700"
              >
                저장
              </button>
            </div>

            <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-500" />
              저장된 히스토리
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  저장된 설정값이 없습니다.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="group p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-white transition-all flex flex-col justify-center"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-bold text-slate-700 truncate mr-2 flex-1"
                        title={snap.name}
                      >
                        {snap.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            setConfirmState({ id: snap.id, type: "overwrite" })
                          }
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-indigo-50"
                          title="덮어쓰기"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmState({ id: snap.id, type: "load" })
                          }
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-indigo-50"
                          title="불러오기"
                        >
                          <FolderOpen size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmState({ id: snap.id, type: "delete" })
                          }
                          className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {confirmState.id === snap.id &&
                      confirmState.type === "overwrite" && (
                        <div className="mt-2 text-[10px] bg-indigo-50 p-2 rounded-md flex items-center justify-between animate-in slide-in-from-top-1 border border-indigo-100">
                          <span className="text-indigo-700 font-bold">
                            현재 상태로 덮어씌울까요?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                saveSnapshot(snap.name, snap.id)
                                  .then(() =>
                                    setConfirmState({ id: "", type: null }),
                                  )
                                  .catch((err) =>
                                    alert(`실패: ${err.message}`),
                                  );
                              }}
                              className="bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 shadow-sm"
                            >
                              네
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({ id: "", type: null })
                              }
                              className="bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded font-bold hover:bg-slate-50 shadow-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    {confirmState.id === snap.id &&
                      confirmState.type === "delete" && (
                        <div className="mt-2 text-[10px] bg-red-50 p-2 rounded-md flex items-center justify-between animate-in slide-in-from-top-1 border border-red-100">
                          <span className="text-red-700 font-bold">
                            정말 삭제하시겠습니까?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                deleteSnapshot(snap.id)
                                  .then(() =>
                                    setConfirmState({ id: "", type: null }),
                                  )
                                  .catch((err) =>
                                    alert(`실패: ${err.message}`),
                                  );
                              }}
                              className="bg-red-600 text-white px-2 py-1 rounded font-bold hover:bg-red-700 shadow-sm"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({ id: "", type: null })
                              }
                              className="bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded font-bold hover:bg-slate-50 shadow-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    {confirmState.id === snap.id &&
                      confirmState.type === "load" && (
                        <div className="mt-2 text-[10px] bg-blue-50 p-2 rounded-md flex items-center justify-between animate-in slide-in-from-top-1 border border-blue-100">
                          <span className="text-blue-700 font-bold">
                            변경사항을 덮어씌울까요?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                try {
                                  loadSnapshot(snap.id);
                                  setConfirmState({ id: "", type: null });
                                  setIsOpen(false);
                                } catch (e: any) {
                                  alert(`불러오기 실패: ${e.message}`);
                                }
                              }}
                              className="bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-700 shadow-sm"
                            >
                              불러오기
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({ id: "", type: null })
                              }
                              className="bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded font-bold hover:bg-slate-50 shadow-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GoogleSheetsManager() {
  const spreadsheetId = useAppStore(state => state.spreadsheetId);
  const verifyAndSetSpreadsheetId = useAppStore(state => state.verifyAndSetSpreadsheetId);
  const setSpreadsheetId = useAppStore(state => state.setSpreadsheetId);
  const fetchData = useAppStore(state => state.fetchData);
  const [isOpen, setIsOpen] = useState(false);
  const [tempId, setTempId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  React.useEffect(() => {
    setTempId("");
    setShowDisconnectConfirm(false);
  }, [isOpen]);

  const handleApply = async () => {
    let targetId = tempId.trim();
    if (!targetId) {
      alert("구글 스프레드시트 URL 또는 ID를 입력해야 연동할 수 있습니다.");
      return;
    }

    // Convert full URL to ID if pasted
    const match = targetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      targetId = match[1];
    }

    setIsLoading(true);
    try {
      await verifyAndSetSpreadsheetId(targetId);
      alert("구글 시트 연동 및 데이터 정합성 검증이 완료되었습니다!\n총괄 및 세부 면적표 데이터가 정상적으로 수집/동기화되었습니다.");
      setTempId("");
      setIsOpen(false);
    } catch (err: any) {
      let errMsg = err.message || "원인을 알 수 없는 오류가 발생했습니다.";
      if (
        errMsg.includes("entity was not found") || 
        errMsg.includes("Requested entity was not found") || 
        errMsg.includes("404")
      ) {
        errMsg = "구글 스프레드시트 파일(ID)을 찾을 수 없거나 공유 접근 권한이 없습니다.\n\n[주요 점검 사항]\n1. 입력한 주소(링크)가 올바른 구글 스프레드시트 본체인지 확인하세요.\n2. 구글 스프레드시트 우측 상단 '공유' 버튼을 클릭한 후, 일반 액세스 권한 설정을 '링크가 있는 모든 사용자' 및 '뷰어' 상태로 변경했는지 반드시 확인해보시기 바랍니다.";
      }
      alert("구글 시트 연동 실패:\n\n" + errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!spreadsheetId) return;
    setIsLoading(true);
    try {
      await fetchData(true);
      alert("실시간 구글 시트 데이터를 성공적으로 갱신하고 연동을 완료하였습니다.");
    } catch (err: any) {
      let errMsg = err.message || "동기화 오류가 발생했습니다.";
      if (errMsg.includes("entity was not found")) {
        errMsg = "활성화된 구글 스프레드시트를 찾을 수 없습니다. 시트가 삭제되었거나 공유 권한(링크가 있는 모든 사용자에게 뷰어로 공개)이 취소되었는지 확인해 보세요.";
      }
      alert("새로고침 실패:\n\n" + errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setSpreadsheetId(null);
    setShowDisconnectConfirm(false);
    alert("구글 시트 연동이 해제되었습니다.\n기존에 로드되어 있는 데이터 세팅은 화면에 안전하게 보존되어 정상 편집이 가능합니다.");
    setIsOpen(false);
  };

  const saveGlobalSettings = useAppStore(state => state.saveGlobalSettings);

  return (
    <div className="relative flex gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all shadow-sm cursor-pointer",
          spreadsheetId 
            ? "bg-emerald-600 hover:bg-emerald-700" 
            : "bg-slate-500 hover:bg-slate-600"
        )}
      >
        <Sheet size={14} />
        {spreadsheetId ? "구글시트 연동중" : "구글시트 연동"}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-9 z-[70] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-[360px] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
            <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
              <Sheet size={14} className="text-emerald-500" />
              Google Sheets 실시간 연동
            </h3>
            
            <div className="space-y-4">
              {/* 1. 신규 연동 영역 */}
              <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                  신규 스프레드시트 연동 등록
                </label>
                <div className="flex gap-1.5 bg-transparent">
                  <input
                    type="text"
                    value={tempId}
                    onChange={(e) => setTempId(e.target.value)}
                    placeholder="공유 주소(URL)를 붙여넣으세요"
                    className="flex-1 text-[11px] border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  />
                  <button
                    onClick={handleApply}
                    disabled={isLoading || !tempId.trim()}
                    className="px-3 bg-emerald-600 text-white rounded-md text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      "등록"
                    )}
                  </button>
                </div>
              </div>

              {/* 2. 현재 연동 정보 및 관리 */}
              {spreadsheetId ? (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                      현재 연동된 시트 정보
                    </span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-600 font-extrabold hover:underline flex items-center gap-0.5"
                    >
                      <Link size={10} />
                      시트 바로가기
                    </a>
                  </div>
                  
                  <div className="p-2.5 bg-emerald-50/40 border border-emerald-100/50 rounded-lg flex items-center justify-between">
                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Spreadsheet ID</span>
                      <span className="text-[11px] font-mono font-medium text-slate-700 truncate block">
                        {spreadsheetId}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="flex-1 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                      실시간 동기화 (새로고침)
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                      title="연동 해제"
                    >
                      해제
                    </button>
                  </div>

                  {showDisconnectConfirm && (
                    <div className="mt-2 text-[10px] bg-red-50 p-2.5 rounded-lg border border-red-100/60 flex flex-col gap-2 animate-in slide-in-from-top-1">
                      <span className="text-red-700 font-bold leading-relaxed">
                        정말 구글 스프레드시트 연동을 해제하시겠습니까? (로딩된 기개발 데이터 값은 브라우저에 그대로 유지됩니다)
                      </span>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleDisconnect}
                          className="bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-700 shadow-sm text-[10px] cursor-pointer"
                        >
                          네, 해제합니다
                        </button>
                        <button
                          onClick={() => setShowDisconnectConfirm(false)}
                          className="bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded font-bold hover:bg-slate-50 shadow-sm text-[10px] cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center border border-dashed border-slate-200 rounded-lg text-[11px] text-slate-400">
                  현재 연동된 구글 스프레드시트가 없습니다.
                </div>
              )}

              {/* 3. 정보 안내 팁 영역 */}
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/30">
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  * 시트 탭(Tab) 이름이 <span className="text-indigo-600 font-extrabold">설계 단계명</span>과 정확히 일치해야 합니다. (예: 공모지침, 계획설계 등)<br/>
                  * 구글 시트는 우측 상단 '공유' 버튼에서 <span className="text-emerald-600 font-extrabold">'링크가 있는 모든 사용자에게 공개(뷰어)'</span> 상태여야 연동이 가능합니다.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center bg-white"
      >
        <div
          className="w-3.5 h-3.5 rounded-full"
          style={{ backgroundColor: value }}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-7 z-[70] bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-32 animate-in fade-in zoom-in duration-100">
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    onChange(c.value);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-4 h-4 rounded-full transition-all hover:scale-125",
                    value === c.value
                      ? "ring-2 ring-indigo-400 ring-offset-1"
                      : "hover:ring-1 hover:ring-slate-300",
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const stages = useAppStore(state => state.stages);
  const floors = useAppStore(state => state.floors);
  const divisions = useAppStore(state => state.divisions);
  const departments = useAppStore(state => state.departments);
  const updateFloorArea = useAppStore(state => state.updateFloorArea);
  const floorAreasByStage = useAppStore(state => state.floorAreasByStage);
  const batchUpdateMapping = useAppStore(state => state.batchUpdateMapping);
  const updateDivisionColor = useAppStore(state => state.updateDivisionColor);
  const batchUpdateFloors = useAppStore(state => state.batchUpdateFloors);
  const deleteFloor = useAppStore(state => state.deleteFloor);
  const deleteDivision = useAppStore(state => state.deleteDivision);
  const deleteDepartment = useAppStore(state => state.deleteDepartment);
  const addStage = useAppStore(state => state.addStage);
  const updateStage = useAppStore(state => state.updateStage);
  const toggleStageTotalAreaOnly = useAppStore(state => state.toggleStageTotalAreaOnly);
  const deleteStage = useAppStore(state => state.deleteStage);
  const comparison = useAppStore(state => state.comparison);
  const spreadsheetId = useAppStore(state => state.spreadsheetId);
  const setSpreadsheetId = useAppStore(state => state.setSpreadsheetId);
  const fetchData = useAppStore(state => state.fetchData);

  const [activeTab, setActiveTab] = useState<"stages" | "areas" | "mapping" | "security">(
    "stages",
  );
  const [selectedStageId, setSelectedStageId] = useState<string>(
    comparison?.targetId ||
      stages[stages.length - 1]?.id ||
      stages[0]?.id ||
      "",
  );
  const [newStageName, setNewStageName] = useState("");
  const [newStageCode, setNewStageCode] = useState("");
  const [rawText, setRawText] = useState("");
  const [mappingText, setMappingText] = useState("");
  const [expandedDivs, setExpandedDivs] = useState<Record<string, boolean>>({});

  const settingsPassword = useAppStore(state => state.settingsPassword);
  const setSettingsPassword = useAppStore(state => state.setSettingsPassword);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authTimeStr = localStorage.getItem("settings_auth_time");
    if (!authTimeStr) return false;
    const authTime = Number(authTimeStr);
    return Date.now() - authTime < 10 * 60 * 1000;
  });

  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const checkCapsLock = (e: React.KeyboardEvent) => {
    if (e.getModifierState("CapsLock")) {
      setIsCapsLock(true);
    } else {
      setIsCapsLock(false);
    }
  };

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPassConfirm, setNewPassConfirm] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState("");

  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passInput) return;

    const inputHash = await hashPassword(passInput);
    
    // Resilience: Check against both hash and raw string (for legacy data migration)
    const isMatched = (inputHash === settingsPassword) || (passInput === settingsPassword);

    if (isMatched) {
      // If matched via raw string, migrate it to hash now
      if (passInput === settingsPassword && settingsPassword.length !== 64) {
        await setSettingsPassword(passInput);
      }
      
      localStorage.setItem("settings_auth_time", Date.now().toString());
      setIsAuthenticated(true);
      setPassError("");
      setPassInput("");
    } else {
      setPassError("비밀번호가 올바르지 않습니다.");
    }
  };

  const handleResetPassword = async () => {
    if (window.confirm("설정 비밀번호를 초기값(1234)으로 초기화하시겠습니까?")) {
      await setSettingsPassword("1234");
      alert("비밀번호가 '1234'로 초기화되었습니다.");
      setPassError("");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");
    setChangeSuccess("");

    const curHash = await hashPassword(curPass);
    if (curHash !== settingsPassword) {
      setChangeError("현재 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!newPass.trim()) {
      setChangeError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPass !== newPassConfirm) {
      setChangeError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    try {
      if (setSettingsPassword) {
        await setSettingsPassword(newPass);
      }
      localStorage.setItem("settings_auth_time", Date.now().toString());
      setChangeSuccess("비밀번호가 안전하게 변경 및 동기화되었습니다!");
      setCurPass("");
      setNewPass("");
      setNewPassConfirm("");
    } catch (err: any) {
      setChangeError(`비밀번호 변경 실패: ${err.message || "오류"}`);
    }
  };

  const toggleDiv = (divId: string) => {
    setExpandedDivs((prev) => ({
      ...prev,
      [divId]: !(prev[divId] ?? true),
    }));
  };

  const handleImportAreas = () => {
    const lines = rawText.trim().split("\n");
    const floorData: { id: string; name: string; area: number }[] = [];

    lines.forEach((line) => {
      const parts = line.trim().split(/\t|\s+/);
      if (parts.length >= 2) {
        const floorName = parts[0].toUpperCase();
        const area = parseFloat(parts[1].replace(/,/g, ""));

        if (floorName && !isNaN(area)) {
          floorData.push({
            id: floorName,
            name: floorName,
            area: area,
          });
        }
      }
    });

    if (floorData.length > 0) {
      batchUpdateFloors(floorData, selectedStageId);
      alert(
        `${floorData.length}개의 층별 데이터가 업데이트되었습니다 (덮어쓰기 완료).`,
      );
      setRawText("");
    } else {
      alert("유효한 데이터 형식을 찾을 수 없습니다. (예: 1F 3000)");
    }
  };

  const handleImportMapping = () => {
    const lines = mappingText.trim().split("\n");
    const mappings: {
      divName: string;
      divId: string;
      deptName: string;
      deptId: string;
    }[] = [];

    // Pass 1: Collect Division Names (1-digit codes)
    const divNamesMap = new Map<string, string>();
    lines.forEach((line) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^([A-Za-z0-9])\s+(.+)$/);
      if (match) {
        divNamesMap.set(match[1].toUpperCase(), match[2].trim());
      }
    });

    let lastSeenDivId = "";

    // Pass 2: Process Departments and connect with Division names
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const divMatch = trimmed.match(/^([A-Za-z0-9])\s+(.+)$/);
      if (divMatch) {
        lastSeenDivId = divMatch[1].toUpperCase();
        return;
      }

      const deptMatch = trimmed.match(/^([A-Za-z0-9]{2,})\s+(.+)$/);
      if (deptMatch) {
        const deptId = deptMatch[1].toUpperCase();
        const deptName = deptMatch[2].trim();
        const impliedDivId = deptId.substring(0, 1);

        // Prefer context if digits match, otherwise implied
        const divId =
          lastSeenDivId === impliedDivId ||
          lastSeenDivId === deptId.substring(0, lastSeenDivId.length)
            ? lastSeenDivId
            : impliedDivId;
        const divName = divNamesMap.get(divId) || `부문 ${divId}`;

        mappings.push({
          divId,
          divName,
          deptId,
          deptName,
        });
      }
    });

    if (mappings.length > 0) {
      batchUpdateMapping(mappings);
      alert(`${mappings.length}개의 부문/부서 매핑 데이터를 처리했습니다.`);
      setMappingText("");
    } else {
      alert(
        "유효한 데이터 형식을 찾을 수 없습니다. (예: 1 부문명 ... 101 부서명)",
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center animate-in fade-in zoom-in duration-200 border border-slate-100">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">설정 비밀번호 입력</h2>
          <p className="text-[11px] text-slate-500 mb-4 text-center leading-relaxed">
            보안과 데이터 무결성을 위해 설정 창 진입 시<br />비밀번호 입력이 필요합니다.
          </p>
          <form onSubmit={handleAuthSubmit} className="w-full space-y-3">
            <div className="relative group">
              <input
                type={showPass ? "text" : "password"}
                value={passInput}
                onChange={(e) => {
                  setPassInput(e.target.value);
                  setPassError("");
                }}
                onKeyUp={checkCapsLock}
                placeholder="비밀번호 입력"
                className="w-full text-center text-xs border border-slate-200 rounded-md px-10 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isCapsLock && (
                  <div className="px-1 py-0.5 bg-amber-50 border border-amber-200/50 rounded text-[7px] font-medium text-amber-500 select-none animate-in fade-in zoom-in duration-200 shadow-sm leading-none">
                    Caps
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {passError && (
              <p className="text-[10px] text-red-500 font-semibold mt-1 text-center">{passError}</p>
            )}
            <div className="flex gap-2 w-full pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow transition-colors cursor-pointer"
              >
                확인
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[70%] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              설정 및 데이터 관리
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <GoogleSheetsManager />
            <SnapshotManager />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-100 shrink-0 bg-slate-50/50 px-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("stages")}
            className={clsx(
              "px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all rounded-t-xl border-t border-x -mb-[1px]",
              activeTab === "stages"
                ? "bg-indigo-50/80 text-indigo-700 border-indigo-100/80 font-extrabold shadow-[0_-2px_6px_rgba(99,102,241,0.04)] border-b-white"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/30",
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            설계단계 관리
          </button>
          <button
            onClick={() => setActiveTab("areas")}
            className={clsx(
              "px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all rounded-t-xl border-t border-x -mb-[1px]",
              activeTab === "areas"
                ? "bg-indigo-50/80 text-indigo-700 border-indigo-100/80 font-extrabold shadow-[0_-2px_6px_rgba(99,102,241,0.04)] border-b-white"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/30",
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            층별 면적 입력
          </button>
          <button
            onClick={() => setActiveTab("mapping")}
            className={clsx(
              "px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all rounded-t-xl border-t border-x -mb-[1px]",
              activeTab === "mapping"
                ? "bg-indigo-50/80 text-indigo-700 border-indigo-100/80 font-extrabold shadow-[0_-2px_6px_rgba(99,102,241,0.04)] border-b-white"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/30",
            )}
          >
            <Network className="w-3.5 h-3.5" />
            부문/부서 매핑 정보
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={clsx(
              "px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all rounded-t-xl border-t border-x -mb-[1px]",
              activeTab === "security"
                ? "bg-indigo-50/80 text-indigo-700 border-indigo-100/80 font-extrabold shadow-[0_-2px_6px_rgba(99,102,241,0.04)] border-b-white"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/30",
            )}
          >
            <Lock className="w-3.5 h-3.5" />
            비밀번호 변경
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === "areas" ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStageId(s.id)}
                      className={clsx(
                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                        selectedStageId === s.id
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchData(true)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-[11px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5"
                    title="Google Sheets에서 데이터 다시 불러오기"
                  >
                    <RefreshCw size={12} />
                    시트 데이터 동기화
                  </button>
                  {!stages.find((s) => s.id === selectedStageId)
                    ?.isTotalAreaOnly && (
                    <button
                      onClick={handleImportAreas}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded text-[11px] font-bold shadow hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      텍스트 매핑 적용
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                * 각 층별 목표 면적을 입력하거나 엑셀에서 복사하여 일괄 입력할
                수 있습니다. (현재 단계:{" "}
                <span className="text-indigo-600 font-bold">
                  {stages.find((s) => s.id === selectedStageId)?.name}
                </span>
                )
              </p>

              <div className="flex gap-4 h-full min-h-0">
                {stages.find((s) => s.id === selectedStageId)
                  ?.isTotalAreaOnly ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8">
                    <div className="text-center mb-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-1">
                        연면적 목표 입력
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        해당 단계는 층별 세부 면적 없이 전체 연면적만
                        관리합니다.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                        지침 연면적 (Total)
                      </span>
                      <input
                        type="number"
                        value={
                          floorAreasByStage[selectedStageId]?.["_TOTAL_"] || 0
                        }
                        onChange={(e) =>
                          updateFloorArea(
                            selectedStageId,
                            "_TOTAL_",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-48 text-right bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm font-inter font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-inner"
                      />
                      <span className="text-xs text-slate-400 font-extrabold">
                        ㎡
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 1번 영역: 목록 */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {floors.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                              {f.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={
                                floorAreasByStage[selectedStageId]?.[f.id] || 0
                              }
                              onChange={(e) =>
                                updateFloorArea(
                                  selectedStageId,
                                  f.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-32 text-right bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-inter font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-inner"
                            />
                            <span className="text-[11px] text-slate-400 font-extrabold">
                              ㎡
                            </span>
                            <button
                              onClick={() => deleteFloor(f.id)}
                              className="ml-1 text-slate-300 hover:text-red-500 transition-colors p-1"
                              title="층 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 2번 영역: BATCH 입력 */}
                    <div className="w-[280px] flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          BATCH 입력 구간
                        </label>
                        <span className="text-[9px] text-indigo-400 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                          NAME & AREA
                        </span>
                      </div>
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="3F	3000&#10;2F	3000&#10;1F	3500"
                        className="flex-1 border-slate-200 rounded-lg p-3 text-[11px] font-inter bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none shadow-inner"
                      />
                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                        <p className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
                          형식: [층이름] [면적]
                          <br />
                          엑셀에서 두 컬럼을 복사해서 붙여넣은 후 상단의 '데이터
                          적용' 버튼을 눌러주세요.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : activeTab === "mapping" ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  * 실번호(예: 402-01)의 앞 3자리는 부서코드이며, 그 중 첫째
                  자리는 부문코드를 의미합니다.
                </p>
                {/* 3번 영역: 버튼 */}
                <button
                  onClick={handleImportMapping}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded text-[11px] font-bold shadow hover:bg-indigo-700 transition-all active:scale-95"
                >
                  매핑 적용 (APPLY)
                </button>
              </div>

              <div className="flex gap-4 h-full min-h-0">
                {/* 1번 영역: 목록 (아코디언) */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {divisions.map((div) => {
                    const isExpanded = expandedDivs[div.id] ?? true; // Default to expanded correctly
                    const deptCount = departments.filter(
                      (d) => d.divisionId === div.id,
                    ).length;

                    return (
                      <div
                        key={div.id}
                        className="border border-slate-100 rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div
                          className="bg-slate-50/80 px-3 py-2.5 border-b border-slate-100 flex items-center justify-between cursor-pointer group rounded-t-lg"
                          onClick={() => toggleDiv(div.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                            <div
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{
                                backgroundColor: div.color || "#6366f1",
                              }}
                            />
                            <span className="text-xs font-bold text-indigo-900">
                              {div.name}
                              <span className="text-[10px] text-indigo-400 font-normal ml-2">
                                ({deptCount}개 부서)
                              </span>
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent accordion toggle when clicking color picker
                            }}
                          >
                            <ColorPicker
                              value={div.color || "#6366f1"}
                              onChange={(val) =>
                                updateDivisionColor(div.id, val)
                              }
                            />
                            <button
                              onClick={() => deleteDivision(div.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors ml-1 p-1"
                              title="부문 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-1 px-3 bg-white divide-y divide-slate-50 animate-in slide-in-from-top-1 rounded-b-lg">
                            {departments
                              .filter((d) => d.divisionId === div.id)
                              .map((dept) => (
                                <div
                                  key={dept.id}
                                  className="flex items-center justify-between py-2 group hover:bg-slate-50/50 -mx-1 px-1 rounded transition-colors"
                                >
                                  <span className="text-[11px] text-slate-600 transition-colors group-hover:text-slate-900">
                                    {dept.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-inter font-bold text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                                      {dept.id}
                                    </span>
                                    <button
                                      onClick={() => deleteDepartment(dept.id)}
                                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                      title="부서 삭제"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            {deptCount === 0 && (
                              <div className="py-4 text-center text-[10px] text-slate-400 italic">
                                등록된 부서가 없습니다.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* 2번 영역: BATCH 입력 */}
                <div className="w-[280px] flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      BATCH 입력 구간
                    </label>
                    <span className="text-[9px] text-indigo-400 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                      CODE & NAME
                    </span>
                  </div>
                  <textarea
                    value={mappingText}
                    onChange={(e) => setMappingText(e.target.value)}
                    placeholder="1 병동부&#10;2 외래진료부&#10;101 표준병동&#10;..."
                    className="flex-1 border-slate-200 rounded-lg p-3 text-[11px] font-inter bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none shadow-inner"
                  />
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                    <p className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
                      숫자 1자리는 부문, 3자리는 부서로 인식됩니다.
                      <br />
                      데이터를 붙여넣은 후 상단의 '매핑 적용' 버튼을 눌러주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "stages" ? (
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    설계 단계 설정
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    프로젝트의 각 설계 단계를 관리합니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <input
                      type="text"
                      value={newStageCode}
                      onChange={(e) => setNewStageCode(e.target.value)}
                      placeholder="코드 (예:A)"
                      className="text-[11px] w-20 px-3 py-1.5 focus:outline-none border-r border-slate-200 bg-indigo-50/30 text-indigo-700 font-bold placeholder-indigo-300"
                    />
                    <input
                      type="text"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="새 단계명 (예: 준공설계)"
                      className="text-[11px] px-3 py-1.5 focus:outline-none w-40"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (newStageName.trim() || newStageCode.trim()) {
                        addStage(
                          newStageName.trim() || "새 단계",
                          newStageCode.trim() || undefined,
                        );
                        setNewStageName("");
                        setNewStageCode("");
                      }
                    }}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 transition-all"
                  >
                    단계 추가
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl group hover:border-indigo-200 hover:shadow-sm transition-all gap-2.5"
                  >
                    {/* Row 1: Code | Name | DB Table */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs ring-1 ring-indigo-100 overflow-hidden relative focus-within:ring-2 focus-within:ring-indigo-500">
                        <input
                          type="text"
                          value={
                            stage.code ??
                            (stage.name.match(/\[(.*?)\]/)?.[1] ||
                              stage.name.charAt(0).toUpperCase())
                          }
                          onChange={(e) =>
                            updateStage(
                              stage.id,
                              stage.name,
                              e.target.value.toUpperCase(),
                            )
                          }
                          className="absolute inset-0 w-full h-full text-center bg-transparent border-none focus:outline-none focus:ring-0 uppercase placeholder-indigo-300"
                          placeholder="코드"
                        />
                      </div>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) =>
                          updateStage(stage.id, e.target.value, stage.code)
                        }
                        placeholder="단계명 입력"
                        className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[12px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                      />
                    <div className="shrink-0 h-8 flex items-center">
                      {spreadsheetId ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg shadow-sm group/tab">
                          <Sheet size={12} className="text-green-600" />
                          <span className="text-[10px] font-bold text-green-700">연동됨 (Tab: {stage.name})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                          <Link size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">연동 안됨</span>
                        </div>
                      )}
                    </div>
                    </div>

                    {/* Row 2: Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group/label">
                          <input
                            type="checkbox"
                            checked={!!stage.isTotalAreaOnly}
                            onChange={(e) =>
                              toggleStageTotalAreaOnly(
                                stage.id,
                                e.target.checked,
                              )
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-medium text-slate-500 group-hover/label:text-slate-700 transition-colors">
                            연면적(목표)만 입력 모드
                          </span>
                        </label>

                        <button
                          onClick={() => deleteStage(stage.id)}
                          className="flex items-center gap-1.5 px-2 py-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-tight">
                            Delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {stages.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      등록된 설계 단계가 없습니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  * 팁: 단계 이름 앞에 [A], [B] 처럼 알파벳을 넣으면 목록에서
                  자동으로 정렬됩니다.
                  <br />* 단계를 지워도 해당 단계에 입력한 데이터(면적 등)는
                  내부적으로 보존됩니다.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "security" && (
            <div className="max-w-md mx-auto py-6">
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">설정 비밀번호 변경</h3>
                </div>
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1.5 p-0 bg-transparent">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">
                      현재 비밀번호
                    </label>
                    <div className="relative">
                      <input
                        type={showCurPass ? "text" : "password"}
                        value={curPass}
                        onChange={(e) => setCurPass(e.target.value)}
                        onKeyUp={checkCapsLock}
                        placeholder="현재 설정된 비밀번호"
                        className="w-full text-xs border border-slate-200 rounded-md pl-3 pr-16 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal bg-white [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {isCapsLock && (
                          <div className="px-1 py-0.5 bg-amber-50 border border-amber-200/50 rounded text-[7px] font-medium text-amber-500 select-none shadow-sm capitalize leading-none">
                            Caps
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowCurPass(!showCurPass)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          {showCurPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-0 bg-transparent">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">
                      새 비밀번호
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        onKeyUp={checkCapsLock}
                        placeholder="새로 사용할 비밀번호"
                        className="w-full text-xs border border-slate-200 rounded-md pl-3 pr-16 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal bg-white [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {isCapsLock && (
                          <div className="px-1 py-0.5 bg-amber-50 border border-amber-200/50 rounded text-[7px] font-medium text-amber-500 select-none shadow-sm capitalize leading-none">
                            Caps
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-0 bg-transparent">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">
                      새 비밀번호 확인
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        value={newPassConfirm}
                        onChange={(e) => setNewPassConfirm(e.target.value)}
                        onKeyUp={checkCapsLock}
                        placeholder="새 비밀번호 다시 입력"
                        className="w-full text-xs border border-slate-200 rounded-md pl-3 pr-16 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal bg-white [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {isCapsLock && (
                          <div className="px-1 py-0.5 bg-amber-50 border border-amber-200/50 rounded text-[7px] font-medium text-amber-500 select-none shadow-sm capitalize leading-none">
                            Caps
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {changeError && (
                    <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-md text-[11px] font-semibold text-center mt-1">
                      {changeError}
                    </div>
                  )}

                  {changeSuccess && (
                     <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-750 rounded-md text-[11px] font-semibold text-center font-bold mt-1">
                      {changeSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow hover:shadow-md transition-all cursor-pointer"
                  >
                    비밀번호 변경 완료
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
