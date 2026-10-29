import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Download, Search } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Card } from '@project/components/ui/card';
import { cn } from '@project/components/lib/utils';
import { EmptyState, KpiCard, PageHeader, SeverityBadge, TicketStatusBadge } from '../components/common';
import { FilterSelect, LineSelect } from '../components/filters';
import { ALL_STATUSES, OPEN_STATUSES, useStore } from '../lib/store';
import { downloadFile, fmtDate, inr, toCsv } from '../lib/format';
import { AlertTriangle, Clock, ShieldAlert, Ticket as TicketIcon } from 'lucide-react';
import type { Ticket } from '../lib/types';

export function slaInfo(t: Ticket) {
  const closed = !OPEN_STATUSES.includes(t.status);
  const left = (new Date(t.slaDueAt).getTime() - Date.now()) / 3600000;
  if (closed) return { label: 'Met', cls: 'text-success', breached: false };
  if (left < 0) return { label: `Breached ${Math.abs(left) > 48 ? Math.round(-left / 24) + 'd' : Math.round(-left) + 'h'}`, cls: 'text-destructive font-semibold', breached: true };
  return { label: `${Math.round(left)}h left`, cls: left < 4 ? 'text-warning font-semibold' : 'text-muted-foreground', breached: false };
}

type K = 'id' | 'amount' | 'createdAt' | 'severity';
const SEV = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const PAGE = 12;

export default function Tickets() {
  const { tickets, stationById, session } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('open');
  const [sev, setSev] = useState('all');
  const [line, setLine] = useState('all');
  const [sort, setSort] = useState<{ k: K; d: 1 | -1 }>({ k: 'createdAt', d: -1 });
  const [page, setPage] = useState(0);
  const scoped = session?.role === 'Station Team' ? tickets.filter((t) => t.stationId === 'S01') : tickets;

  const rows = useMemo(() => {
    const f = scoped.filter((t) => {
      const st = stationById(t.stationId);
      return (status === 'all' || (status === 'open' ? OPEN_STATUSES.includes(t.status) : t.status === status)) &&
        (sev === 'all' || t.severity === sev) && (line === 'all' || t.lineId === line) &&
        (!q || [t.id, st.name, t.spoc, t.owner].some((x) => x.toLowerCase().includes(q.toLowerCase())));
    });
    const v = (t: Ticket) => (sort.k === 'amount' ? Math.abs(t.amount) : sort.k === 'severity' ? SEV[t.severity] : t[sort.k]);
    return f.sort((a, b) => (v(a) > v(b) ? 1 : -1) * sort.d);
  }, [scoped, status, sev, line, q, sort, stationById]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const open = scoped.filter((t) => OPEN_STATUSES.includes(t.status));
  const H = ({ k, children, right }: { k: K; children: string; right?: boolean }) => (
    <th className={cn('px-3 py-2.5', right ? 'text-right' : 'text-left')}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort({ k, d: sort.k === k ? (-sort.d as 1 | -1) : -1 })}>{children}<ArrowUpDown className={cn('h-3 w-3', sort.k === k && 'text-primary')} /></button>
    </th>
  );

  const exportCsv = () => downloadFile('tickets.csv', toCsv([
    ['Ticket', 'Station', 'Line', 'Amount', 'Severity', 'SPOC', 'Owner', 'Status', 'Created', 'SLA due'],
    ...rows.map((t) => [t.id, stationById(t.stationId).name, t.lineId, t.amount, t.severity, t.spoc, t.owner, t.status, t.createdAt, t.slaDueAt]),
  ]), 'text/csv');

  return (
    <div>
      <PageHeader title="Discrepancy Tickets" subtitle="Auto-created whenever AFC and Station Team figures differ beyond tolerance"
        actions={<Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Open" value={open.length} icon={TicketIcon} tone="danger" />
        <KpiCard label="Escalated" value={open.filter((t) => t.status === 'Escalated').length} icon={ShieldAlert} tone="warning" />
        <KpiCard label="SLA breached" value={open.filter((t) => slaInfo(t).breached).length} icon={Clock} tone="danger" />
        <KpiCard label="Critical open" value={open.filter((t) => t.severity === 'Critical').length} icon={AlertTriangle} tone="danger" />
      </div>
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search ID, station, SPOC…" className="h-9 w-60 pl-8" /></div>
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(0); }} className="w-[170px]" options={[{ value: 'open', label: 'All open' }, { value: 'all', label: 'All statuses' }, ...ALL_STATUSES.map((s) => ({ value: s, label: s }))]} />
          <FilterSelect value={sev} onChange={(v) => { setSev(v); setPage(0); }} className="w-[140px]" options={[{ value: 'all', label: 'All severities' }, ...['Critical', 'High', 'Medium', 'Low'].map((s) => ({ value: s, label: s }))]} />
          <LineSelect value={line} onChange={(v) => { setLine(v); setPage(0); }} />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} tickets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><H k="id">Ticket</H><th className="px-3 py-2.5 text-left">Station / Line</th><H k="amount" right>Discrepancy</H><H k="severity">Severity</H><th className="px-3 py-2.5 text-left">SPOC</th><th className="px-3 py-2.5 text-left">Status</th><H k="createdAt">Created</H><th className="px-3 py-2.5 text-left">SLA</th></tr>
            </thead>
            <tbody>
              {view.map((t) => {
                const st = stationById(t.stationId);
                const sla = slaInfo(t);
                return (
                  <tr key={t.id} onClick={() => nav(`/tickets/${t.id}`)} className="cursor-pointer border-b hover:bg-muted/40">
                    <td className="num px-3 py-2.5 font-semibold text-primary">{t.id}</td>
                    <td className="px-3 py-2.5"><p className="font-medium">{st.name}</p><p className="text-[11px] text-muted-foreground">{t.lineId === 'L1' ? 'Blue Line' : 'Green Line'} · for {fmtDate(t.date)}</p></td>
                    <td className="num px-3 py-2.5 text-right font-medium text-destructive">{t.amount < 0 ? '−' : '+'}{inr(t.amount)}</td>
                    <td className="px-3 py-2.5"><SeverityBadge severity={t.severity} /></td>
                    <td className="px-3 py-2.5">{t.spoc}<p className="text-[11px] text-muted-foreground">Owner: {t.owner}</p></td>
                    <td className="px-3 py-2.5"><TicketStatusBadge status={t.status} /></td>
                    <td className="px-3 py-2.5 text-xs">{fmtDate(t.createdAt)}</td>
                    <td className={cn('px-3 py-2.5 text-xs', sla.cls)}>{sla.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {view.length === 0 && <EmptyState title="No tickets match" hint="Adjust filters or search." />}
        </div>
        <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
