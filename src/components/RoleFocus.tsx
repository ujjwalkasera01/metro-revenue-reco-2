import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { OPEN_STATUSES, useStore } from '../lib/store';
import { TODAY } from '../lib/mockData';
import { inrCompact } from '../lib/format';

export default function RoleFocus() {
  const { session, tickets, records, reports, users, audit } = useStore();
  const nav = useNavigate();
  const role = session!.role;
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const today = records.filter((r) => r.date === TODAY);

  const cfg = {
    'Station Team': {
      title: 'Central Terminal — your station',
      items: [
        ['Open tickets for your station', open.filter((t) => t.stationId === 'S01').length],
        ["Today's statement", today.find((r) => r.stationId === 'S01')?.status === 'Pending' ? 'Awaiting submission' : 'Submitted'],
        ['SPOC follow-ups pending', open.filter((t) => t.stationId === 'S01' && t.status === 'Awaiting Response').length],
      ],
      cta: ['Respond to tickets', '/tickets'],
    },
    'AFC Team': {
      title: 'AFC clearing & sync health',
      items: [
        ['Stations synced today', `${today.length}/10`],
        ["Today's batch", today.every((r) => r.status === 'Pending') ? 'Not reconciled' : 'Reconciled'],
        ['Device-level exceptions', 3],
      ],
      cta: ['Run reconciliation', '/reconciliation'],
    },
    'Revenue Team': {
      title: 'Investigation queue',
      items: [
        ['Open discrepancies', open.length],
        ['Escalated to you', open.filter((t) => t.status === 'Escalated').length],
        ['Value at risk', inrCompact(open.reduce((s, t) => s + Math.abs(t.amount), 0))],
      ],
      cta: ['Open communication center', '/communications'],
    },
    'Finance Team': {
      title: 'Settlement status — October 2026',
      items: [
        ['Unresolved before close', open.length],
        ['Reports awaiting approval', reports.filter((r) => r.status === 'Pending Approval').length],
        ['Last approved', reports.find((r) => r.status === 'Approved')?.id ?? '—'],
      ],
      cta: ['Review reports', '/reports'],
    },
    Administrator: {
      title: 'System & governance',
      items: [
        ['Active users', users.filter((u) => u.status === 'Active').length],
        ['Audit events (all time)', audit.length],
        ['Security posture', 'MFA enforced'],
      ],
      cta: ['Manage users', '/users'],
    },
  }[role];

  return (
    <Card className="mb-4 flex flex-col gap-4 border-primary/20 bg-gradient-to-r from-accent to-card p-4 shadow-sm md:flex-row md:items-center">
      <div className="flex items-center gap-2 md:w-60">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{cfg.title}</p>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-4">
        {cfg.items.map(([k, v]) => (
          <div key={String(k)}>
            <p className="text-[11px] text-muted-foreground">{k}</p>
            <p className="num text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={() => nav(cfg.cta[1])}>{cfg.cta[0]} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
    </Card>
  );
}
