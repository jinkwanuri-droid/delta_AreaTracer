import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  AreaChart,
  Area,
  LabelList
} from 'recharts';

// Fixed dimensions for print stability
const DEFAULT_CHART_WIDTH = 800;
const DEFAULT_CHART_HEIGHT = 300;

interface ChartProps {
  data: any[];
  width?: number;
  height?: number;
}

/**
 * 단계별 면적추이 (전용/공용) - Stacked Bar
 */
export const ReportAreaByStageChart: React.FC<ChartProps> = ({ data, width = 800, height = 250 }) => {
  return (
    <div className="flex justify-center bg-white rounded-lg border border-slate-100 p-4">
      <BarChart 
        width={width} 
        height={height} 
        data={data} 
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="name" 
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(val) => Math.round(val).toLocaleString()}
        />
        <Bar 
          dataKey="net" 
          stackId="a" 
          fill="#6366f1" 
          stroke="#ffffff"
          strokeWidth={2}
          name="전용면적" 
          isAnimationActive={false}
          barSize={40}
          radius={[4, 4, 4, 4]}
        >
          <LabelList 
            dataKey="net" 
            position="inside" 
            fill="#ffffff" 
            fontSize={10} 
            fontWeight="bold"
            formatter={(v: number) => v > 0 ? Math.round(v).toLocaleString() : ''}
          />
        </Bar>
        <Bar 
          dataKey="common" 
          stackId="a" 
          fill="#94a3b8" 
          stroke="#ffffff"
          strokeWidth={2}
          name="공용면적" 
          isAnimationActive={false}
          barSize={40}
          radius={[4, 4, 4, 4]}
        >
          <LabelList 
            dataKey="common" 
            position="inside" 
            fill="#ffffff" 
            fontSize={10} 
            fontWeight="bold"
            formatter={(v: number) => v > 0 ? Math.round(v).toLocaleString() : ''}
          />
        </Bar>
        <Bar 
          dataKey="other" 
          stackId="a" 
          fill="#cbd5e1" 
          stroke="#ffffff"
          strokeWidth={2}
          name="의료외(주차/옥외)" 
          isAnimationActive={false}
          barSize={40}
          radius={[4, 4, 4, 4]}
        >
          <LabelList 
            dataKey="other" 
            position="inside" 
            fill="#ffffff" 
            fontSize={10} 
            fontWeight="bold"
            formatter={(v: number) => v > 200 ? Math.round(v).toLocaleString() : ''}
          />
          <LabelList 
            dataKey="gross" 
            position="top" 
            offset={8} 
            fill="#475569" 
            fontSize={11} 
            fontWeight="bold"
            formatter={(v: number) => Math.round(v).toLocaleString()}
          />
        </Bar>
      </BarChart>
    </div>
  );
};

/**
 * 부문별 면적 비중 - Donut Pie
 */
interface PieChartProps extends ChartProps {
  totalNetArea: number;
}

export const ReportDivisionPieChart: React.FC<PieChartProps> = ({ data, totalNetArea, width = 800, height = 350 }) => {
  return (
    <div className="flex justify-center items-center bg-white rounded-lg border border-slate-100 p-4 relative">
      <PieChart width={width} height={height}>
        <Pie
          data={data}
          innerRadius={80}
          outerRadius={130}
          paddingAngle={5}
          dataKey="value"
          isAnimationActive={false}
          label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent }) => {
            const RADIAN = Math.PI / 180;
            const radius = outerRadius + 30;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            const anchor = x > cx ? 'start' : 'end';

            return (
              <text x={x} y={y} fill="#334155" textAnchor={anchor} dominantBaseline="central" fontSize={11} fontWeight="bold">
                {`${name}: ${Math.round(value).toLocaleString()}㎡ (${(percent * 100).toFixed(1)}%)`}
              </text>
            );
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Net</span>
        <span className="text-2xl font-black text-slate-800 tracking-tight">
          {Math.round(totalNetArea).toLocaleString()}
        </span>
        <span className="text-[10px] font-bold text-slate-400">㎡</span>
      </div>
    </div>
  );
};

/**
 * 단계별 부문별 면적 추이 - Stacked Area or Multi-line
 */
interface DivisionTrendProps extends ChartProps {
  divisions: any[];
}

export const ReportDivisionTrendChart: React.FC<DivisionTrendProps> = ({ data, divisions, width = 800, height = 300 }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-4 flex justify-center">
      <AreaChart 
        width={width} 
        height={height} 
        data={data} 
        margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickFormatter={(v) => `${(v/1000).toFixed(1)}k`}
        />
        {divisions.map((div) => (
          <Area
            key={div.id}
            type="monotone"
            dataKey={div.name}
            stroke={div.color}
            fill={div.color}
            fillOpacity={0.15}
            strokeWidth={3}
            isAnimationActive={false}
            name={div.name}
          />
        ))}
      </AreaChart>
    </div>
  );
};
