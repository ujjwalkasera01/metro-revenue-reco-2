import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Play, Search } from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Card } from '@project/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { cn } from '@project/components/lib/utils';
import { DemoTag, EmptyState, PageHeader, ReconBadge } from '../components/common';
import { FilterSelect, LineSelect, StationSelect } from '../components/filters';
import DrilldownDialog from '../components/DrilldownDialog';
import { useStore } from '../lib/store';
import { TODAY, addDays } from '../lib/mockData';
import { fmtDateTime, inr, inrCompact, inrSigned } from '../lib/format';
import type { ReconRecord } from '../lib/types';

type View = 'day' | 'week' | 'month';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');
type SortKey = 'station' | 'expected' | 'variance' | 'pct' | 'status';

export default function ReconMonitor() {
  const { records, stations, stationById, runReconciliation, can } = useStore();
  const [view, setView] = useState<View>('day');
  const [anchor, setAnchor] = useState(addDays(TODAY, -1));
  const [line, setLine] = useState('all');
  const [station, setStation] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'variance', dir: -1 });
  const [drill, setDrill] = useState<ReconRecord | null>(null);
  const [running, setRunning] = useState(false);

  const visibleStations = stations.filter((s) =>
    (line === 'all' || s.lineId === line) && (station === 'all' || s.id === station) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase())));
  const ids = new Set(visibleStations.map((s) => s.id));
  const byKey = useMemo(() => new Map(records.map((r) => [`${r.date}|${r.stationId}`, r])), [records]);
  const passes = (r?: ReconRecord) => !!r && (status === 'all' || r.status === status);

  const step = (n: number) => {
    const d = new Date(anchor + 'T00:00:00');
    const next = view === 'day' ? addDays(anchor, n) : view === 'week' ? addDays(anchor, 7 * n) : iso(addMonths(d, n));
    if (next > TODAY) return setAnchor(TODAY);
    setAnchor(next);
  };

  const run = async () => {
    setRunning(true);
    const res = await runReconciliation();
    setRunning(false);
    setView('day'); setAnchor(TODAY);
    toast.success(`Reconciliation complete: ${res.discrepancies} discrepancies detected, ${res.created} tickets auto-created`);
  };

  const label = view === 'day' ? format(new Date(anchor), 'EEEE, dd MMM yyyy')
    : view === 'week' ? `${format(startOfWeek(new Date(anchor), { weekStartsOn: 1 }), 'dd MMM')} – ${format(endOfWeek(new Date(anchor), { weekStartsOn: 1 }), 'dd MMM yyyy')}`
    : format(new Date(anchor), 'MMMM yyyy');

  return (
    <div>
      <PageHeader
        title="Reconciliation Monitor"
        subtitle="AFC clearing-house data vs Station Team submissions, by station and business day"
        actions={can('recon.run') && (
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {running ? 'Reconciling 10 stations…' : `Run reconciliation (${format(new Date(TODAY), 'dd MMM')})`}
          </Button>
        )}
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 shadow-sm xl:flex-row xl:items-center">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList><TabsTrigger value="day">Day</TabsTrigger><TabsTrigger value="week">Week</TabsTrigger><TabsTrigger value="month">Month</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => step(1)} disabled={anchor >= TODAY}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 min-w-[180px] text-sm font-semibold">{label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station…" className="h-9 w-44 pl-8" /></div>
          <LineSelect value={line} onChange={(v) => { setLine(v); setStation('all'); }} />
          <StationSelect value={station} onChange={setStation} line={line} />
          <FilterSelect value={status} onChange={setStatus} className="w-[140px]" options={[{ value: 'all', label: 'All statuses' }, { value: 'Reconciled', label: 'Reconciled' }, { value: 'Discrepancy', label: 'Discrepancy' }, { value: 'Pending', label: 'Pending' }]} />
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/80" />Reconciled</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-destructive/80" />Discrepancy</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/70" />Pending</span>
        <span className="ml-auto">Click any cell or row to drill into the revenue calculation</span>
      </div>

      {visibleStations.length === 0 ? <Card><EmptyState title="No stations match your filters" hint="Try clearing the search or line filter." /></Card>
        : view === 'day' ? <DayTable date={anchor} rows={visibleStations.map((s) => byKey.get(`${anchor}|${s.id}`)).filter(passes) as ReconRecord[]} sort={sort} setSort={setSort} onOpen={setDrill} />
        : view === 'week' ? <WeekGrid anchor={anchor} stationsList={visibleStations} byKey={byKey} passes={passes} onOpen={setDrill} />
        : <MonthGrid anchor={anchor} records={records.filter((r) => ids.has(r.stationId) && passes(r))} onPick={(d) => { setAnchor(d); setView('day'); }} />}

      <DrilldownDialog record={drill} onClose={() => setDrill(null)} />
      <p className="mt-3 text-xs text-muted-foreground">Stations: {visibleStations.map((s) => stationById(s.id).code).join(' · ')}</p>
    </div>
  );
}

function DayTable({ date, rows, sort, setSort, onOpen }: {
  date: string; rows: ReconRecord[]; sort: { key: SortKey; dir: 1 | -1 }; setSort: (s: { key: SortKey; dir: 1 | -1 }) => void; onOpen: (r: ReconRecord) => void;
}) {
  const { stationById } = useStore();
  const val = (r: ReconRecord) => ({ station: stationById(r.stationId).name, expected: r.expected, variance: Math.abs(r.variance), pct: Math.abs(r.variancePct), status: r.status }[sort.key]);
  const sorted = [...rows].sort((a, b) => (val(a) > val(b) ? 1 : -1) * sort.dir);
  const H = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th className={cn('px-3 py-2.5', right ? 'text-right' : 'text-left')}>
      <button onClick={() => setSort({ key: k, dir: sort.key === k ? (-sort.dir as 1 | -1) : -1 })} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}<ArrowUpDown className={cn('h-3 w-3', sort.key === k && 'text-primary')} />
      </button>
    </th>
  );
  const totals = rows.reduce((a, r) => ({ e: a.e + r.expected, p: a.p + r.reported }), { e: 0, p: 0 });
  if (rows.length === 0) return <Card><EmptyState title="No records for this day" hint={date === TODAY ? 'Run reconciliation to process today’s batch.' : undefined} /></Card>;
  return (
    <Card className="overflow-x-auto shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr><H k="station">Station</H><H k="expected" right>AFC data</H><th className="px-3 py-2.5 text-right">Station data</th><H k="variance" right>Variance</H><H k="pct" right>Disc. %</H><H k="status">Status</H><th className="px-3 py-2.5 text-left">Last sync</th></tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const st = stationById(r.stationId);
            const bad = r.status === 'Discrepancy';
            return (
              <tr key={r.id} onClick={() => onOpen(r)} className={cn('cursor-pointer border-b border-l-4 transition-colors hover:bg-muted/40', bad ? 'border-l-destructive bg-destructive/[0.03]' : r.status === 'Reconciled' ? 'border-l-success' : 'border-l-warning')}>
                <td className="px-3 py-2.5"><p className="font-medium">{st.name}</p><p className="text-[11px] text-muted-foreground">{st.code} · {st.lineId === 'L1' ? 'Blue Line' : 'Green Line'}</p></td>
                <td className="num px-3 py-2.5 text-right">{inr(r.expected)}</td>
                <td className="num px-3 py-2.5 text-right">{inr(r.reported)}</td>
                <td className={cn('num px-3 py-2.5 text-right font-medium', bad ? 'text-destructive' : 'text-success')}>{inrSigned(r.variance)}</td>
                <td className={cn('num px-3 py-2.5 text-right', bad && 'text-destructive')}>{r.variancePct.toFixed(2)}%</td>
                <td className="px-3 py-2.5"><ReconBadge status={r.status} /></td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDateTime(r.lastSync)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/40 font-semibold">
          <tr><td className="px-3 py-2.5">Total ({rows.length})</td><td className="num px-3 text-right">{inr(totals.e)}</td><td className="num px-3 text-right">{inr(totals.p)}</td><td className="num px-3 text-right">{inrSigned(totals.p - totals.e)}</td><td colSpan={3} /></tr>
        </tfoot>
      </table>
    </Card>
  );
}

function cellCls(r?: ReconRecord) {
  if (!r) return 'bg-muted/40 text-muted-foreground';
  return r.status === 'Reconciled' ? 'bg-success/10 text-success hover:bg-success/20 border-success/20'
    : r.status === 'Discrepancy' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30'
    : 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/30';
}

function WeekGrid({ anchor, stationsList, byKey, passes, onOpen }: {
  anchor: string; stationsList: { id: string; name: string; code: string }[]; byKey: Map<string, ReconRecord>; passes: (r?: ReconRecord) => boolean; onOpen: (r: ReconRecord) => void;
}) {
  const start = startOfWeek(new Date(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) }).map(iso);
  return (
    <Card className="overflow-x-auto p-3 shadow-sm">
      <table className="w-full min-w-[860px] border-separate border-spacing-1 text-xs">
        <thead><tr><th className="w-40 text-left text-muted-foreground">Station</th>{days.map((d) => <th key={d} className="font-medium text-muted-foreground">{format(new Date(d), 'EEE dd')}</th>)}</tr></thead>
        <tbody>
          {stationsList.map((s) => (
            <tr key={s.id}>
              <td className="pr-2 font-medium">{s.name}</td>
              {days.map((d) => {
                const r = byKey.get(`${d}|${s.id}`);
                const show = passes(r);
                return (
                  <td key={d}>
                    <button disabled={!r || !show} onClick={() => r && onOpen(r)} className={cn('w-full rounded-md border border-transparent px-2 py-2 text-left transition-colors', show ? cellCls(r) : 'bg-muted/30 text-muted-foreground/50')}>
                      {r ? (
                        <>
                          <p className="num font-semibold">{inrCompact(r.expected)}</p>
                          <p className="num text-[10px] opacity-80">{r.status === 'Pending' ? 'pending' : r.variance === 0 ? 'matched' : inrSigned(r.variance)}</p>
                        </>
                      ) : <p className="py-2 text-center">—</p>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MonthGrid({ anchor, records, onPick }: { anchor: string; records: ReconRecord[]; onPick: (d: string) => void }) {
  const m = new Date(anchor);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(m), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(m), { weekStartsOn: 1 }) });
  const agg = new Map<string, { ok: number; bad: number; pend: number; rev: number; varc: number }>();
  for (const r of records) {
    const a = agg.get(r.date) ?? { ok: 0, bad: 0, pend: 0, rev: 0, varc: 0 };
    if (r.status === 'Reconciled') a.ok++; else if (r.status === 'Discrepancy') a.bad++; else a.pend++;
    a.rev += r.expected; a.varc += Math.abs(r.variance);
    agg.set(r.date, a);
  }
  return (
    <Card className="p-3 shadow-sm">
      <div className="grid grid-cols-7 gap-1.5 text-[11px] font-medium text-muted-foreground">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-1 pb-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const k = iso(d);
          const a = agg.get(k);
          const inMonth = d.getMonth() === m.getMonth();
          return (
            <button key={k} disabled={!a} onClick={() => onPick(k)}
              className={cn('min-h-[92px] rounded-lg border p-2 text-left transition-all', !inMonth && 'opacity-40', a ? 'hover:border-primary hover:shadow-sm' : 'bg-muted/30', k === TODAY && 'ring-2 ring-primary/40',
                a && a.bad > 0 ? 'border-destructive/30 bg-destructive/[0.04]' : a && a.pend === 0 ? 'border-success/30 bg-success/[0.04]' : '')}>
              <p className="text-xs font-semibold">{format(d, 'd')}</p>
              {a && (
                <div className="mt-1 space-y-0.5">
                  <p className="num hidden text-[11px] font-medium sm:block">{inrCompact(a.rev)}</p>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {a.ok > 0 && <span className="rounded bg-success/15 px-1 text-success">{a.ok}✓</span>}
                    {a.bad > 0 && <span className="rounded bg-destructive/15 px-1 text-destructive">{a.bad}✕</span>}
                    {a.pend > 0 && <span className="rounded bg-warning/15 px-1 text-warning">{a.pend}…</span>}
                  </div>
                  {a.varc > 0 && <p className="num hidden text-[10px] text-destructive md:block">Δ {inrCompact(a.varc)}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3"><DemoTag /></div>
    </Card>
  );
}
