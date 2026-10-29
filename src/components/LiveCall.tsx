import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Mic, PhoneCall, PhoneOff, Radio, User, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { fmtDur, inr, maskPhone } from '../lib/format';
import type { Comm, Ticket, TicketStatus, TranscriptLine } from '../lib/types';
import { DemoTag } from './common';

type Scenario = 'cooperative' | 'dispute' | 'noanswer';
interface Step extends TranscriptLine { intent: string; sentiment: 'Positive' | 'Neutral' | 'Negative' }

function script(t: Ticket, station: string, sc: Scenario): Step[] {
  const amt = inr(t.amount);
  const open: Step = { speaker: 'AI', text: `Namaste ${t.spoc.split(' ')[0]} ji, this is Aria, the automated revenue assistant from Metro Revenue Control. This call is recorded. I'm calling about ticket ${t.id} — a ${amt} variance at ${station}.`, intent: 'Greeting & disclosure', sentiment: 'Neutral' };
  if (sc === 'noanswer') return [
    { speaker: 'AI', text: 'Dialling SPOC… ringing (25s)…', intent: 'Dialling', sentiment: 'Neutral' },
    { speaker: 'AI', text: 'No answer. Leaving a voicemail and scheduling retry.', intent: 'Voicemail', sentiment: 'Neutral' },
  ];
  if (sc === 'dispute') return [
    open,
    { speaker: 'SPOC', text: 'I already submitted the correct figures. Our cash count matched the TOM report. The AFC data must be wrong.', intent: 'Dispute discrepancy', sentiment: 'Negative' },
    { speaker: 'AI', text: 'I understand. The AFC shows a difference mainly in cash collections. Could you share the closing shift TOM report so we can verify?', intent: 'Request evidence', sentiment: 'Neutral' },
    { speaker: 'SPOC', text: 'This is the third call. I want to speak to someone from the revenue team, not a machine.', intent: 'Request human agent', sentiment: 'Negative' },
    { speaker: 'AI', text: 'Of course. I’m transferring this to a Revenue Team supervisor now. You’ll receive a call within 2 hours.', intent: 'Human handoff', sentiment: 'Neutral' },
  ];
  return [
    open,
    { speaker: 'SPOC', text: 'Haan, I saw the email this morning. I think the evening shift deposit was delayed — the bank pickup came late.', intent: 'Acknowledge discrepancy', sentiment: 'Neutral' },
    { speaker: 'AI', text: 'Thank you for confirming. To close this, could you upload the bank deposit slip and the TOM shift report?', intent: 'Request evidence', sentiment: 'Neutral' },
    { speaker: 'SPOC', text: 'Yes, I’ll upload both by 5 PM today.', intent: 'Commit to action', sentiment: 'Positive' },
    { speaker: 'AI', text: 'Perfect. I’ve noted a commitment for 5 PM today and will send a confirmation email. Thank you, have a good day.', intent: 'Confirm & close', sentiment: 'Positive' },
  ];
}

export default function LiveCall({ ticket, onDone }: { ticket: Ticket | null; onDone: () => void }) {
  const s = useStore();
  const [active, setActive] = useState(false);
  const [lines, setLines] = useState<Step[]>([]);
  const [sec, setSec] = useState(0);
  const [scenario, setScenario] = useState<Scenario>('cooperative');
  const [ended, setEnded] = useState(false);
  const timers = useRef<number[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { reset(); }, [ticket?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return;
    const i = window.setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [active]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [lines.length]);

  function reset() { timers.current.forEach(clearTimeout); setActive(false); setLines([]); setSec(0); setEnded(false); }

  if (!ticket) return (
    <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center shadow-sm">
      <div className="rounded-full bg-primary/10 p-4"><PhoneCall className="h-6 w-6 text-primary" /></div>
      <p className="mt-3 font-semibold">No active call</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Pick a ticket from the call queue to start a simulated AI follow-up with the station SPOC.</p>
    </Card>
  );
  const st = s.stationById(ticket.stationId);
  const steps = script(ticket, st.name, scenario);
  const last = lines[lines.length - 1];
  const outcome = scenario === 'cooperative' ? 'Commitment obtained' : scenario === 'dispute' ? 'Escalated to human' : 'No answer';

  const start = () => {
    reset();
    setActive(true);
    steps.forEach((step, i) => {
      timers.current.push(window.setTimeout(() => {
        setLines((l) => [...l, step]);
        if (i === steps.length - 1) timers.current.push(window.setTimeout(() => finish(), 1500));
      }, 900 + i * 2300));
    });
  };

  const finish = () => {
    setActive(false); setEnded(true);
    const attempts = ticket.attempts + 1;
    const comm: Omit<Comm, 'id'> = {
      ticketId: ticket.id, type: 'call-out', at: new Date().toISOString(), title: `AI follow-up call #${attempts}`,
      summary: scenario === 'cooperative' ? `${ticket.spoc} acknowledged and committed to upload evidence by 5 PM.` : scenario === 'dispute' ? `${ticket.spoc} disputed the variance and requested a human agent.` : 'No answer; voicemail left, retry scheduled.',
      outcome, durationSec: scenario === 'noanswer' ? 25 : steps.length * 23, sentiment: scenario === 'dispute' ? 'Negative' : scenario === 'cooperative' ? 'Positive' : 'Neutral',
      intent: steps[steps.length - 2]?.intent ?? 'Voicemail', transcript: scenario === 'noanswer' ? undefined : steps.map(({ speaker, text }) => ({ speaker, text })),
    };
    s.addComm(comm);
    let next: TicketStatus | null = null;
    let note = '';
    if (scenario === 'cooperative') { next = 'Awaiting Response'; note = 'SPOC committed to share deposit slip'; s.addComm({ ticketId: ticket.id, type: 'email-out', at: new Date().toISOString(), title: 'Call summary & document request', summary: `Confirmation email sent to ${ticket.spoc} (simulated).` }); }
    else if (scenario === 'dispute') { next = s.settings.escalateOnNegative && s.settings.humanHandoff ? 'Escalated' : 'In Progress'; note = 'Negative sentiment – human handoff'; }
    else if (attempts >= s.settings.maxAttempts && s.settings.humanHandoff) { next = 'Escalated'; note = `Max ${s.settings.maxAttempts} attempts reached`; }
    else if (ticket.status === 'Open') { next = 'Contacted'; note = 'Attempted contact – no answer'; }
    if (next && next !== ticket.status) s.setTicketStatus(ticket.id, next, note);
    toast.success(`Call ended · ${outcome}${next ? ` · ticket → ${next}` : ''}`);
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b bg-sidebar p-4 text-white">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-sidebar-primary', active && 'animate-pulse')}><Bot className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Aria → {ticket.spoc} <span className="font-normal text-sidebar-foreground">({maskPhone(st.spoc.phone)})</span></p>
          <p className="text-xs text-sidebar-foreground">{ticket.id} · {st.name} · {inr(ticket.amount)} variance · attempt {ticket.attempts + (ended ? 0 : 1)}/{s.settings.maxAttempts}</p>
        </div>
        <div className="text-right">
          <p className="num text-2xl font-semibold">{fmtDur(sec)}</p>
          <p className="flex items-center justify-end gap-1 text-[11px] text-sidebar-foreground">{active ? <><Radio className="h-3 w-3 text-red-400" /> LIVE · SIMULATED</> : ended ? 'Call ended' : 'Ready'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px]">
        <div className="flex h-[380px] flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" />Speech-to-text transcript</span><DemoTag /></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <AnimatePresence>
              {lines.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', l.speaker === 'SPOC' && 'flex-row-reverse')}>
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', l.speaker === 'AI' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success')}>{l.speaker === 'AI' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}</span>
                  <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-sm', l.speaker === 'AI' ? 'bg-muted' : 'bg-primary text-primary-foreground')}>{l.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {active && <p className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />listening…</p>}
            {!active && lines.length === 0 && <p className="pt-16 text-center text-sm text-muted-foreground">Choose a scenario and start the simulated call.</p>}
            <div ref={bottom} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            {!active ? (
              <>
                <div className="flex rounded-md border p-0.5 text-xs">
                  {(['cooperative', 'dispute', 'noanswer'] as Scenario[]).map((x) => (
                    <button key={x} onClick={() => setScenario(x)} className={cn('rounded px-2 py-1 capitalize', scenario === x && 'bg-primary text-primary-foreground')}>{x === 'noanswer' ? 'No answer' : x}</button>
                  ))}
                </div>
                <Button size="sm" onClick={start} className="ml-auto"><PhoneCall className="mr-1.5 h-4 w-4" />{ended ? 'Call again' : 'Start simulated call'}</Button>
                {ended && <Button size="sm" variant="outline" onClick={onDone}>Next in queue</Button>}
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => { reset(); setScenario('dispute'); s.setTicketStatus(ticket.id, 'Escalated', 'Supervisor took over live call'); toast.success('You have taken over the call (simulated)'); }}><UserRoundCheck className="mr-1.5 h-4 w-4" />Take over (human)</Button>
                <Button size="sm" variant="destructive" className="ml-auto" onClick={finish}><PhoneOff className="mr-1.5 h-4 w-4" />End call</Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-3 border-t bg-muted/30 p-4 lg:border-l lg:border-t-0">
          {[
            ['Detected intent', last?.intent ?? '—'],
            ['Caller sentiment', last ? (lines.filter((l) => l.speaker === 'SPOC').slice(-1)[0]?.sentiment ?? 'Neutral') : '—'],
            ['AI confidence', last ? `${88 + (lines.length % 4) * 2}%` : '—'],
            ['Call outcome', ended ? outcome : active ? 'In progress' : '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className={cn('mt-0.5 text-sm font-semibold', v === 'Negative' && 'text-destructive', v === 'Positive' && 'text-success')}>{v}</p>
            </div>
          ))}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recording</p>
            <div className="mt-2 flex h-8 items-end gap-0.5">
              {Array.from({ length: 32 }).map((_, i) => <span key={i} className={cn('w-1 rounded-sm bg-primary/30', active && 'animate-pulse')} style={{ height: `${20 + ((i * 37) % 80)}%` }} />)}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Placeholder — no audio is recorded</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
