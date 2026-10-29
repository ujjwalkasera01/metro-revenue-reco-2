import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, IndianRupee, Hourglass, Ticket as TicketIcon, Percent, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@project/components/ui/button';
import { KpiCard, PageHeader, SectionCard, TicketStatusBadge } from '../components/common';
import { C, FilterSelect, LineSelect, StationSelect, chartTooltip } from '../components/filters';
import { OPEN_STATUSES, useStore } from '../lib/store';
import { LINES, TODAY, addDays } from '../lib/mockData';
import { inr, inrCompact } from '../lib/format';
import RoleFocus from '../components/RoleFocus';

export default function Dashboard() {
  const { records, tickets, stations, session, me, stationById } = useStore();
  const nav = useNavigate();
  const isStation = session?.role === 'Station Team';
  const [range, setRange] = useState('30');
  const [line, setLine] = useState('all');
  const [station, setStation] = useState(isStation ? 'S01' : 'all');
  const [status, setStatus] = useState('all');

  const from = addDays(TODAY, -Number(range));
  const filtered = useMemo(() => records.filter((r) => {
    const st = stationById(r.stationId);
    return r.date >= from && (line === 'all' || st.lineId === line) && (station === 'all' || r.stationId === station) && (status === 'all' || r.status === status);
  }), [records, from, line, station, status, stationById]);
  const tks = tickets.filter((t) => t.date >= from && (line === 'all' || t.lineId === line) && (station === 'all' || t.stationId === station));

  const total = filtered.reduce((s, r) => s + r.expected, 0);
  const reconciled = filtered.filter((r) => r.status === 'Reconciled').reduce((s, r) => s + r.expected, 0);
  const pending = total - reconciled;
  const discAmt = filtered.filter((r) => r.status === 'Discrepancy').reduce((s, r) => s + Math.abs(r.variance), 0);
  const open = tks.filter((t) => OPEN_STATUSES.includes(t.status));
  const resolved = tks.filter((t) => !OPEN_STATUSES.includes(t.status));
  const rate = tks.length ? (resolved.length / tks.length) * 100 : 100;
  const avgRes = resolved.length
    ? resolved.reduce((s, t) => s + (new Date(t.history[t.history.length - 1].at).getTime() - new Date(t.createdAt).getTime()), 0) / resolved.length / 3600000
    : 0;

  const byDate = useMemo(() => {
    const m = new Map<string, { date: string; afc: number; station: number; disc: number; count: number }>();
    for (const r of filtered) {
      const e = m.get(r.date) ?? { date: r.date, afc: 0, station: 0, disc: 0, count: 0 };
      e.afc += r.expected; e.station += r.reported;
      if (r.status === 'Discrepancy') { e.disc += Math.abs(r.variance); e.count++; }
      m.set(r.date, e);
    }
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ ...e, label: format(new Date(e.date), 'dd MMM') }));
  }, [filtered]);

  const byStation = stations.map((s) => {
    const rs = filtered.filter((r) => r.stationId === s.id);
    return { name: s.code, full: s.name, revenue: rs.reduce((a, r) => a + r.expected, 0), variance: rs.reduce((a, r) => a + Math.abs(r.variance), 0) };
  }).filter((s) => s.revenue > 0);

  const byLine = LINES.map((l) => ({ name: l.name, value: filtered.filter((r) => stationById(r.stationId).lineId === l.id).reduce((a, r) => a + r.expected, 0) }));

  return (
    <div>
      <PageHeader
        title={`Good afternoon, ${me?.name.split(' ')[0]}`}
        subtitle={`${session?.role} dashboard · Revenue reconciliation overview`}
        actions={
          <>
            <FilterSelect value={range} onChange={setRange} className="w-[130px]" options={[{ value: '7', label: 'Last 7 days' }, { value: '14', label: 'Last 14 days' }, { value: '30', label: 'Last 30 days' }, { value: '60', label: 'Last 60 days' }]} />
            {!isStation && <LineSelect value={line} onChange={(v) => { setLine(v); setStation('all'); }} />}
            {!isStation && <StationSelect value={station} onChange={setStation} line={line} />}
            <FilterSelect value={status} onChange={setStatus} className="w-[140px]" options={[{ value: 'all', label: 'All statuses' }, { value: 'Reconciled', label: 'Reconciled' }, { value: 'Discrepancy', label: 'Discrepancy' }, { value: 'Pending', label: 'Pending' }]} />
          </>
        }
      />

      <RoleFocus />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total revenue" value={inrCompact(total)} icon={IndianRupee} delta={4.2} hint="vs prev." />
        <KpiCard label="Reconciled" value={inrCompact(reconciled)} icon={CheckCircle2} tone="success" hint={`${total ? ((reconciled / total) * 100).toFixed(1) : 0}% of total`} />
        <KpiCard label="Pending recon." value={inrCompact(pending)} icon={Hourglass} tone="warning" />
        <KpiCard label="Discrepancy" value={inrCompact(discAmt)} icon={AlertTriangle} tone="danger" delta={-2.1} />
        <KpiCard label="Open tickets" value={open.length} icon={TicketIcon} tone="danger" hint={`${tks.length} total`} />
        <KpiCard label="Resolution rate" value={`${rate.toFixed(1)}%`} icon={Percent} tone="success" />
        <KpiCard label="Avg resolution" value={`${avgRes.toFixed(1)} h`} icon={Clock} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard title="Revenue trend — AFC vs Station reported" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={byDate}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.c1} stopOpacity={0.25} /><stop offset="100%" stopColor={C.c1} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={C.muted} />
                <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11 }} stroke={C.muted} width={70} />
                <Tooltip {...chartTooltip} formatter={(v: number) => inr(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="afc" name="AFC expected" stroke={C.c1} fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="station" name="Station reported" stroke={C.c2} fill="none" strokeDasharray="4 3" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Line-wise performance">
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byLine} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  <Cell fill={C.c1} /><Cell fill={C.c3} />
                </Pie>
                <Tooltip {...chartTooltip} formatter={(v: number) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {byLine.map((l, i) => (
              <div key={l.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: i ? C.c3 : C.c1 }} />{l.name}</span>
                <span className="num font-medium">{inrCompact(l.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SectionCard title="Station-wise revenue comparison">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byStation}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={C.muted} />
                <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11 }} stroke={C.muted} width={70} />
                <Tooltip {...chartTooltip} formatter={(v: number) => inr(v)} labelFormatter={(l, p) => p?.[0]?.payload.full ?? l} />
                <Bar dataKey="revenue" name="Revenue" fill={C.c1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Discrepancy trend">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={C.muted} />
                <YAxis yAxisId="a" tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11 }} stroke={C.muted} width={70} />
                <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 11 }} stroke={C.muted} allowDecimals={false} />
                <Tooltip {...chartTooltip} formatter={(v: number, n) => (n === 'Flagged stations' ? v : inr(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="a" type="monotone" dataKey="disc" name="Discrepancy amount" stroke={C.c5} strokeWidth={2} dot={false} />
                <Line yAxisId="b" type="stepAfter" dataKey="count" name="Flagged stations" stroke={C.c4} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="mt-4" title="Recent open tickets" action={<Button variant="ghost" size="sm" onClick={() => nav('/tickets')}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}>
        <div className="divide-y">
          {open.slice(0, 6).map((t) => (
            <button key={t.id} onClick={() => nav(`/tickets/${t.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:bg-muted/50">
              <span className="num w-20 font-semibold text-primary">{t.id}</span>
              <span className="flex-1 truncate">{stationById(t.stationId).name}</span>
              <span className="num w-28 text-right text-destructive">{inr(t.amount)}</span>
              <span className="hidden w-36 sm:block"><TicketStatusBadge status={t.status} /></span>
            </button>
          ))}
          {open.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No open tickets for this filter.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
