import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, FileText, Paperclip, PhoneCall, ShieldAlert, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import { EmptyState, SectionCard, SeverityBadge, TicketStatusBadge } from '../components/common';
import { FilterSelect } from '../components/filters';
import CommTimeline from '../components/CommTimeline';
import DrilldownDialog from '../components/DrilldownDialog';
import { ALL_STATUSES, OPEN_STATUSES, useStore } from '../lib/store';
import { INTERNAL_OWNERS } from '../lib/mockData';
import { fmtDate, fmtDateTime, inr, inrSigned, maskPhone } from '../lib/format';
import { slaInfo } from './Tickets';
import type { Breakdown, TicketStatus } from '../lib/types';

const RES = ['Late cash deposit – booked as adjustment', 'AFC device data corrected', 'Station statement revised', 'Refund misclassification corrected', 'Written off (approved)'];

export default function TicketDetail() {
  const { id } = useParams();
  const s = useStore();
  const nav = useNavigate();
  const t = s.tickets.find((x) => x.id === id);
  const [note, setNote] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [owner, setOwner] = useState('');
  const [resOpen, setResOpen] = useState(false);
  const [resType, setResType] = useState(RES[0]);
  const [resNote, setResNote] = useState('');
  const [escOpen, setEscOpen] = useState(false);
  const [drill, setDrill] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!t) return <Card className="p-8"><EmptyState title="Ticket not found" /><div className="text-center"><Button variant="outline" onClick={() => nav('/tickets')}>Back to tickets</Button></div></Card>;
  const st = s.stationById(t.stationId);
  const rec = s.records.find((r) => r.id === t.reconId)!;
  const comms = s.comms.filter((c) => c.ticketId === t.id);
  const isOpen = OPEN_STATUSES.includes(t.status);
  const edit = s.can('tickets.edit');
  const sla = slaInfo(t);

  const comp: { k: keyof Breakdown; l: string }[] = [
    { k: 'ticketSales', l: 'Ticket sales' }, { k: 'cardRecharge', l: 'Card recharge' }, { k: 'cash', l: 'Cash' },
    { k: 'digital', l: 'Digital' }, { k: 'refunds', l: 'Refunds' }, { k: 'adjustments', l: 'Adjustments' },
  ];

  return (
    <div>
      <Link to="/tickets" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All tickets</Link>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="num text-2xl font-bold">{t.id}</h1>
            <TicketStatusBadge status={t.status} /><SeverityBadge severity={t.severity} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{st.name} · {t.lineId === 'L1' ? 'Blue Line' : 'Green Line'} · Business date {fmtDate(t.date)} · Variance <span className="num font-semibold text-destructive">{inrSigned(t.amount)}</span></p>
        </div>
        {edit && (
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={t.status} onChange={(v) => { s.setTicketStatus(t.id, v as TicketStatus); toast.success(`Status → ${v}`); }} className="w-[170px]" options={ALL_STATUSES.map((x) => ({ value: x, label: x }))} />
            <Button variant="outline" onClick={() => { setOwner(t.owner); setAssignOpen(true); }}><UserPlus className="mr-2 h-4 w-4" />Assign</Button>
            {s.can('comm.call') && isOpen && <Button variant="outline" onClick={() => nav(`/communications?ticket=${t.id}`)}><PhoneCall className="mr-2 h-4 w-4" />AI follow-up</Button>}
            {s.can('tickets.escalate') && isOpen && t.status !== 'Escalated' && <Button variant="outline" className="text-fuchsia-700" onClick={() => setEscOpen(true)}><ShieldAlert className="mr-2 h-4 w-4" />Escalate</Button>}
            {isOpen && <Button onClick={() => setResOpen(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Resolve</Button>}
            {t.status === 'Resolved' && <Button variant="outline" onClick={() => { s.setTicketStatus(t.id, 'Closed', 'Closed after verification'); toast.success('Ticket closed'); }}>Close ticket</Button>}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionCard title="Discrepancy breakdown" action={<Button variant="ghost" size="sm" onClick={() => setDrill(true)}><Eye className="mr-1.5 h-3.5 w-3.5" />Full calculation</Button>}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {comp.map(({ k, l }) => {
                const v = rec.stn[k] - rec.afc[k];
                return (
                  <div key={k} className={cn('rounded-lg border p-3', v !== 0 && 'border-destructive/30 bg-destructive/5')}>
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                    <p className="num text-sm font-semibold">{inr(rec.afc[k])}</p>
                    <p className={cn('num text-[11px]', v ? 'text-destructive' : 'text-success')}>{v ? `Station ${inrSigned(v)}` : 'Matched'}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <div><p className="text-[11px] text-muted-foreground">Expected (AFC)</p><p className="num font-semibold">{inr(rec.expected)}</p></div>
              <div><p className="text-[11px] text-muted-foreground">Reported (Station)</p><p className="num font-semibold">{inr(rec.reported)}</p></div>
              <div><p className="text-[11px] text-muted-foreground">Variance</p><p className="num font-semibold text-destructive">{inrSigned(rec.variance)} ({rec.variancePct.toFixed(2)}%)</p></div>
            </div>
          </SectionCard>

          <Card className="shadow-sm">
            <Tabs defaultValue="notes">
              <div className="border-b px-4 pt-3">
                <TabsList><TabsTrigger value="notes">Investigation notes ({t.notes.length})</TabsTrigger><TabsTrigger value="comms">Communications ({comms.length})</TabsTrigger><TabsTrigger value="files">Attachments ({t.attachments.length})</TabsTrigger></TabsList>
              </div>
              <TabsContent value="notes" className="p-4">
                <div className="space-y-3">
                  {t.notes.map((n) => (
                    <div key={n.id} className="rounded-lg border p-3">
                      <p className="text-xs"><b>{n.author}</b> <span className="text-muted-foreground">· {fmtDateTime(n.at)}</span></p>
                      <p className="mt-1 text-sm">{n.text}</p>
                    </div>
                  ))}
                  {t.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                </div>
                {edit && (
                  <div className="mt-4 space-y-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add investigation note…" rows={3} />
                    <Button size="sm" disabled={!note.trim()} onClick={() => { s.addNote(t.id, note.trim()); setNote(''); toast.success('Note added'); }}>Add note</Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="comms" className="p-4"><CommTimeline items={comms} /></TabsContent>
              <TabsContent value="files" className="p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {t.attachments.map((a) => (
                    <div key={a} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="flex-1 truncate">{a}</span><span className="text-[10px] text-muted-foreground">placeholder</span></div>
                  ))}
                </div>
                {edit && (
                  <>
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { s.addAttachment(t.id, f.name); toast.success(`${f.name} attached (stored locally only)`); } e.target.value = ''; }} />
                    <button onClick={() => fileRef.current?.click()} className="mt-3 flex w-full flex-col items-center rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                      <Paperclip className="mb-1 h-5 w-5" />Attach shift report, deposit slip or CCTV log
                      <span className="text-[11px]">Prototype: file name only, nothing uploaded</span>
                    </button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionCard title="Details">
            <dl className="space-y-2.5 text-sm">
              {[
                ['Station SPOC', t.spoc], ['SPOC phone', s.can('pii.view') ? st.spoc.phone : maskPhone(st.spoc.phone)], ['Internal owner', t.owner],
                ['Created', fmtDateTime(t.createdAt)], ['SLA due', fmtDateTime(t.slaDueAt)], ['Follow-up attempts', `${t.attempts} / ${s.settings.maxAttempts}`],
              ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
              <div className="flex justify-between"><dt className="text-muted-foreground">SLA</dt><dd className={sla.cls}>{sla.label}</dd></div>
            </dl>
            {t.resolution && <div className="mt-3 rounded-lg bg-success/10 p-3 text-xs text-success"><b>Resolution:</b> {t.resolution}</div>}
          </SectionCard>
          <SectionCard title="Status history">
            <ol className="relative space-y-4 border-l pl-4">
              {[...t.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                  <div className="flex items-center gap-2"><TicketStatusBadge status={h.status} /><span className="text-[11px] text-muted-foreground">{fmtDateTime(h.at)}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">by {h.by}{h.note ? ` — ${h.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign ticket</DialogTitle><DialogDescription>Choose the internal owner responsible for this investigation.</DialogDescription></DialogHeader>
          <FilterSelect value={owner} onChange={setOwner} className="w-full" options={INTERNAL_OWNERS.map((o) => ({ value: o, label: o }))} />
          <DialogFooter><Button onClick={() => { s.assignTicket(t.id, owner); setAssignOpen(false); toast.success(`Assigned to ${owner}`); }}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resOpen} onOpenChange={setResOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve {t.id}</DialogTitle><DialogDescription>The linked reconciliation record will be marked Reconciled.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Resolution type</Label><FilterSelect value={resType} onChange={setResType} className="mt-1 w-full" options={RES.map((r) => ({ value: r, label: r }))} /></div>
            <div><Label className="text-xs">Remarks</Label><Textarea value={resNote} onChange={(e) => setResNote(e.target.value)} rows={3} className="mt-1" placeholder="Evidence reviewed, adjustment reference…" /></div>
          </div>
          <DialogFooter><Button onClick={() => { s.resolveTicket(t.id, resNote ? `${resType}. ${resNote}` : resType); setResOpen(false); toast.success('Ticket resolved & record reconciled'); }}>Mark resolved</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={escOpen} onOpenChange={setEscOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escalate to a human agent?</AlertDialogTitle>
            <AlertDialogDescription>AI follow-ups will stop and the ticket will be routed to the Revenue Team supervisor queue for manual handling.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { s.setTicketStatus(t.id, 'Escalated', 'Manually escalated to human agent'); s.addComm({ ticketId: t.id, type: 'system', at: new Date().toISOString(), title: 'Human-in-the-loop handoff', summary: 'Ticket escalated; AI agent paused for this ticket.' }); toast.success('Escalated to human agent'); }}>Escalate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DrilldownDialog record={drill ? rec : null} onClose={() => setDrill(false)} />
    </div>
  );
}
