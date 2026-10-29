import { useNavigate } from 'react-router-dom';
import { ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import type { Breakdown, ReconRecord } from '../lib/types';
import { useStore } from '../lib/store';
import { fmtDate, fmtDateTime, inr, inrSigned } from '../lib/format';
import { LINES } from '../lib/mockData';
import { ReconBadge, TicketStatusBadge } from './common';

const ROWS: { key: keyof Breakdown; label: string; sign: string }[] = [
  { key: 'ticketSales', label: 'Ticket sales (tokens / QR / paper)', sign: '+' },
  { key: 'cardRecharge', label: 'Smart card recharge', sign: '+' },
  { key: 'refunds', label: 'Refunds', sign: '−' },
  { key: 'adjustments', label: 'Adjustments (penalties / excess fare)', sign: '±' },
];
const TENDER: { key: keyof Breakdown; label: string }[] = [
  { key: 'cash', label: 'Cash collected' },
  { key: 'digital', label: 'Digital payments (UPI / card)' },
];

function Row({ label, a, b, sign, bold }: { label: string; a: number; b: number; sign?: string; bold?: boolean }) {
  const v = b - a;
  return (
    <tr className={cn('border-b last:border-0', bold && 'bg-muted/50 font-semibold', v !== 0 && !bold && 'bg-destructive/5')}>
      <td className="py-2 pl-3 text-sm">{sign && <span className="mr-1.5 inline-block w-3 text-muted-foreground">{sign}</span>}{label}</td>
      <td className="num py-2 text-right text-sm">{inr(a)}</td>
      <td className="num py-2 text-right text-sm">{inr(b)}</td>
      <td className={cn('num py-2 pr-3 text-right text-sm', v === 0 ? 'text-success' : 'text-destructive')}>{v === 0 ? '✓' : inrSigned(v)}</td>
    </tr>
  );
}

export default function DrilldownDialog({ record, onClose }: { record: ReconRecord | null; onClose: () => void }) {
  const { stationById, tickets, createTicketFor, can } = useStore();
  const nav = useNavigate();
  if (!record) return null;
  const st = stationById(record.stationId);
  const ticket = tickets.find((t) => t.reconId === record.id);
  const tAfc = record.afc.cash + record.afc.digital;
  const tStn = record.stn.cash + record.stn.digital;

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">{st.name} <span className="text-sm font-normal text-muted-foreground">· {fmtDate(record.date)}</span> <ReconBadge status={record.status} /></DialogTitle>
          <DialogDescription>
            {LINES.find((l) => l.id === st.lineId)?.name} · Station code {st.code} · Ref <span className="num">{record.id}</span> · Last sync {fmtDateTime(record.lastSync)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Expected (AFC)', inr(record.expected), ''],
            ['Reported (Station)', inr(record.reported), ''],
            ['Variance', `${inrSigned(record.variance)} (${record.variancePct.toFixed(2)}%)`, record.variance === 0 ? 'text-success' : record.status === 'Discrepancy' ? 'text-destructive' : 'text-warning'],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-lg border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className={cn('num mt-1 text-base font-semibold', c)}>{v}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px]">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2 pl-3 text-left">Revenue calculation</th><th className="py-2 text-right">AFC system</th><th className="py-2 text-right">Station team</th><th className="py-2 pr-3 text-right">Variance</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r) => <Row key={r.key} label={r.label} sign={r.sign} a={record.afc[r.key]} b={record.stn[r.key]} />)}
              <Row label="Net revenue" a={record.expected} b={record.reported} bold />
              <tr><td colSpan={4} className="bg-muted/30 py-1.5 pl-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tender split</td></tr>
              {TENDER.map((r) => <Row key={r.key} label={r.label} a={record.afc[r.key]} b={record.stn[r.key]} />)}
              <Row label="Total tendered" a={tAfc} b={tStn} bold />
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
          {ticket ? (
            <div className="flex items-center gap-2 text-sm">Linked ticket <span className="num font-semibold">{ticket.id}</span> <TicketStatusBadge status={ticket.status} /></div>
          ) : (
            <p className="text-sm text-muted-foreground">{record.status === 'Discrepancy' ? 'No ticket linked yet.' : 'No action required.'}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success(`Re-synced ${st.name} from AFC (simulated)`)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Re-sync</Button>
            {ticket ? (
              <Button size="sm" onClick={() => nav(`/tickets/${ticket.id}`)}>Open ticket <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Button>
            ) : record.status === 'Discrepancy' && can('tickets.edit') ? (
              <Button size="sm" onClick={() => { const t = createTicketFor(record.id); if (t) { toast.success(`${t.id} created`); nav(`/tickets/${t.id}`); } }}><Plus className="mr-1.5 h-3.5 w-3.5" />Create ticket</Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
