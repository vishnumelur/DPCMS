'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CountBucket, DayBucket } from '@/lib/reporting/aggregate';

const COLORS = ['#0ea5e9', '#f97316', '#a855f7', '#22c55e', '#ef4444', '#eab308', '#6366f1'];

export function ConsentDonut({ data }: { data: CountBucket[] }) {
  const empty = data.every((d) => d.count === 0);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={empty ? [{ label: 'No data', count: 1 }] : data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            label
          >
            {(empty ? [{ label: 'No data', count: 1 }] : data).map((_, i) => (
              <Cell key={i} fill={empty ? '#cbd5e1' : COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountBarChart({ data, color }: { data: CountBucket[]; color?: string }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>;
  }
  const fill = color ?? COLORS[0]!;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill={fill} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DayLineChart({ data }: { data: DayBucket[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RfpCoverageBar({
  ra,
  ca,
  na,
}: {
  ra: number;
  ca: number;
  na: number;
}) {
  const total = ra + ca + na || 1;
  const pctRa = Math.round((ra * 100) / total);
  const pctCa = Math.round((ca * 100) / total);
  const pctNa = Math.max(0, 100 - pctRa - pctCa);
  return (
    <div className="space-y-2">
      <div className="flex h-6 w-full overflow-hidden rounded border">
        <div
          className="flex items-center justify-center bg-emerald-500 text-xs font-medium text-white"
          style={{ width: `${pctRa}%` }}
          title={`RA ${ra} (${pctRa}%)`}
        >
          {pctRa >= 8 ? `RA ${pctRa}%` : ''}
        </div>
        <div
          className="flex items-center justify-center bg-amber-500 text-xs font-medium text-white"
          style={{ width: `${pctCa}%` }}
          title={`CA ${ca} (${pctCa}%)`}
        >
          {pctCa >= 8 ? `CA ${pctCa}%` : ''}
        </div>
        <div
          className="flex items-center justify-center bg-rose-500 text-xs font-medium text-white"
          style={{ width: `${pctNa}%` }}
          title={`NA ${na} (${pctNa}%)`}
        >
          {pctNa >= 8 ? `NA ${pctNa}%` : ''}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        RA = ready-to-show · CA = customisable · NA = not in POC. Totals: RA {ra}, CA {ca}, NA {na} of {total}.
      </p>
    </div>
  );
}
