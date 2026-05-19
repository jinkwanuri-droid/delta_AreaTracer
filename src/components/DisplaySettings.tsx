import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Eye, EyeOff, GitCompare, ChevronDown } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';

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
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
          <Eye size={15} className="text-slate-400" />
          단계 표시 설정
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 animate-in fade-in zoom-in duration-200 origin-top-right"
          align="end"
          sideOffset={8}
        >
          <div className="space-y-6">
            {/* 비교 대상 설정 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitCompare size={15} className="text-indigo-500" />
                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">증감(DIFF) 비교 기준</h4>
              </div>

              {/* Added Global Filter: Medical ONLY */}
              <div className="mb-4">
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

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">기준 단계 (Base)</label>
                  <select 
                    value={comparison.baseId || ''}
                    onChange={(e) => setComparisonStages(e.target.value, comparison.targetId)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-2 text-[12px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center">
                  <div className="h-4 w-px bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">비교 단계 (Target)</label>
                  <select 
                    value={comparison.targetId || ''}
                    onChange={(e) => setComparisonStages(comparison.baseId, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-2 text-[12px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-slate-400 italic">
                * 테이블의 증감(DIFF) 컬럼이 선택된 두 단계의 차이로 자동 계산됩니다.
              </p>
            </div>

            {/* 표시 단계 설정 */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={15} className="text-indigo-500" />
                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">표시할 단계</h4>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {stages.map(stage => {
                  const isVisible = visibleStageIds.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      onClick={() => toggleStage(stage.id)}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all",
                        isVisible ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" : "bg-slate-50 text-slate-400 grayscale"
                      )}
                    >
                      <span className="flex-1 text-left truncate pr-2">{stage.name}</span>
                      {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
