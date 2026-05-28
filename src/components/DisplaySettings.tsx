import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Eye, EyeOff, GitCompare, ChevronDown, Check } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import SelectorPopover from './SelectorPopover';

export default function DisplaySettings() {
  const { 
    stages, 
    visibleStageIds, 
    setVisibleStageIds, 
    comparison, 
    setComparisonStages,
    medicalOnly,
    toggleMedicalOnly
  } = useAppStore();

  // Handle initialization of comparison stages if not set
  useEffect(() => {
    if (stages.length > 0) {
      const baseStage = stages.find(s => s.name === '중간설계') || stages[0];
      const targetStage = stages[stages.length - 1]; // Latest stage as "Current"
      
      const newBaseId = comparison.baseId || baseStage.id;
      const newTargetId = comparison.targetId || targetStage.id;
      
      if (newBaseId !== comparison.baseId || newTargetId !== comparison.targetId) {
        setComparisonStages(newBaseId, newTargetId);
      }
    }
  }, [stages, comparison.baseId, comparison.targetId, setComparisonStages]);

  const toggleStage = (id: string) => {
    if (visibleStageIds.includes(id)) {
      if (visibleStageIds.length > 1) {
        setVisibleStageIds(visibleStageIds.filter(i => i !== id));
      }
    } else {
      setVisibleStageIds([...visibleStageIds, id]);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 outline-none focus:ring-2 focus:ring-indigo-500/20">
          <Eye size={13} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
          <span className="truncate text-slate-700 flex-1">단계 표시 설정</span>
          <ChevronDown size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-1 shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 animate-in fade-in zoom-in duration-200 origin-top-right"
          align="end"
          sideOffset={8}
        >
          <div className="space-y-4">
            {/* Added Global Filter: Medical ONLY */}
            <div className="hidden md:block">
              <label className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 cursor-pointer group/label hover:bg-emerald-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={medicalOnly}
                  onChange={(e) => toggleMedicalOnly(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-emerald-800">의료시설ONLY 필터</span>
                  <span className="text-[10px] text-emerald-600 font-medium">부문코드 숫자 항목만 표시</span>
                </div>
              </label>
            </div>

            {/* 표시 단계 설정 (2x3 grid changed to 2-column list with row-aligned buttons) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={15} className="text-indigo-500" />
                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tighter">표시할 단계 (최소 1개)</h4>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {stages.map(stage => {
                  const isVisible = visibleStageIds.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      onClick={() => toggleStage(stage.id)}
                      className={clsx(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all border gap-1.5 h-[30px]",
                        isVisible 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm ring-1 ring-indigo-50" 
                          : "bg-white text-slate-400 border-slate-100 opacity-85"
                      )}
                    >
                      <span className="truncate text-left flex-1">{stage.name}</span>
                      {isVisible ? <Eye size={12} className="text-indigo-500 shrink-0" /> : <EyeOff size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 비교 대상 설정 (Updated to use SelectorPopover label design, flipped with "차이" divider) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <GitCompare size={15} className="text-indigo-500" />
                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tighter">증감(DIFF) 비교 설정</h4>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl ring-1 ring-slate-100 flex flex-col gap-1">
                <SelectorPopover
                  label="TARGET"
                  labelClassName="text-purple-600 font-extrabold"
                  options={stages}
                  value={comparison.targetId || ""}
                  onChange={(val) => setComparisonStages(comparison.baseId, val)}
                  className="w-full bg-purple-50/40 border-purple-100/70 hover:bg-purple-100/40 hover:border-purple-200 text-purple-950 focus:ring-purple-500/20"
                  placeholder="비교 선택"
                />
                
                <SelectorPopover
                  label="BASE"
                  labelClassName="text-rose-600 font-extrabold"
                  options={stages}
                  value={comparison.baseId || ""}
                  onChange={(val) => setComparisonStages(val, comparison.targetId)}
                  className="w-full bg-rose-50/40 border-rose-100/70 hover:bg-rose-100/40 hover:border-rose-200 text-rose-950 focus:ring-rose-500/20"
                  placeholder="기준 선택"
                />
              </div>
              
              <p className="mt-3 text-[9px] text-slate-400 italic leading-snug px-1">
                * 테이블의 증감(DIFF) 컬럼은 위 설정된 두 단계의 차이값이 표시됩니다 (TARGET - BASE).
              </p>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
