import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Mail, MailOpen, PhoneIncoming, PhoneOutgoing, Settings2 } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import type { Comm } from '../lib/types';
import { fmtDateTime, fmtDur } from '../lib/format';
import { EmptyState } from './common';

const ICON = {
  'call-out': { i: PhoneOutgoing, c: 'bg-primary/10 text-primary', l: 'Outbound call' },
  'call-in': { i: PhoneIncoming, c: 'bg-sky-100 text-sky-700', l: 'Inbound call' },
  'email-out': { i: Mail, c: 'bg-violet-100 text-violet-700', l: 'Email sent' },
  'email-in': { i: MailOpen, c: 'bg-success/10 text-success', l: 'Email received' },
  system: { i: Settings2, c: 'bg-muted text-muted-foreground', l: 'System' },
};

function Item({ c, showTicket }: { c: Comm; showTicket?: boolean }) {
  const [open, setOpen] = useState(false);
  const m = ICON[c.type];
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px bg-border" />
      <span className={cn('z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', m.c)}><m.i className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-foreground">{c.title}</span>
          {showTicket && <span className="num rounded bg-muted px-1.5 text-[10px]">{c.ticketId}</span>}
          <span className="text-muted-foreground">{m.l} · {fmtDateTime(c.at)}</span>
          {c.durationSec !== undefined && <span className="num text-muted-foreground">· {fmtDur(c.durationSec)}</span>}
          <span className="ml-auto rounded border border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700">Simulated</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
        {(c.outcome || c.sentiment) && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {c.outcome && <span className="rounded bg-muted px-1.5 py-0.5">Outcome: <b>{c.outcome}</b></span>}
            {c.intent && <span className="rounded bg-muted px-1.5 py-0.5">Intent: <b>{c.intent}</b></span>}
            {c.sentiment && <span className={cn('rounded px-1.5 py-0.5', c.sentiment === 'Positive' ? 'bg-success/10 text-success' : c.sentiment === 'Negative' ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>Sentiment: <b>{c.sentiment}</b></span>}
          </div>
        )}
        {c.transcript && (
          <>
            <button onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
              Transcript <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="mt-2 space-y-1.5 rounded-md bg-muted/50 p-2 text-xs">
                {c.transcript.map((l, i) => (
                  <p key={i} className="flex gap-1.5">
                    {l.speaker === 'AI' ? <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> : <ArrowDownLeft className="mt-0.5 h-3 w-3 shrink-0 text-success" />}
                    <span><b>{l.speaker === 'AI' ? 'Aria (AI)' : 'SPOC'}:</b> {l.text}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function CommTimeline({ items, showTicket }: { items: Comm[]; showTicket?: boolean }) {
  if (items.length === 0) return <EmptyState title="No communications yet" hint="Start an AI follow-up call to contact the SPOC." />;
  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at));
  return <ul>{sorted.map((c) => <Item key={c.id} c={c} showTicket={showTicket} />)}</ul>;
}
