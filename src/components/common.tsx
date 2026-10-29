import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import type { ReconStatus, Severity, TicketStatus } from '../lib/types';
import { Card } from '@project/components/ui/card';
import { FlaskConical, Inbox, TrendingDown, TrendingUp } from 'lucide-react';

const pill = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap border';

export function ReconBadge({ status }: { status: ReconStatus }) {
  const c = {
    Reconciled: 'bg-success/10 text-success border-success/20',
    Discrepancy: 'bg-destructive/10 text-destructive border-destructive/20',
    Pending: 'bg-warning/10 text-warning border-warning/30',
  }[status];
  return <span className={cn(pill, c)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

const TS: Record<TicketStatus, string> = {
  Open: 'bg-destructive/10 text-destructive border-destructive/20',
  Contacted: 'bg-sky-50 text-sky-700 border-sky-200',
  'In Progress': 'bg-primary/10 text-primary border-primary/20',
  'Awaiting Response': 'bg-warning/10 text-warning border-warning/30',
  Escalated: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  Resolved: 'bg-success/10 text-success border-success/20',
  Closed: 'bg-muted text-muted-foreground border-border',
};
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={cn(pill, TS[status])}>{status}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = {
    Low: 'bg-muted text-muted-foreground border-border',
    Medium: 'bg-warning/10 text-warning border-warning/30',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Critical: 'bg-destructive text-destructive-foreground border-destructive',
  }[severity];
  return <span className={cn(pill, c)}>{severity}</span>;
}

export function DemoTag({ children = 'Simulated demo data' }: { children?: ReactNode }) {
  return (
    <span className={cn(pill, 'bg-amber-50 text-amber-700 border-amber-200')}>
      <FlaskConical className="h-3 w-3" />{children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, icon: Icon, delta, tone = 'default', hint }: {
  label: string; value: ReactNode; icon: LucideIcon; delta?: number; tone?: 'default' | 'success' | 'danger' | 'warning'; hint?: string;
}) {
  const toneCls = { default: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', danger: 'bg-destructive/10 text-destructive', warning: 'bg-warning/10 text-warning' }[tone];
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn('rounded-md p-1.5', toneCls)}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="num mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint}
      </div>
    </Card>
  );
}

export function SectionCard({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3"><Inbox className="h-5 w-5 text-muted-foreground" /></div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NoAccess({ what }: { what: string }) {
  return (
    <Card className="p-10 text-center shadow-sm">
      <p className="font-semibold">Restricted</p>
      <p className="mt-1 text-sm text-muted-foreground">Your current role doesn't have permission to {what}. Use the role switcher to try another role.</p>
    </Card>
  );
}
