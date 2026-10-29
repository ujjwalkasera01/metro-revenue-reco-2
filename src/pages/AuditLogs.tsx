import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { Input } from '@project/components/ui/input';
import { EmptyState, PageHeader } from '../components/common';
import { FilterSelect } from '../components/filters';
import { useStore } from '../lib/store';
import { downloadFile, fmtDateTime, toCsv } from '../lib/format';

const PAGE = 15;

export default function AuditLogs() {
  const { audit } = useStore();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(0);
  const actions = [...new Set(audit.map((a) => a.action))].sort();
  const rows = audit.filter((a) => (role === 'all' || a.role === role) && (action === 'all' || a.action === action) &&
    (!q || [a.user, a.entity, a.detail].some((x) => x.toLowerCase().includes(q.toLowerCase()))));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Immutable trail of user actions, configuration changes and status transitions"
        actions={<Button variant="outline" onClick={() => downloadFile('audit-log.csv', toCsv([['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Detail', 'From', 'To'], ...rows.map((a) => [a.at, a.user, a.role, a.action, a.entity, a.detail, a.from ?? '', a.to ?? ''])]), 'text/csv')}><Download className="mr-2 h-4 w-4" />Export CSV</Button>} />
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search user, entity, detail…" className="h-9 w-64 pl-8" /></div>
          <FilterSelect value={role} onChange={(v) => { setRole(v); setPage(0); }} className="w-[160px]" options={[{ value: 'all', label: 'All roles' }, ...['System', 'Station Team', 'AFC Team', 'Revenue Team', 'Finance Team', 'Administrator'].map((r) => ({ value: r, label: r }))]} />
          <FilterSelect value={action} onChange={(v) => { setAction(v); setPage(0); }} className="w-[180px]" options={[{ value: 'all', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: a }))]} />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} events · tamper-evident (simulated)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5 text-left">Timestamp</th><th className="px-3 text-left">User</th><th className="px-3 text-left">Action</th><th className="px-3 text-left">Entity</th><th className="px-3 text-left">Detail</th><th className="px-3 text-left">Transition</th></tr></thead>
            <tbody>
              {view.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="num px-3 py-2.5 text-xs">{fmtDateTime(a.at)}</td>
                  <td className="px-3">{a.user}<p className="text-[11px] text-muted-foreground">{a.role}</p></td>
                  <td className="px-3"><span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">{a.action}</span></td>
                  <td className="num px-3 text-xs">{a.entity}</td>
                  <td className="max-w-xs px-3 text-xs text-muted-foreground">{a.detail}</td>
                  <td className="px-3 text-xs">{a.from || a.to ? <><span className="text-muted-foreground line-through">{a.from ?? '—'}</span> → <b>{a.to}</b></> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.length === 0 && <EmptyState title="No audit events match" />}
        </div>
        <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></div>
        </div>
      </Card>
    </div>
  );
}
