import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { clsx } from 'clsx';

// Helper to format numbers with rounding
const formatNum = (num: number | undefined | null, noDecimal: boolean = false) => {
  if (num === undefined || num === null || num === 0) return "-";
  const fractionDigits = noDecimal ? 0 : 2;
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  });
};

// Helper for quantity formatting
const formatQty = (qty: number | undefined | null) => {
  if (qty === undefined || qty === null || qty === 0) return "-";
  if (qty % 1 !== 0) {
    return qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  }
  return qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Helper to get ward count from floor and department
const getWardCount = (floorId: string, deptId: string, floorWardOverrides: Record<string, number>, departments: any[], rooms: any[]) => {
  const override = floorWardOverrides[`${floorId}|${deptId}`];
  if (override !== undefined) return override;

  const dept = departments.find(d => d.id === deptId);
  if (dept && deptId === "101") {
     const rangeMatch = dept.name.match(/(\d+)\s*[~-]\s*(\d+)/);
     if (rangeMatch) {
       const start = parseInt(rangeMatch[1]);
       const end = parseInt(rangeMatch[2]);
       if (!isNaN(start) && !isNaN(end) && end >= start) return end - start + 1;
     }
     
     const roomsInDept = rooms.filter(r => r.departmentId === deptId && (floorId === "all" || r.floorId.toUpperCase().replace(/F$/i, '').trim() === floorId.toUpperCase().replace(/F$/i, '').trim()));
     for (const r of roomsInDept) {
       const match = r.note?.match(/(\d+)\s*개\s*병동/);
       if (match) return parseInt(match[1]);
     }
  }
  return 1;
};

// Pure function to calculate floor printable pages
export function computeFloorPages(
  floor: any,
  rooms: any[],
  departments: any[],
  divisions: any[],
  stages: any[],
  valsMap: Map<string, any>,
  baseId: string | null,
  targetId: string | null,
  rowsPerPage: number = 27
) {
  const floorRooms = rooms.filter(r => r.floorId === floor.id).filter(r => {
    const dept = departments.find(d => d.id === r.departmentId);
    if (!dept) return false;
    return /^(0?[1-5]|[1-5])$/.test(dept.divisionId);
  }).sort((a, b) => {
    const dA = departments.find(d => d.id === a.departmentId)?.order || 999;
    const dB = departments.find(d => d.id === b.departmentId)?.order || 999;
    if (dA !== dB) return dA - dB;
    return a.no.localeCompare(b.no, undefined, { numeric: true });
  });

  const result: any[] = [];
  let currentDeptId: string | null = null;
  let deptRooms: any[] = [];

  const addSummary = (dId: string, roomsOfDept: any[]) => {
    const dept = departments.find(d => d.id === dId);
    const div = divisions.find(v => v.id === dept?.divisionId);
    
    const summary: any = {
      id: `summary-${dId}`,
      isSummary: true,
      deptName: dept?.name || "기타",
      deptColor: div?.color || "#64748b",
      variant: 0
    };

    stages.forEach(s => {
      let total = 0;
      roomsOfDept.forEach(r => {
        const v = valsMap.get(`${r.id}|${s.id}`);
        if (v) total += (v.unitArea || 0) * (v.quantity || 0);
      });
      summary[`${s.id}_total`] = total;
    });
    
    if (baseId && targetId) {
      summary.variance = (summary[`${targetId}_total`] || 0) - (summary[`${baseId}_total`] || 0);
    }

    result.push(summary);
  };

  floorRooms.forEach(room => {
    if (room.departmentId !== currentDeptId) {
      if (currentDeptId !== null) {
        addSummary(currentDeptId, deptRooms);
        result.push({ id: `spacer-${currentDeptId}`, isSpacer: true });
      }
      currentDeptId = room.departmentId;
      deptRooms = [];
      
      const dept = departments.find(d => d.id === currentDeptId);
      const div = divisions.find(v => v.id === dept?.divisionId);
      result.push({
        id: `header-${currentDeptId}`,
        isHeader: true,
        deptName: dept?.name || "기타",
        departmentId: currentDeptId,
        deptColor: div?.color || "#6366f1"
      });
    }
    deptRooms.push(room);
    
    const row: any = { ...room };
    stages.forEach(s => {
      const v = valsMap.get(`${room.id}|${s.id}`);
      row[`${s.id}_unit`] = v?.unitArea || 0;
      row[`${s.id}_qty`] = v?.quantity || 0;
      row[`${s.id}_total`] = (v?.unitArea || 0) * (v?.quantity || 0);
      row[`${s.id}_isEmpty`] = !v;
    });

    if (baseId && targetId) {
      row.variance = (row[`${targetId}_total`] || 0) - (row[`${baseId}_total`] || 0);
    }
    
    result.push(row);
  });

  if (currentDeptId !== null) {
    addSummary(currentDeptId, deptRooms);
  }

  const p: any[][] = [];
  let current: any[] = [];
  let count = 0;
  
  result.forEach((row) => {
    if (count === 0 && row.isSpacer) return;

    if (row.isHeader && count > 0 && rowsPerPage - count < 3) {
      p.push(current);
      current = [];
      count = 0;
    }

    if (count >= rowsPerPage) {
      p.push(current);
      current = [];
      count = 0;
    }
    
    current.push(row);
    count += row.isSpacer ? 0.3 : 1;
  });
  
  if (current.length > 0) {
    p.push(current);
  }
  
  return p;
}

// Pure function to calculate summary printable pages
export function computeSummaryPages(
  divisions: any[],
  departments: any[],
  rooms: any[],
  values: any[],
  stages: any[],
  floorAreasByStage: any,
  summaryNotes: any,
  departmentNotes: any,
  baseStageId: string | null,
  targetStageId: string | null,
  medicalOnly: boolean,
  maxPageRows: number = 28
) {
  if (stages.length < 1) return [];

  const deptMap = new Map();
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

    if (index > 0) {
      rows.push({
        id: `spacer-${div.id}`,
        isSpacer: true
      });
    }

    rows.push({
       id: `header-${div.id}`,
       isHeader: true,
       divisionName: div.name,
       color: div.color
    });

    const divStageTotals: Record<string, number> = {};
    stages.forEach(s => divStageTotals[s.id] = 0);

    divDepts.forEach((deptData) => {
      const targetVal = deptData.stageAreas[targetStageId || ''] || 0;
      const baseVal = deptData.stageAreas[baseStageId || ''] || 0;
      const diff = targetVal - baseVal;

      rows.push({
        ...deptData,
        id: deptData.deptId,
        divisionName: div.name,
        diff,
        divColor: div.color
      });

      stages.forEach(s => {
        divStageTotals[s.id] += deptData.stageAreas[s.id];
        grandStageTotals[s.id] += deptData.stageAreas[s.id];
      });
    });

    const targetDivVal = divStageTotals[targetStageId || ''] || 0;
    const baseDivVal = divStageTotals[baseStageId || ''] || 0;
    
    rows.push({
      id: `subtotal-${div.id}`,
      isSubtotal: true,
      divisionName: div.name,
      department: `${div.name} 소계`,
      stageAreas: divStageTotals,
      diff: targetDivVal - baseDivVal,
      divColor: div.color
    });
  });

  const targetGrandVal = grandStageTotals[targetStageId || ''] || 0;
  const baseGrandVal = grandStageTotals[baseStageId || ''] || 0;

  rows.push({
    id: 'spacer-before-grand-total',
    isSpacer: true
  });

  rows.push({
    id: 'grand-total',
    isGrandTotal: true,
    code: '가',
    department: '의료시설 전용면적 합계',
    stageAreas: grandStageTotals,
    diff: targetGrandVal - baseGrandVal,
  });

  const commonAreaStageTotals: Record<string, number> = {};
  const gnRatioStageTotals: Record<string, number> = {};
  const medAreaSumStageTotals: Record<string, number> = {};
  const garageAreaStageTotals: Record<string, number> = {};
  const medTotalAreaStageTotals: Record<string, number> = {};
  const outdoorAreaStageTotals: Record<string, number> = {};
  const permitAreaStageTotals: Record<string, number> = {};

  stages.forEach(s => {
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
    const gnRatio = netAreaA > 0 ? ((netAreaA + commonAreaB) / netAreaA) : 0;

    commonAreaStageTotals[s.id] = commonAreaB;
    gnRatioStageTotals[s.id] = gnRatio;
    medAreaSumStageTotals[s.id] = netAreaA + commonAreaB;
    garageAreaStageTotals[s.id] = stageGarageArea;
    medTotalAreaStageTotals[s.id] = netAreaA + commonAreaB + stageGarageArea;
    outdoorAreaStageTotals[s.id] = stageOutdoorArea;
    permitAreaStageTotals[s.id] = permitAreaVal;
  });

  const targetSafeId = targetStageId || '';
  const baseSafeId = baseStageId || '';

  rows.push({
    id: 'common-area-sum',
    isSummaryRow: true,
    code: '나',
    department: '공용면적',
    stageAreas: commonAreaStageTotals,
    diff: commonAreaStageTotals[targetSafeId] - commonAreaStageTotals[baseSafeId],
    notes: summaryNotes['common-area-sum'] ?? departmentNotes['common-area-sum'] ?? '[참고 1] 종합병원 적정 공용비/공용면적 검토',
  });

  rows.push({
    id: 'gn-ratio',
    isSummaryRow: true,
    isRatio: true,
    code: '(가+나)/가',
    department: '공용비(G/N비)',
    stageAreas: gnRatioStageTotals,
    diff: gnRatioStageTotals[targetSafeId] - gnRatioStageTotals[baseSafeId],
    notes: summaryNotes['gn-ratio'] ?? departmentNotes['gn-ratio'] ?? '종합병원 평균값 1.50~1.60 사잇값으로 제안',
  });

  rows.push({
    id: 'med-area-sum',
    isSummaryRow: true,
    code: '가+나',
    department: '의료시설 면적',
    stageAreas: medAreaSumStageTotals,
    diff: medAreaSumStageTotals[targetSafeId] - medAreaSumStageTotals[baseSafeId],
    notes: summaryNotes['med-area-sum'] ?? departmentNotes['med-area-sum'] ?? '',
  });

  rows.push({
    id: 'garage-area',
    isSummaryRow: true,
    code: '다',
    department: '옥내 주차공간',
    stageAreas: garageAreaStageTotals,
    diff: garageAreaStageTotals[targetSafeId] - garageAreaStageTotals[baseSafeId],
    notes: summaryNotes['garage-area'] ?? departmentNotes['garage-area'] ?? '주차대수 100대 내외 계획하여 면적 제안',
  });

  rows.push({
    id: 'med-total-area',
    isSummaryRow: true,
    code: '가+나+다',
    department: '의료시설 총면적',
    stageAreas: medTotalAreaStageTotals,
    diff: medTotalAreaStageTotals[targetSafeId] - medTotalAreaStageTotals[baseSafeId],
    notes: summaryNotes['med-total-area'] ?? departmentNotes['med-total-area'] ?? '',
  });

  rows.push({
    id: 'outdoor-area',
    isSummaryRow: true,
    code: '라',
    department: '옥외 공용면적',
    stageAreas: outdoorAreaStageTotals,
    diff: outdoorAreaStageTotals[targetSafeId] - outdoorAreaStageTotals[baseSafeId],
    notes: summaryNotes['outdoor-area'] ?? departmentNotes['outdoor-area'] ?? '-',
  });

  rows.push({
    id: 'permit-area',
    isSummaryRow: true,
    code: '가~라',
    department: '건축허가 면적',
    stageAreas: permitAreaStageTotals,
    diff: permitAreaStageTotals[targetSafeId] - permitAreaStageTotals[baseStageId],
    notes: summaryNotes['permit-area'] ?? '',
  });

  const resultPages: any[][] = [];
  let currentPageRows: any[] = [];
  let currentRowsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.isHeader) {
      let groupRowsCount = 1;
      for (let j = i + 1; j < rows.length; j++) {
        const nextRow = rows[j];
        if (nextRow.isHeader || nextRow.isSpacer || nextRow.isGrandTotal || nextRow.isSummaryRow) {
          break;
        }
        groupRowsCount++;
      }

      const remainingSpace = maxPageRows - currentRowsCount;
      if (groupRowsCount > remainingSpace && remainingSpace < 6) {
        if (currentPageRows.length > 0) {
          resultPages.push(currentPageRows);
          currentPageRows = [];
          currentRowsCount = 0;
        }
      }
    }

    currentPageRows.push(row);
    currentRowsCount += row.isSpacer ? 1.2 : 1;

    if (currentRowsCount >= maxPageRows) {
      resultPages.push(currentPageRows);
      currentPageRows = [];
      currentRowsCount = 0;
    }
  }

  if (currentPageRows.length > 0) {
    resultPages.push(currentPageRows);
  }

  return resultPages;
}

export default function PrintableReport() {
  const { 
    floors, 
    pdfExportTargets,
    divisions, 
    departments, 
    rooms, 
    values, 
    stages: rawStages, 
    visibleStageIds, 
    floorAreasByStage, 
    summaryNotes, 
    departmentNotes, 
    comparison, 
    medicalOnly,
    floorWardOverrides
  } = useAppStore();

  const showSummary = pdfExportTargets?.includes('summary') ?? true;
  const showDetail = pdfExportTargets?.includes('detail') ?? true;

  // 1. Filter and Sort Floors: B1 -> 1F -> 2F ... -> 7F
  const targetFloors = useMemo(() => {
    return floors.filter(f => {
      const name = f.name.toUpperCase().trim();
      // Only B1 and 1F~7F
      if (name === 'B1') return true;
      const numMatch = name.match(/^(\d+)F$/);
      if (numMatch) {
         const num = parseInt(numMatch[1]);
         return num >= 1 && num <= 7;
      }
      return false;
    }).sort((a, b) => {
      const getVal = (n: string) => {
        if (n.startsWith('B')) return -parseInt(n.substring(1));
        return parseInt(n.replace('F', ''));
      };
      return getVal(a.name) - getVal(b.name);
    });
  }, [floors]);

  const stages = useMemo(() => {
    return rawStages.filter(s => visibleStageIds ? visibleStageIds.includes(s.id) : true).sort((a, b) => a.order - b.order);
  }, [rawStages, visibleStageIds]);

  const baseStageId = useMemo(() => {
    if (comparison.baseId && stages.some(s => s.id === comparison.baseId)) {
      return comparison.baseId;
    }
    return stages[0]?.id;
  }, [comparison.baseId, stages]);

  const targetStageId = useMemo(() => {
    if (comparison.targetId && stages.some(s => s.id === comparison.targetId)) {
      return comparison.targetId;
    }
    return stages[stages.length - 1]?.id;
  }, [comparison.targetId, stages]);

  const valsMap = useMemo(() => {
    const map = new Map<string, any>();
    values.forEach(v => map.set(`${v.roomId}|${v.stageId}`, v));
    return map;
  }, [values]);

  const totalPagesInfo = useMemo(() => {
    let currentGlobalPage = 0;
    const info: {
      summaryPages: number,
      floorPageOffsets: Record<string, number>,
      floorPageCounts: Record<string, number>,
      totalPages: number
    } = {
      summaryPages: 0,
      floorPageOffsets: {},
      floorPageCounts: {},
      totalPages: 0
    };

    if (showSummary) {
      const summaryPages = computeSummaryPages(
        divisions,
        departments,
        rooms,
        values,
        stages,
        floorAreasByStage,
        summaryNotes,
        departmentNotes,
        baseStageId,
        targetStageId,
        medicalOnly
      );
      info.summaryPages = summaryPages.length;
      currentGlobalPage += summaryPages.length;
    }

    if (showDetail) {
      targetFloors.forEach(floor => {
        const floorPages = computeFloorPages(
          floor,
          rooms,
          departments,
          divisions,
          stages,
          valsMap,
          baseStageId,
          targetStageId
        );
        info.floorPageOffsets[floor.id] = currentGlobalPage;
        info.floorPageCounts[floor.id] = floorPages.length;
        currentGlobalPage += floorPages.length;
      });
    }

    info.totalPages = currentGlobalPage;
    return info;
  }, [
    showSummary,
    showDetail,
    targetFloors,
    divisions,
    departments,
    rooms,
    values,
    stages,
    floorAreasByStage,
    summaryNotes,
    departmentNotes,
    baseStageId,
    targetStageId,
    medicalOnly,
    valsMap
  ]);

  if (targetFloors.length === 0 && !showSummary) return null;

  return (
    <div className="bg-white text-slate-900 printable-container font-['Arial','Helvetica',sans-serif]">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          html, body, #root {
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          .printable-container {
             width: 100%;
             max-width: none;
             padding: 0;
             margin: 0;
          }
          .print-page {
             page-break-after: always;
             page-break-inside: avoid;
          }
          .print-page:last-child {
             page-break-after: auto;
          }
        }
        .empty-hatch {
          background-color: #fafbfd !important;
          background-image: repeating-linear-gradient(45deg, #e2e8f0 0, #e2e8f0 0.4px, transparent 0.4px, transparent 2.5px) !important;
        }

        /* 테이블 폰트 및 행 패딩 강력 제어 (Tailwind/글로벌 스타일 오버라이드) */
        .print-page table {
          border-collapse: separate !important;
          font-family: 'Arial', sans-serif !important;
        }
        .print-page table th {
          font-size: 7.5pt !important;
          padding-top: 1.0mm !important;
          padding-bottom: 1.0mm !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
        }
        .print-page table td {
          font-size: 7.5pt !important;
          padding-top: 1.0mm !important;
          padding-bottom: 1.0mm !important;
          line-height: 1.15 !important;
        }
        
        /* 실번호 열 세밀 축소 */
        .print-page table td.col-no {
          font-size: 7.5pt !important;
          color: #94a3b8 !important;
          font-family: 'Arial Narrow', sans-serif !important;
          letter-spacing: -0.25pt !important;
        }
        /* Net, Qty, Total 데이터 열 */
        .print-page table td.col-net {
          font-size: 7.5pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-qty {
          font-size: 7.5pt !important;
          font-weight: 400 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        .print-page table td.col-total {
          font-size: 7.5pt !important;
          font-weight: 700 !important;
          letter-spacing: -0.2pt !important;
          font-family: 'Arial Narrow', sans-serif !important;
        }
        /* 현재 단계(실시설계)의 옅은 퍼플톤 강력 제어 */
        .print-current-bg-light {
          background-color: #F5F3FF !important; /* 아주 옅은 보라 (purple-50) */
        }
        .print-current-bg-medium {
          background-color: #EDE9FE !important; /* 옅은 보라 (purple-100) */
        }
        .print-current-text-dark {
          color: #4C1D95 !important; /* 진보라 (purple-900) */
        }
        .print-current-text-medium {
          color: #6D28D9 !important; /* 중간 보라 (purple-700) */
        }

        /* 비고란 (실명과 동일한 폰트 패밀리 적용 및 조금 더 짙은 회색) */
        .print-page table td.col-note {
          font-size: 6.5pt !important;
          color: #334155 !important; /* 더 짙은 회색 (slate-700) */
          line-height: 1.05 !important;
          letter-spacing: -0.04em !important; /* 한글 좁은 폭(narrow) 느낌을 위한 자간 압축 */
          font-weight: 400 !important; /* 리더빌리티 상향 */
          font-family: 'Arial', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', 'Dotum', sans-serif !important; /* 성명(실명)과 일관된 폰트 패밀리 */
        }

        /* 전반적으로 테이블의 셀 테두리를 지금의 70% 수준으로 얇게 조절 (0.7px) */
        .print-page table th,
        .print-page table td {
          border-color: #cbd5e1 !important;
          border-style: solid !important;
        }
        .print-page .border-y { border-top-width: 0.7px !important; border-bottom-width: 0.7px !important; }
        .print-page .border-b { border-bottom-width: 0.7px !important; }
        .print-page .border-t { border-top-width: 0.7px !important; }
        .print-page .border-r { border-right-width: 0.7px !important; }
        .print-page .border-l { border-left-width: 0.7px !important; }
        .print-page .border { border-width: 0.7px !important; }
      `}</style>
      
      {showSummary && (
        <SummaryPrintTable 
          pageOffset={0} 
          globalTotalPages={totalPagesInfo.totalPages} 
        />
      )}
      {showDetail && targetFloors.map((floor) => (
        <FloorTable 
          key={floor.id} 
          floor={floor} 
          pageOffset={totalPagesInfo.floorPageOffsets[floor.id] || 0}
          globalTotalPages={totalPagesInfo.totalPages}
        />
      ))}
    </div>
  );
}

function FloorTable({ 
  floor, 
  pageOffset, 
  globalTotalPages 
}: { 
  floor: any; 
  pageOffset: number; 
  globalTotalPages: number; 
 }) {
  const { rooms, departments, stages: rawStages, visibleStageIds, values, comparison, divisions, floorWardOverrides } = useAppStore();

  const stages = useMemo(() => {
    return rawStages.filter(s => visibleStageIds ? visibleStageIds.includes(s.id) : true).sort((a, b) => a.order - b.order);
  }, [rawStages, visibleStageIds]);

  const baseId = useMemo(() => {
    if (comparison.baseId && stages.some(s => s.id === comparison.baseId)) {
      return comparison.baseId;
    }
    return stages[0]?.id;
  }, [comparison.baseId, stages]);

  const targetId = useMemo(() => {
    if (comparison.targetId && stages.some(s => s.id === comparison.targetId)) {
      return comparison.targetId;
    }
    return stages[stages.length - 1]?.id;
  }, [comparison.targetId, stages]);

  const valsMap = useMemo(() => {
    const map = new Map<string, any>();
    values.forEach(v => map.set(`${v.roomId}|${v.stageId}`, v));
    return map;
  }, [values]);

  const pages = useMemo(() => {
    return computeFloorPages(
      floor,
      rooms,
      departments,
      divisions,
      stages,
      valsMap,
      baseId,
      targetId
    );
  }, [floor, rooms, departments, divisions, stages, valsMap, baseId, targetId]);

  const floorTitle = floor.name.startsWith('B') ? `지하 ${floor.name.substring(1)}층` : `지상 ${floor.name.replace('F', '')}층`;

  return (
    <>
      {pages.map((pageRows, pageIdx) => (
        <div key={`${floor.id}-p${pageIdx}`} className="print-page w-full flex flex-col" style={{ minHeight: '178mm', boxSizing: 'border-box' }}>
          <div className="flex-1">
            <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2" style={{ height: '15mm' }}>
              <div>
                <h2 className="text-[28px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
                  <span>{floorTitle} 세부 면적계획</span>
                  <span className="text-[14px] font-normal text-slate-500 mb-[2px]">({pageIdx + 1}/{pages.length})</span>
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1 text-right pb-0.5">
                <span className="text-[9px] font-bold text-slate-600 leading-none">
                  경상남도 서부의료원 건립사업 실시설계
                </span>
                <span className="text-[8.5px] font-extrabold text-white bg-purple-600 px-2.5 py-1 rounded-full inline-block leading-none tracking-tight">
                  층별 세부 면적계획
                </span>
              </div>
            </div>

            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: '50px' }} />
                <col style={{ width: '170px' }} />
                {stages.map(s => (
                  <React.Fragment key={`${s.id}-col`}>
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '20px' }} />
                    <col style={{ width: '50px' }} />
                  </React.Fragment>
                ))}
                <col style={{ width: '50px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="bg-[#E2E8F0] border-y border-r border-l border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>NO</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-left font-bold text-[#334155]" rowSpan={2}>실 명칭</th>
                  {stages.map(s => {
                    const isCurrent = s.id === targetId;
                    return (
                      <th 
                        key={s.id} 
                        className={clsx(
                          "border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold", 
                          isCurrent ? "print-current-bg-medium print-current-text-dark font-extrabold" : "bg-[#E2E8F0] text-[#334155]"
                        )} 
                        colSpan={3}
                      >
                        {s.name}
                      </th>
                    );
                  })}
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>
                    증감<br/>
                    <span className="text-[7px] leading-tight font-medium text-slate-500">
                      {targetId && baseId && stages.find(s => s.id === targetId)?.name && stages.find(s => s.id === baseId)?.name ? 
                        `(${stages.find(s => s.id === targetId)!.name[0]}-${stages.find(s => s.id === baseId)!.name[0]})` : ''}
                    </span>
                  </th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]" rowSpan={2}>비고</th>
                </tr>
                <tr>
                  {stages.map(s => {
                    const isCurrent = s.id === targetId;
                    return (
                      <React.Fragment key={`${s.id}-sub`}>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-net", isCurrent ? "print-current-bg-light print-current-text-medium" : "bg-[#E2E8F0] text-slate-500")}>Net</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-medium col-qty", isCurrent ? "print-current-bg-light print-current-text-medium" : "bg-[#E2E8F0] text-slate-500")}>Qty</th>
                        <th className={clsx("border-b border-r border-[#CBD5E1] py-0.5 px-0.5 text-center font-bold col-total", isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-[#E2E8F0] text-slate-900")}>Total</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {pageRows.map((row: any, i: number) => {
                  if (row.isSpacer) {
                    return (
                      <tr key={`${row.id}-${i}`}>
                        <td colSpan={4 + stages.length * 3} className="h-2"></td>
                      </tr>
                    );
                  }
                  if (row.isHeader) {
                     const wardCount = row.departmentId === "101" ? getWardCount(floor.id, "101", floorWardOverrides, departments, rooms) : 1;
                     return (
                       <tr key={`${row.id}-${i}`} className="bg-slate-100/30">
                         <td 
                           colSpan={4 + stages.length * 3} 
                           className="border-t-[1.4px] border-t-slate-500 border-b border-l border-r border-[#CBD5E1] py-0.5 px-2 font-bold text-slate-900"
                         >
                           <div className="flex items-center gap-1.5">
                             <div className="w-[3px] h-[10px] rounded-full" style={{ backgroundColor: row.deptColor }}></div>
                             <span>{row.deptName}</span>
                             {row.departmentId === "101" && (
                               <span className="text-[9px] text-indigo-700 font-extrabold italic tracking-tight ml-2">
                                 ({wardCount}개 병동으로 구성)
                               </span>
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                  }
                  if (row.isSummary) {
                    return (
                      <tr key={`${row.id}-${i}`} className="bg-slate-50 font-bold">
                        <td className="border-b border-l border-slate-300 py-0.5 px-1 text-center text-slate-400"></td>
                        <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div style={{
                            whiteSpace: 'nowrap',
                            lineHeight: '1.1',
                          }}>
                            [{row.deptName} 소계]
                          </div>
                        </td>
                        {stages.map(s => {
                          const isCurrent = s.id === targetId;
                          return (
                            <React.Fragment key={s.id}>
                              <td className={clsx("border-b border-r border-slate-300 py-0.5 px-0.5 text-right text-slate-400 col-net", isCurrent && "print-current-bg-light")}></td>
                              <td className={clsx("border-b border-r border-slate-300 py-[0.5mm] px-0.5 text-center text-slate-400 col-qty", isCurrent && "print-current-bg-light")}></td>
                              <td className={clsx(
                                "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                                isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-indigo-50/50 text-[#312E81]"
                              )}>
                                {row[`${s.id}_total`] === 0 ? '' : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={clsx(
                          "border-b border-r border-slate-300 py-0.5 px-1 font-inter font-bold text-right col-total",
                          row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400 font-normal"
                        )}>
                          {row.variance === 0 ? "0.00" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                        </td>
                        <td className="border-b border-r border-slate-300 py-0.5 px-1 text-center text-slate-400 col-note"></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`${row.id}-${i}`}>
                      <td className="border-b border-l border-slate-300 py-0.5 px-0.5 text-center text-slate-400 font-mono col-no">{row.no}</td>
                      <td className="border-b border-l border-r border-slate-300 py-0.5 px-1 text-left font-medium text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{
                          whiteSpace: 'nowrap',
                          lineHeight: '1.1',
                        }}>
                          {row.name}
                        </div>
                      </td>
                      {stages.map(s => {
                        const isEmpty = row[`${s.id}_isEmpty`];
                        const isCurrent = s.id === targetId;
                        return (
                          <React.Fragment key={s.id}>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter col-net",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-light print-current-text-dark font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_unit`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-center font-inter col-qty",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-light print-current-text-dark font-medium" : "text-slate-500")
                            )}>
                               {isEmpty ? "" : formatQty(row[`${s.id}_qty`])}
                            </td>
                            <td className={clsx(
                              "border-b border-r border-slate-300 py-0.5 px-0.5 text-right font-inter font-bold col-total",
                              isEmpty ? "empty-hatch" : (isCurrent ? "print-current-bg-medium print-current-text-dark" : "bg-slate-100/60 text-slate-900")
                            )}>
                               {isEmpty ? "" : formatNum(row[`${s.id}_total`], s.name === '공모지침' || s.name?.includes('공모'))}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={clsx(
                        "border-b border-r border-slate-300 py-0.5 px-1 text-right font-inter font-bold col-total",
                        row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-500" : "text-slate-400 font-normal"
                      )}>
                        {row.variance === 0 ? "0.00" : (row.variance > 0 ? "+" : "") + formatNum(row.variance)}
                      </td>
                      <td className="border-b border-r border-slate-300 py-0.5 px-1 text-left col-note leading-tight" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{
                          whiteSpace: 'nowrap',
                          lineHeight: '1.1',
                        }}>
                          {row.note || ''}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Component fixed at the bottom of the page */}
          <div className="mt-auto flex-none border-t border-slate-400 pt-1.5 flex justify-between items-start text-slate-500 font-medium font-sans">
            <div className="text-[10px] font-semibold text-slate-600">경상남도청 | 해안건축</div>
            <div className="text-[10px] font-semibold text-slate-600">{pageOffset + pageIdx + 1} / {globalTotalPages}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function SummaryPrintTable({
  pageOffset,
  globalTotalPages
}: {
  pageOffset: number;
  globalTotalPages: number;
}) {
  const { divisions, departments, rooms, values, stages: rawStages, visibleStageIds, floorAreasByStage, summaryNotes, departmentNotes, comparison, medicalOnly } = useAppStore();

  const stages = useMemo(() => {
    return rawStages.filter(s => visibleStageIds ? visibleStageIds.includes(s.id) : true).sort((a, b) => a.order - b.order);
  }, [rawStages, visibleStageIds]);

  const baseStageId = useMemo(() => {
    if (comparison.baseId && stages.some(s => s.id === comparison.baseId)) {
      return comparison.baseId;
    }
    return stages[0]?.id;
  }, [comparison.baseId, stages]);

  const targetStageId = useMemo(() => {
    if (comparison.targetId && stages.some(s => s.id === comparison.targetId)) {
      return comparison.targetId;
    }
    return stages[stages.length - 1]?.id;
  }, [comparison.targetId, stages]);

  const formatNum = (val: number | undefined | null, isRatio = false, stageId?: string) => {
    if (val === undefined || val === null || isNaN(val)) {
      return "-";
    }
    
    const checkVal = isRatio ? Number(val.toFixed(4)) : Number(val.toFixed(2));
    if (checkVal === 0) {
      if (isRatio) return "-";
      return "0";
    }
    
    if (isRatio) return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const stage = stages.find(s => s.id === stageId);
    if (stage?.code === 'A') {
      return Math.round(val).toLocaleString('ko-KR');
    }

    return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pages = useMemo(() => {
    const rawPages = computeSummaryPages(
      divisions,
      departments,
      rooms,
      values,
      stages,
      floorAreasByStage,
      summaryNotes,
      departmentNotes,
      baseStageId,
      targetStageId,
      medicalOnly
    );
    return rawPages.map((rows, idx, arr) => ({
      pageIdx: idx,
      total: arr.length,
      rows
    }));
  }, [divisions, departments, rooms, values, stages, floorAreasByStage, summaryNotes, departmentNotes, baseStageId, targetStageId, medicalOnly]);

  const renderRow = (row: any, idx: number) => {
    if (row.isSpacer) {
      return (
        <tr key={row.id}>
          <td colSpan={4 + stages.length} className="border-b border-l border-r border-[#CBD5E1] py-[0.41mm] bg-white" style={{ height: '3.2mm' }}></td>
        </tr>
      );
    }

    if (row.isHeader) {
      return (
        <tr key={`${row.id}-${idx}`} className="bg-slate-100/30">
          <td colSpan={4 + stages.length} className="border-t border-b border-l border-r border-[#CBD5E1] py-[0.41mm] px-2 font-bold text-slate-900">
            <div className="flex items-center gap-1.5">
              <div className="w-[3px] h-[10px] rounded-full" style={{ backgroundColor: row.color }}></div>
              {row.divisionName}
            </div>
          </td>
        </tr>
      );
    }

    const isGrand = row.isGrandTotal;
    const isSub = row.isSubtotal;
    const isSumRow = row.isSummaryRow;

    const rowClass = clsx(
      isGrand && "bg-slate-100 font-bold",
      isSub && "bg-slate-50 font-bold",
      isSumRow && (row.id === 'med-total-area' || row.id === 'permit-area' ? "bg-slate-100 font-extrabold" : "bg-white text-slate-700")
    );

    return (
      <tr key={`${row.id}-${idx}`} className={rowClass}>
        {/* Code */}
        <td className={clsx(
          "border-b border-l border-slate-300 py-[0.41mm] px-1 text-center text-slate-500",
          (isGrand || isSumRow) && "text-slate-900 font-bold"
        )} style={{ fontFamily: "'Arial Narrow', sans-serif", letterSpacing: '-0.2pt' }}>
          {row.code || ''}
        </td>
        
        {/* Department Name */}
        <td className="border-b border-l border-r border-slate-300 py-[0.41mm] px-1.5 text-left font-medium text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <div className="flex items-center gap-1.5" style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <span className="truncate">{row.department}</span>
          </div>
        </td>

        {/* Stage values */}
        {stages.map(s => {
          const isCurStage = s.id === targetStageId;
          const val = row.stageAreas?.[s.id];
          return (
            <td 
              key={s.id} 
              className={clsx(
                "border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-right",
                isCurStage && "print-current-bg-light font-bold"
              )}
              style={{ 
                fontWeight: (isGrand || isSub || isSumRow) ? 'bold' : 'normal',
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: '-0.2pt'
              }}
            >
              {formatNum(val, row.isRatio, s.id)}
            </td>
          );
        })}

        {/* Diff (Variance) */}
        <td 
          className={clsx(
            "border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-right font-bold",
            row.diff > 0 ? "text-blue-600" : row.diff < 0 ? "text-red-500" : "text-slate-400 font-normal"
          )}
          style={{ 
            fontFamily: "'Arial Narrow', sans-serif", 
            letterSpacing: '-0.2pt' 
          }}
        >
          {row.diff === 0 ? "0.00" : (row.diff > 0 ? "+" : "") + formatNum(row.diff, row.isRatio)}
        </td>

        {/* Notes */}
        <td className="border-b border-r border-slate-300 py-[0.41mm] px-1.5 text-left col-note leading-tight" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div className="truncate" title={row.notes || ''}>
            {row.notes || ''}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      {pages.map((page) => (
        <div key={`summary-page-${page.pageIdx}`} className="print-page w-full flex flex-col" style={{ minHeight: '178mm', boxSizing: 'border-box' }}>
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-end justify-between border-b-2 border-slate-950 pb-1 mb-2.5" style={{ height: '14mm' }}>
              <div>
                <h2 className="text-[28px] leading-none font-bold tracking-tight text-slate-950 flex items-end gap-2">
                  <span>부서별 총괄 면적표</span>
                  <span className="text-[14px] font-normal text-slate-500 mb-[2px]">({page.pageIdx + 1}/{page.total})</span>
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1 text-right pb-0.5">
                <span className="text-[9px] font-bold text-slate-600 leading-none">
                  경상남도 서부의료원 건립사업 실시설계
                </span>
                <span className="text-[8.5px] font-extrabold text-white bg-purple-600 px-2.5 py-1 rounded-full inline-block leading-none tracking-tight">
                  부서별 총괄 면적표
                </span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col style={{ width: '65px' }} />
                <col style={{ width: '170px' }} />
                {stages.map(s => (
                  <col key={s.id} style={{ width: '70px' }} />
                ))}
                <col style={{ width: '70px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="bg-[#E2E8F0] border-y border-r border-l border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">코드</th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-left font-bold text-[#334155]" style={{ paddingLeft: '6px' }}>부서명</th>
                  {stages.map(s => (
                    <th 
                      key={s.id} 
                      className={clsx(
                        "border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold",
                        s.id === targetStageId ? "print-current-bg-medium print-current-text-dark font-extrabold" : "bg-[#E2E8F0] text-[#334155]"
                      )}
                    >
                      {s.name}
                    </th>
                  ))}
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">
                    증감<br/>
                    <span className="text-[7px] leading-tight font-medium text-slate-500">
                      {targetStageId && baseStageId && stages.find(s => s.id === targetStageId)?.name && stages.find(s => s.id === baseStageId)?.name ? 
                        `(${stages.find(s => s.id === targetStageId)!.name[0]}-${stages.find(s => s.id === baseStageId)!.name[0]})` : ''}
                    </span>
                  </th>
                  <th className="bg-[#E2E8F0] border-y border-r border-[#CBD5E1] py-0.5 px-1 text-center font-bold text-[#334155]">주요 변경사항 및 비고</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {page.rows.map((row: any, i: number) => renderRow(row, i))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-auto flex-none border-t border-slate-400 pt-1.5 flex justify-between items-start text-slate-500 font-medium font-sans">
            <div className="text-[10px] font-semibold text-slate-600">경상남도청 | 해안건축</div>
            <div className="text-[10px] font-semibold text-slate-600">{pageOffset + page.pageIdx + 1} / {globalTotalPages}</div>
          </div>
        </div>
      ))}
    </>
  );
}
