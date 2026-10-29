import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock, PhoneCall, ShieldAlert, Target, Timer } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { KpiCard, PageHeader, SectionCard } from '../components/common';
import { C, chartTooltip } from '../components/filters';
import { OPEN_STATUSES, useStore } from '../lib/store';
import { INTERNAL_OWNERS, TODAY } from '../lib/mockData';
import { fmtDur } from '../lib/format';

type P = 'daily' | 'weekly' | 'monthly';

export default function Analytics() {
  const { comms, tickets, stations } = useStore();
  const [p, setP] = useState<P>('weekly');
  const calls = comms.filter((c) => c.type === 'call-out');
  const ok = calls.filter((c) => c.outcome && !['No answer', 'Callback requested'].includes(c.outcome));
  const success = calls.length ? (ok.length / calls.length) * 100 : 0;
  const closed = tickets.filter((t) => !OPEN_STATUSES.includes(t.status));
  const fcr = closed.length ? (closed.filter((t) => t.attempts <= 1).length / closed.length) * 100 : 0;
  const aht = ok.length ? ok.reduce((a, c) => a + (c.durationSec ?? 0), 0) / ok.length : 0;
  const esc = tickets.length ? (tickets.filter((t) => t.history.some((h) => h.status === 'Escalated')).length / tickets.length) * 100 : 0;
  const slaOk = closed.length ? (closed.filter((t) => new Date(t.history[t.history.length - 1].at) <= new Date(t.slaDueAt)).length / closed.length) * 100 : 0;
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));

  const trend = useMemo(() => {
    const key = (d: string) => p === 'daily' ? d.slice(0, 10) : p === 'weekly' ? format(startOfWeek(new Date(d), { weekStartsOn: 1 }), 'yyyy-MM-dd') : d.slice(0, 7);
    const m = new Map<string, { k: string; calls: number; success: number; tickets: number; resolved: number }>();
    const get = (k: string) => m.get(k) ?? m.set(k, { k, calls: 0, success: 0, tickets: 0, resolved: 0 }).get(k)!;
    calls.forEach((c) => { const e = get(key(c.at)); e.calls++; if (ok.includes(c)) e.success++; });
    tickets.forEach((t) => { const e = get(key(t.createdAt)); e.tickets++; if (!OPEN_STATUSES.includes(t.status)) e.resolved++; });
    const arr = [...m.values()].sort((a, b) => a.k.localeCompare(b.k));
    const sliced = p === 'daily' ? arr.slice(-21) : arr;
    return sliced.map((e) => ({ ...e, label: p === 'monthly' ? format(new Date(e.k + '-01'), 'MMM yy') : format(new Date(e.k), 'dd MMM'), rate: e.calls ? Math.round((e.success / e.calls) * 100) : 0 }));
  }, [p, calls, ok, tickets]);

  const aging = [
    ['0–1 d', 0, 1], ['1–3 d', 1, 3], ['3–7 d', 3, 7], ['7–14 d', 7, 14], ['14+ d', 14, 999],
  ].map(([l, a, b]) => ({ bucket: l as string, count: open.filter((t) => { const d = (new Date(TODAY).getTime() - new Date(t.createdAt).getTime()) / 86400000; return d >= (a as number) && d < (b as number); }).length }));

  const byStation = stations.map((s) => {
    const ts = tickets.filter((t) => t.stationId === s.id);
    return { name: s.code, open: ts.filter((t) => OPEN_STATUSES.includes(t.status)).length, resolved: ts.filter((t) => !OPEN_STATUSES.includes(t.status)).length };
  });

  const agents = [...INTERNAL_OWNERS.map((o) => ({ name: o, kind: 'Human' })), { name: 'AI Agent (Aria)', kind: 'AI' }].map((a) => {
    const ts = a.kind === 'AI' ? tickets.filter((t) => t.attempts > 0) : tickets.filter((t) => t.owner === a.name);
    const res = ts.filter((t) => !OPEN_STATUSES.includes(t.status));
    return { ...a, handled: ts.length, resolved: res.length, rate: ts.length ? (res.length / ts.length) * 100 : 0, avgH: res.length ? res.reduce((x, t) => x + (new Date(t.history[t.history.length - 1].at).getTime() - new Date(t.createdAt).getTime()) / 3600000, 0) / res.length : 0 };
  });

  return (
    <div>
      <PageHeader title="Monitoring & Analytics" subtitle="AI agent effectiveness, ticket lifecycle and SLA performance"
        actions={<Tabs value={p} onValueChange={(v) => setP(v as P)}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="AI call success" value={`${success.toFixed(1)}%`} icon={PhoneCall} tone="success" delta={3.4} />
        <KpiCard label="First-contact res." value={`${fcr.toFixed(1)}%`} icon={Target} />
        <KpiCard label="Avg handling time" value={fmtDur(Math.round(aht))} icon={Timer} />
        <KpiCard label="Escalation rate" value={`${esc.toFixed(1)}%`} icon={ShieldAlert} tone="warning" delta={-1.2} />
        <KpiCard label="SLA compliance" value={`${slaOk.toFixed(1)}%`} icon={CheckCircle2} tone="success" />
        <KpiCard label="Open > 3 days" value={aging.slice(2).reduce((a, b) => a + b.count, 0)} icon={Clock} tone="danger" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SectionCard title={`AI calls & success rate (${p})`}>
          <div className="h-64"><ResponsiveContainer><BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={C.muted} /><YAxis tick={{ fontSize: 11 }} stroke={C.muted} allowDecimals={false} />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="calls" name="Calls" fill={C.c2} radius={[3, 3, 0, 0]} /><Bar dataKey="success" name="Successful" fill={C.c1} radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title={`Tickets created vs resolved (${p})`}>
          <div className="h-64"><ResponsiveContainer><LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={C.muted} /><YAxis tick={{ fontSize: 11 }} stroke={C.muted} allowDecimals={false} />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="tickets" name="Created" stroke={C.c5} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="resolved" name="Resolved" stroke={C.c3} strokeWidth={2} dot={false} />
          </LineChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Open ticket aging">
          <div className="h-56"><ResponsiveContainer><BarChart data={aging}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} /><XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke={C.muted} /><YAxis tick={{ fontSize: 11 }} stroke={C.muted} allowDecimals={false} />
            <Tooltip {...chartTooltip} /><Bar dataKey="count" name="Tickets" fill={C.c4} radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Station comparison — tickets">
          <div className="h-56"><ResponsiveContainer><BarChart data={byStation}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={C.muted} /><YAxis tick={{ fontSize: 11 }} stroke={C.muted} allowDecimals={false} />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="resolved" stackId="a" name="Resolved" fill={C.c3} /><Bar dataKey="open" stackId="a" name="Open" fill={C.c5} radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
      </div>
      <SectionCard className="mt-4" title="Agent & team performance">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr className="border-b"><th className="py-2 text-left">Agent</th><th className="text-left">Type</th><th className="text-right">Handled</th><th className="text-right">Resolved</th><th className="w-48 pl-6 text-left">Resolution rate</th><th className="text-right">Avg time to resolve</th></tr></thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.name} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{a.name}</td>
                  <td><span className={a.kind === 'AI' ? 'rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary' : 'rounded bg-muted px-1.5 py-0.5 text-xs'}>{a.kind}</span></td>
                  <td className="num text-right">{a.handled}</td><td className="num text-right">{a.resolved}</td>
                  <td className="pl-6"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${a.rate}%` }} /></div><span className="num w-12 text-xs">{a.rate.toFixed(0)}%</span></div></td>
                  <td className="num text-right">{a.avgH.toFixed(1)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
