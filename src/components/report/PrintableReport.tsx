import React, { useMemo, forwardRef } from 'react';
import clsx from 'clsx';
import { useAppStore, getFloorVal } from '@/store/useAppStore';
import { 
  ReportAreaByStageChart, 
  ReportDivisionPieChart, 
  ReportDivisionTrendChart 
} from './ReportCharts';

// PDF 출력을 위한 고성능 완벽 Pagination & PPT 슬라이드 스타일 PrintableReport
const PrintableReport = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const project = useAppStore(state => state.project);
  const options = useAppStore(state => state.pdfExportOptions);
  
  const stages = useAppStore(state => state.stages);
  const divisions = useAppStore(state => state.divisions);
  const departments = useAppStore(state => state.departments);
  const rooms = useAppStore(state => state.rooms);
  const values = useAppStore(state => state.values);
  const floors = useAppStore(state => state.floors);
  const floorAreasByStage = useAppStore(state => state.floorAreasByStage);
  const medicalOnly = useAppStore(state => state.medicalOnly);
  const comparison = useAppStore(state => state.comparison);
  const filters = useAppStore(state => state.filters);
  const floorWardOverrides = useAppStore(state => state.floorWardOverrides);

  const currentStage = stages[stages.length - 1];
  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // ----------------------------------------
  // 1. 공통 및 대시보드/총괄용 연산 로직
  // ----------------------------------------
  const medicalDivisionIds = useMemo(() => divisions.filter(d => /^\d+$/.test(d.id)).map(d => d.id), [divisions]);

  const areaByStage = useMemo(() => {
    return stages.map(stage => {
      const stageValues = values.filter(v => v.stageId === stage.id);
      
      const medicalStageValues = stageValues.filter(v => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return false;
        const roomNo = room.no.toUpperCase();
        if (roomNo.startsWith('P') || roomNo.startsWith('O')) return false;
        if (!medicalOnly) return true;
        const dept = departments.find(d => d.id === room.departmentId);
        return dept && medicalDivisionIds.includes(dept.divisionId);
      });
      const netTotal = medicalStageValues.reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
      
      const parkingArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        return room.no.toUpperCase().startsWith('P') ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);

      const outdoorArea = stageValues.reduce((sum, v) => {
        const room = rooms.find(r => r.id === v.roomId);
        if (!room) return sum;
        return room.no.toUpperCase().startsWith('O') ? sum + (v.unitArea * v.quantity) : sum;
      }, 0);
      
      const floorAreas = floorAreasByStage[stage.id] || {};
      const grossTotal = Object.entries(floorAreas).reduce((sum, [fid, val]) => fid === '_TOTAL_' ? sum : sum + (val as number || 0), 0);
      const finalGross = grossTotal || floorAreas['_TOTAL_'] || 0;
      
      const adjustedGross = finalGross - parkingArea - outdoorArea;
      const common = adjustedGross - netTotal;
      
      return {
        name: stage.name,
        net: netTotal,
        gross: finalGross,
        adjustedGross: adjustedGross,
        parking: parkingArea,
        outdoor: outdoorArea,
        other: parkingArea + outdoorArea,
        common: common,
      };
    });
  }, [stages, values, medicalOnly, medicalDivisionIds, rooms, departments, floorAreasByStage]);

  const filteredValuesOriginal = useMemo(() => {
    if (!medicalOnly) return values;
    return values.filter(v => {
      const room = rooms.find(r => r.id === v.roomId);
      const dept = room ? departments.find(d => d.id === room.departmentId) : null;
      return dept && medicalDivisionIds.includes(dept.divisionId);
    });
  }, [values, medicalOnly, rooms, departments, medicalDivisionIds]);

  const divisionData = useMemo(() => {
    if (!currentStage) return [];
    return divisions
      .filter(div => !medicalOnly || medicalDivisionIds.includes(div.id))
      .map(div => {
        const stageValues = filteredValuesOriginal.filter(v => v.stageId === currentStage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        return { name: div.name, id: div.id, value: area, color: div.color || '#cbd5e1' };
      })
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [divisions, medicalOnly, medicalDivisionIds, filteredValuesOriginal, currentStage, rooms, departments]);

  const stageDivisionData = useMemo(() => {
    return stages.map(stage => {
      const data: any = { name: stage.name };
      divisions.filter(div => !medicalOnly || medicalDivisionIds.includes(div.id)).forEach(div => {
        const stageValues = filteredValuesOriginal.filter(v => v.stageId === stage.id);
        const roomsInDiv = rooms.filter(r => departments.find(d => d.id === r.departmentId)?.divisionId === div.id);
        const area = stageValues.filter(v => roomsInDiv.some(r => r.id === v.roomId)).reduce((sum, v) => sum + (v.unitArea * v.quantity), 0);
        data[div.name] = area;
      });
      return data;
    });
  }, [stages, divisions, medicalOnly, medicalDivisionIds, filteredValuesOriginal, rooms, departments]);

  // ----------------------------------------
  // 2. 완벽한 화면 동치형 층별 데이터 가공 로직
  // ----------------------------------------
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

  // 리포트 출력 포맷터
  const formatNum = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return "-";
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };
  const formatQty = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return "-";
    return val.toString();
  };

  const floorDataMap = useMemo(() => {
    const dataByFloor: Record<string, any[]> = {};
    const baseId = comparison.baseId || stages[0]?.id;
    const targetId = comparison.targetId || stages[stages.length - 1]?.id;

    const sortedFloors = [...floors].sort((a, b) => getFloorVal(a.name || a.id) - getFloorVal(b.name || b.id));
    sortedFloors.forEach(floor => {
      // 1) displayRooms 필터링 및 소팅 똑같이 적용
      const deptsMap = new Map(departments.map((d) => [d.id, d]));
      const divsMap = new Map(divisions.map((d) => [d.id, d]));
      const roomsByFloor = rooms.filter((r) => r.floorId.toUpperCase().replace(/F$/i, '').trim() === floor.id.toUpperCase().replace(/F$/i, '').trim());

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

      // 2) deptSummary 계산
      const deptSumMap = new Map<string, Record<string, number>>();
      filteredRooms.forEach((r) => {
        if (!deptSumMap.has(r.departmentId)) {
          const initial: Record<string, number> = {};
          stages.forEach((s) => (initial[s.id] = 0));
          deptSumMap.set(r.departmentId, initial);
        }
        const sums = deptSumMap.get(r.departmentId)!;
        const wardCount = r.departmentId === "101" ? getWardCount(floor.id, r.departmentId) : 1;

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

      // 3) flatData 조합
      const combinedData: any[] = [];
      let lastDeptId: string | null = null;
      const currentGroupValueSums: Record<string, number> = {};

      for (let i = 0; i < filteredRooms.length; i++) {
        const r = filteredRooms[i];
        const dept = deptsMap.get(r.departmentId);
        const div = dept ? divsMap.get(dept.divisionId) : null;

        const deptChanged = r.departmentId !== lastDeptId;

        if (deptChanged) {
          stages.forEach((s) => (currentGroupValueSums[s.id] = 0));
          const count = getWardCount(floor.id, r.departmentId);
          const sums = deptSumMap.get(r.departmentId) || {};

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

        const wardCount = r.departmentId === "101" ? getWardCount(floor.id, r.departmentId) : 1;

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
          row.variance = (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
        }

        combinedData.push(row);

        const nextRoom = filteredRooms[i + 1];
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
            summary.variance = (summary[`${targetId}_total`] || 0) - (summary[`${baseId}_total`] || 0);
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

      if (combinedData.length > 0) {
        dataByFloor[floor.name] = combinedData;
      }
    });

    return dataByFloor;
  }, [rooms, values, stages, floors, departments, divisions, medicalOnly, comparison, filters, floorWardOverrides]);

  // ----------------------------------------
  // 3. 고정 포인트 기반 Pagination 분할 로직 (여백 보장 극의)
  // ----------------------------------------
  const floorChunksMap = useMemo(() => {
    const chunksMap: Record<string, any[][]> = {};
    
    Object.entries(floorDataMap).forEach(([floorName, flatData]) => {
      const chunks: any[][] = [];
      let currentChunk: any[] = [];
      let currentPoints = 0;
      const MAX_POINTS_PER_PAGE = 21.0; // PPT 및 A4 가로 인쇄 시 바닥글과 간섭을 차단하고 꼬리말 밑 공백을 최소화하는 하이덴시티 황금 분할

      flatData.forEach((item) => {
        let weight = 1.0;
        if (item.isGroupHeader) weight = 1.6;
        else if (item.isSummary) weight = 1.6;
        else if (item.isSpacer) weight = 0.4;

        if (currentPoints + weight > MAX_POINTS_PER_PAGE && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentPoints = 0;
        }

        currentChunk.push(item);
        currentPoints += weight;
      });

      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      if (chunks.length > 0) {
        chunksMap[floorName] = chunks;
      }
    });

    return chunksMap;
  }, [floorDataMap]);

  // ----------------------------------------
  // 전체 누적 페이지 번호 계산
  // ----------------------------------------
  const totalPagesCount = useMemo(() => {
    let count = 0;
    if (options.dashboard) count += 1;
    if (options.summary) count += 1;
    if (options.detail) {
      Object.values(floorChunksMap).forEach(chunks => {
        count += chunks.length;
      });
    }
    return count;
  }, [options, floorChunksMap]);

  // 해당 페이지의 누적 인덱스를 찾기 위한 헬퍼
  const getOverallPageNumber = (type: 'dashboard' | 'summary' | 'detail', detailsIndex?: number) => {
    let pageNum = 1;
    if (type === 'dashboard') return pageNum;
    
    if (options.dashboard) pageNum += 1;
    if (type === 'summary') return pageNum;

    if (options.summary) pageNum += 1;
    if (detailsIndex !== undefined) {
      pageNum += detailsIndex;
    }
    return pageNum;
  };

  const projectTitle = project?.name || '경상남도 서부의료원 실시설계';

  return (
    <div ref={ref} className="print-container-root w-full bg-white text-slate-800 printable-mode" style={{ fontFamily: '"Pretendard", "Inter", sans-serif' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

        /* 공통 프리텐다드 서체 전 영역 강제화로 숫자가 리얼 고딕으로 완벽 렌더링되게 처리 */
        .printable-mode, .printable-mode * {
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif !important;
        }

        /* 전반적인 인쇄 구조 및 규격 설정 (중요: 크기 불일치 원천 해소) */
        @media print {
          .printable-mode { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          @page { 
            size: A4 landscape; 
            margin: 14mm 15mm 12mm 15mm !important; 
          }
          
          body, html {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body, html, .printable-mode, .printable-mode * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif !important;
          }

          /* 실제 PDF 가용 높이(184mm)에 슬라이드 1장 매칭으로 행 밀림 원천 봉쇄 */
          .pdf-slide-container {
            height: 184mm !important;
            max-height: 184mm !important;
          }
        }

        /* 987px는 A4 landscape 가로 실가용 영역에 100% 한계치로 완벽 안착되는 황금 절대 수치 */
        .pdf-slide-container {
          width: 987px !important;
          height: 665px !important;
          max-height: 665px !important;
          margin: 0 auto !important;
          padding: 0 !important;
          position: relative !important;
          background: #ffffff !important;
          overflow: hidden !important;
          page-break-after: always !important;
          break-after: page !important;
          box-sizing: border-box !important;
        }

        /* 마지막 슬라이드는 강제 page-break를 해제해 공백 페이지 인출 방지 */
        .pdf-slide-container:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        .stripe-pattern { 
          background: repeating-linear-gradient(45deg, #f8fafc22, #f8fafc22 3px, #f1f5f922 3px, #f1f5f922 6px); 
        }
        .tabular-nums { 
          font-variant-numeric: tabular-nums; 
        }
      `}</style>

      {/* ======================================================== */}
      {/* 0. 대시보드 리포트 슬라이드                                */}
      {/* ======================================================== */}
      {options.dashboard && (
        <div className="pdf-slide-container pt-3.5 px-1 bg-white">
          {/* 머리말 영역 (PPT 모바일/스샷 상부 라인 완벽 동치) */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold py-1 px-1">
            <span>{projectTitle}</span>
            <span>종합면적 대시보드</span>
          </div>
          <div className="border-b-[1.5px] border-slate-700 w-full mb-3"></div>

          {/* 타이틀 및 현황 */}
          <div className="flex justify-between items-baseline mb-3 px-1">
            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">
              종합 실별 구조 및 계획설계 요약 현황
            </h2>
          </div>

          {/* 대시보드 차트 시각화 및 그리드 구성 */}
          <div className="grid grid-cols-12 gap-4 mt-2">
            {/* 왼쪽 단계별 추이 */}
            <div className="col-span-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-800">1. 단계별 총면적 및 전용면적 변동 현황</span>
              </div>
              <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-100">
                <ReportAreaByStageChart data={areaByStage} width={440} height={210} />
              </div>
            </div>

            {/* 오른쪽 부문별 파이 */}
            <div className="col-span-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-800">2. 부문별 전용면적 비중 (마지막 단계 기준)</span>
              </div>
              <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-100">
                <ReportDivisionPieChart 
                  data={divisionData} 
                  totalNetArea={areaByStage[areaByStage.length - 1]?.net || 0} 
                  width={440} 
                  height={210} 
                />
              </div>
            </div>

            {/* 하부 부문별 단계 추이 */}
            <div className="col-span-12 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-800">3. 부문 및 영역별 단계별 추이 데이터 분석</span>
              </div>
              <div className="flex justify-center bg-white p-2 rounded-lg border border-slate-100">
                <ReportDivisionTrendChart 
                  data={stageDivisionData} 
                  divisions={divisions.filter(d => !medicalOnly || medicalDivisionIds.includes(d.id))}
                  width={920}
                  height={150}
                />
              </div>
            </div>
          </div>
          
           {/* 꼬리말 영역 (PPT 슬라이드 최하부 라인 완벽 일치) */}
          <div className="absolute bottom-2 left-1 right-1">
            <div className="border-t border-slate-300 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold tracking-wider px-1">
              <span className="font-extrabold text-[#1E293B] text-[9px]">해안건축</span>
              <span>STAGE: {currentStage?.name}</span>
              <span className="text-[11px] font-mono font-semibold text-slate-800 leading-none">
                {getOverallPageNumber('dashboard')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. 총괄면적표 요약 리포트 슬라이드                          */}
      {/* ======================================================== */}
      {options.summary && (
        <div className="pdf-slide-container pt-3.5 px-1 bg-white">
          {/* 머리말 영역 */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold py-1 px-1">
            <span>{projectTitle}</span>
            <span>부서별 총괄면적</span>
          </div>
          <div className="border-b-[1.5px] border-slate-700 w-full mb-3"></div>

          {/* 타이틀 및 요약정보 */}
          <div className="flex justify-between items-baseline mb-3 px-1">
            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">
              부서별 면적 계획 총괄 요약계획표
            </h2>
          </div>

          <div className="overflow-hidden border border-slate-300 rounded-lg">
            <table className="w-full text-[10.5px] border-collapse tabular-nums" style={{ width: '987px' }}>
              <thead>
                <tr className="bg-slate-800 text-white border-b border-slate-400 font-extrabold">
                  <th className="py-2.5 px-4 text-center border-r border-slate-700 w-32 font-black">부문</th>
                  <th className="py-2.5 px-4 text-center border-r border-slate-700 w-32 font-black">부서코드</th>
                  <th className="py-2.5 px-4 text-left border-r border-slate-700 font-black">부서명</th>
                  <th className="py-2.5 px-4 text-right border-r border-slate-700 w-44 font-black">현재전용면적 (㎡)</th>
                  <th className="py-2.5 px-4 text-right w-36 font-black">부문 내 점유비율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {divisions.map((div, dIdx) => {
                  const divDepts = departments.filter(d => d.divisionId === div.id);
                  const deptRows = divDepts.map(dept => {
                    const deptRooms = rooms.filter(r => r.departmentId === dept.id);
                    const totalArea = deptRooms.reduce((acc, r) => {
                      const v = values.find(val => val.roomId === r.id && val.stageId === currentStage?.id);
                      return acc + (v ? v.unitArea * v.quantity : 0);
                    }, 0);
                    return { dept, totalArea };
                  }).filter(d => d.totalArea > 0);

                  const divTotal = deptRows.reduce((acc, d) => acc + d.totalArea, 0);
                  if (divTotal === 0) return null;

                  return (
                    <React.Fragment key={div.id}>
                      <tr className="bg-slate-100 border-b border-slate-300 font-extrabold">
                        <td className="py-2 px-4 text-center text-slate-900 border-r border-slate-300 font-extrabold">{div.name}</td>
                        <td colSpan={2} className="py-2 px-4 text-left text-slate-500 border-r border-slate-300 uppercase tracking-widest text-[9.5px]">Division Sub-Total</td>
                        <td className="py-2 px-4 text-right text-indigo-700 border-r border-slate-300 font-black">
                          {divTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-2 px-4 text-right font-black text-slate-400 bg-slate-50/50">-</td>
                      </tr>
                      {deptRows.slice(0, 8).map(d => ( // A4 범위 제한 하 안전 슬라이스
                        <tr key={d.dept.id} className="border-b border-slate-200 hover:bg-slate-50/30">
                          <td className="py-1.5 px-4 text-center text-transparent border-r border-slate-200 select-none">.</td>
                          <td className="py-1.5 px-4 text-center font-bold text-slate-500 font-mono border-r border-slate-200 leading-none">{d.dept.code}</td>
                          <td className="py-1.5 px-4 text-left font-semibold text-slate-700 border-r border-slate-200">{d.dept.name}</td>
                          <td className="py-1.5 px-4 text-right font-bold text-slate-800 border-r border-slate-200 font-mono">
                            {d.totalArea.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-1.5 px-4 text-right font-bold text-slate-500 font-mono">
                            {((d.totalArea / divTotal) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 꼬리말 영역 */}
          <div className="absolute bottom-2 left-1 right-1">
            <div className="border-t border-slate-300 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold tracking-wider px-1">
              <span className="font-extrabold text-[#1E293B] text-[9px]">해안건축</span>
              <span>STAGE: {currentStage?.name}</span>
              <span className="text-[11px] font-mono font-semibold text-slate-800 leading-none">
                {getOverallPageNumber('summary')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. 층별 세부면적표 리포트 슬라이드 (A4 정밀 수작업 페이지네이션) */}
      {/* ======================================================== */}
      {options.detail && Object.keys(floorChunksMap).length > 0 && (
        <>
          {(() => {
            let detailPageAccumulator = 0;
            const sortedFloorNames = Object.keys(floorChunksMap).sort((a, b) => getFloorVal(a) - getFloorVal(b));
            return sortedFloorNames.map((floorName) => {
              const chunks = floorChunksMap[floorName];
              const totalChunks = chunks.length;
              return chunks.map((chunkRows, chunkIdx) => {
                const currentPageNum = chunkIdx + 1;
                const overallPageNum = getOverallPageNumber('detail', detailPageAccumulator + chunkIdx);
                
                // 각 층 루프 완료 후 누적 카운트에 합산하기 위한 클로저 유도
                if (chunkIdx === totalChunks - 1) {
                  detailPageAccumulator += totalChunks;
                }

                return (
                  <div key={`${floorName}-p${currentPageNum}`} className="pdf-slide-container pt-3.5 px-1 bg-white">
                    
                    {/* 머리말 영역 (PPT 스크린샷과 완벽 동해) */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold py-1 px-1">
                      <span>{projectTitle}</span>
                      <span>층별세부 면적계획</span>
                    </div>
                    <div className="border-b-[1.5px] border-slate-700 w-full mb-3"></div>

                    {/* 타이틀 영역 - 00층 세부 면적계획 (1/8) 완벽 반영 */}
                    <div className="flex justify-between items-baseline mb-3 px-1">
                      <h2 className="text-[19px] font-extrabold text-slate-900 tracking-tight">
                        {floorName} 세부 면적계획 <span className="text-slate-500 font-bold ml-1">({currentPageNum}/{totalChunks})</span>
                      </h2>
                    </div>

                    {/* 테이블 컨텐츠 영역 */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden style-table-pdf-container">
                      <table className="w-full text-slate-800 border-collapse table-fixed text-[9.5px] font-sans" style={{ width: '987px', minWidth: '987px' }}>
                        <colgroup>
                          <col style={{ width: '32px' }} />
                          <col style={{ width: '130px' }} />
                          {stages.map((s) => (
                            <React.Fragment key={s.id}>
                              <col style={{ width: '34px' }} />
                              <col style={{ width: '20px' }} />
                              <col style={{ width: '39px' }} />
                            </React.Fragment>
                          ))}
                          <col style={{ width: '45px' }} />
                          <col style={{ width: '315px' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-200 border-b border-slate-350 text-slate-800">
                            <th rowSpan={2} className="py-1 px-1 text-center font-extrabold text-[10px] border-r border-slate-300">NO.</th>
                            <th rowSpan={2} className="py-1 px-2 text-left font-extrabold text-[10px] border-r border-slate-300">ROOM NAME</th>
                            {stages.map((s) => (
                              <th key={s.id} colSpan={3} className="py-0.5 px-1 text-center font-extrabold text-slate-700 border-r border-b border-slate-300 text-[9.5px]">
                                {s.name}
                              </th>
                            ))}
                            <th rowSpan={2} className="py-1 px-1 text-center font-extrabold text-[10px] border-r border-slate-300 leading-tight">
                              증감<br/>
                              <span className="text-[7.2px] font-bold text-slate-500 font-mono block mt-0.5 whitespace-nowrap">(실시-중간)</span>
                            </th>
                            <th rowSpan={2} className="py-1 px-2 text-left font-extrabold text-[10px] col-note-print">NOTE</th>
                          </tr>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-600">
                            {stages.map((s) => (
                              <React.Fragment key={`${s.id}-sub`}>
                                <th className="py-0.5 px-0.5 text-right font-bold border-r border-slate-200 text-[8px]">Net</th>
                                <th className="py-0.5 px-0.5 text-center font-bold border-r border-slate-200 text-[8px]">Qty</th>
                                <th className="py-0.5 px-1 text-right font-extrabold text-slate-700 border-r border-slate-200 text-[8px] bg-slate-50/40">Total</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {chunkRows.map((row) => {
                            if (row.isSpacer) {
                              return (
                                <tr key={row.id} className="bg-slate-50/10" style={{ height: "4px" }}>
                                  <td colSpan={2 + stages.length * 3 + 2} className="p-0 border-y border-slate-100" />
                                </tr>
                              );
                            }
                            if (row.isGroupHeader) {
                              return (
                                <tr key={row.id} className="bg-slate-100/70 border-b border-slate-300">
                                  <td colSpan={2 + stages.length * 3 + 2} className="py-1.5 px-3 font-extrabold text-[#1E293B] text-[10px] border-b border-slate-300">
                                    <div className="flex items-center">
                                      <span 
                                        className="inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" 
                                        style={{ 
                                          backgroundColor: row.deptColor, 
                                          border: `3px solid ${row.deptColor}`, 
                                          display: "inline-block",
                                          WebkitPrintColorAdjust: "exact" 
                                        }}
                                      />
                                      {row.deptName}
                                      {row.wardCount > 1 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-[8.5px] bg-[#EEF2F6] text-slate-600 border border-slate-200 rounded font-bold">
                                          {row.wardCount}개 병동 적용
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            if (row.isSummary) {
                              return (
                                <tr key={row.id} className="bg-slate-50 font-bold border-y border-slate-300 text-slate-950 text-[9.5px]">
                                  <td className="py-1 px-1 border-r border-slate-200"></td>
                                  <td className="py-1 px-2 text-left font-extrabold border-r border-slate-200">[{row.deptName} 소계]</td>
                                  {stages.map((s) => (
                                    <React.Fragment key={s.id}>
                                      <td className="py-1 px-0.5 text-right border-r border-slate-200">-</td>
                                      <td className="py-1 px-0.5 text-center border-r border-slate-200">-</td>
                                      <td className="py-1 px-1 text-right text-indigo-950 border-r border-slate-200 font-extrabold bg-[#EEF2F6]/60">
                                        {formatNum(row[`${s.id}_total`])}
                                      </td>
                                    </React.Fragment>
                                  ))}
                                  <td className={clsx(
                                    "py-1 px-1 text-right font-extrabold border-r border-slate-200",
                                    row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                                  )}>
                                    {row.variance > 0 ? "+" : ""}{formatNum(row.variance)}
                                  </td>
                                  <td className="py-1 px-2 border-slate-200"></td>
                                </tr>
                              );
                            }

                            // 일반 데이터 행 렌더링 (화면이랑 99.9% 동치)
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/20 text-[9px]">
                                <td className="py-1 px-1 text-center text-slate-500 font-mono border-r border-slate-200 whitespace-nowrap text-[7px] tracking-tighter">{row.no}</td>
                                <td className="py-1 px-2 text-left text-slate-800 font-semibold border-r border-slate-200 leading-snug whitespace-normal" style={{ wordBreak: 'break-all' }}>{row.name}</td>
                                {stages.map((s) => {
                                  const isEmpty = row[`${s.id}_isEmpty`];
                                  return (
                                    <React.Fragment key={s.id}>
                                      <td className="py-1 px-0.5 text-right text-slate-500 font-mono border-r border-slate-200">
                                        {isEmpty ? "" : formatNum(row[`${s.id}_unitArea`])}
                                      </td>
                                      <td className="py-1 px-0.5 text-center text-slate-500 font-mono border-r border-slate-200">
                                        {isEmpty ? "" : formatQty(row[`${s.id}_quantity`])}
                                      </td>
                                      <td className="py-1 px-1 text-right text-slate-700 font-mono font-semibold border-r border-slate-200 bg-slate-50/20">
                                        {isEmpty ? "" : formatNum(row[`${s.id}_total`])}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td className={clsx(
                                  "py-1 px-1 text-right font-mono font-bold border-r border-slate-200",
                                  row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400"
                                )}>
                                  {row.variance !== undefined && row.variance !== 0 ? (
                                    <>
                                      {row.variance > 0 ? "+" : ""}
                                      {formatNum(row.variance)}
                                    </>
                                  ) : "-"}
                                </td>
                                <td className="py-1 px-2 text-left text-slate-600 font-normal leading-snug whitespace-normal border-slate-200" style={{ wordBreak: 'break-all' }}>
                                  {row.note || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 꼬리말 영역 - PPT 슬라이드 최하부 라인 완벽 복제 */}
                    <div className="absolute bottom-2 left-1 right-1">
                      <div className="border-t border-slate-300 w-full mb-2"></div>
                      <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold tracking-wider px-1">
                        <span className="font-extrabold text-[#1E293B] text-[9px]">해안건축</span>
                        <span>STAGE: {currentStage?.name}</span>
                        <span className="text-[11px] font-mono font-semibold text-slate-800 leading-none">
                          {overallPageNum}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              });
            });
          })()}
        </>
      )}
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';
export default PrintableReport;
