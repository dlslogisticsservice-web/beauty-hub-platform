/**
 * AdminRevenueChart — lazy-loaded recharts bar chart.
 *
 * Extracted from src/routes/admin.dashboard.tsx so the 300 kB recharts
 * library is only downloaded when this component is first rendered.
 * Import via React.lazy() — never eagerly.
 *
 * Props: { data: { month: string; revenue: number }[] }
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface AdminRevenueChartProps {
  data: { month: string; revenue: number }[];
}

export function AdminRevenueChart({ data }: AdminRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
          }}
        />
        <Bar
          dataKey="revenue"
          fill="hsl(var(--primary))"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
