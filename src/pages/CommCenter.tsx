import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Headset, Mail, PhoneIncoming, PhoneOutgoing, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { Input } from '@project/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { cn } from '@project/components/lib/utils';
import { DemoTag, PageHeader, SectionCard, SeverityBadge, TicketStatusBadge } from '../components/common';
import { FilterSelect } from '../components/filters';
import LiveCall from '../components/LiveCall';
import CommTimeline from '../components/CommTimeline';
import FollowUpConfig from '../components/FollowUpConfig';
import { useStore } from '../lib/store';
import { fmtDateTime, fmtDur, inr } from '../lib/format';

const AGENTS = [
  { name: 'Aria', lang: 'English / Hindi', status: 'On call', calls: 42 },
  { name: 'Veda', lang: 'Telugu / English', status: 'Available', calls: 37 },
  { name: 'Kabir', lang: 'Hindi / Kannada', status: 'Available', calls: 29 },
  { name: 'Human queue', lang: 'Revenue supervisors', status: '2 waiting', calls: 8 },
];

export default function CommCenter() {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('ticket') ? 'live' : 'queue');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const ticketId = params.get('ticket');
  const ticket = s.tickets.find((t) => t.id === ticketId) ?? null;

  const queue = useMemo(() => s.tickets
    .filter((t) => ['Open', 'Contacted', 'Awaiting Response'].includes(t.status) && t.attempts < s.settings.maxAttempts)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)), [s.tickets, s.settings.maxAttempts]);
  const calls = s.comms.filter((c) => c.type.startsWith('call'));
  const timeline = s.comms.filter((c) => (type === 'all' || c.type.startsWith(type)) && (!q || c.ticketId.toLowerCase().includes(q.toLowerCase()) || c.summary.toLowerCase().includes(q.toLowerCase())));

  const pick = (id: string) => { setParams({ ticket: id }); setTab('live'); };
  const simulateInbound = () => {
    const t = s.tickets.find((x) => x.status === 'Awaiting Response');
    if (!t) return toast.error('No tickets awaiting a SPOC response');
    s.addComm({ ticketId: t.id, type: 'call-in', at: new Date().toISOString(), title: 'Inbound call from SPOC', summary: `${t.spoc} called back: deposit slip uploaded, requests verification.`, outcome: 'Evidence submitted', durationSec: 96, sentiment: 'Positive', intent: 'Provide evidence', transcript: [{ speaker: 'SPOC', text: `Hi, this is ${t.spoc}. I've uploaded the deposit slip for ${t.id}.` }, { speaker: 'AI', text: 'Thank you! I can see the upload. I have moved the ticket to the revenue team for verification.' }] });
    s.setTicketStatus(t.id, 'In Progress', 'SPOC submitted evidence via inbound call');
    toast.success(`Inbound call logged on ${t.id}`);
  };

  return (
    <div>
      <PageHeader title="AI Calling & Communication Center" subtitle="Simulated AI voice agent following up with station SPOCs on discrepancies"
        actions={<><DemoTag>All calls & emails are simulated</DemoTag><Button variant="outline" onClick={simulateInbound}><PhoneIncoming className="mr-2 h-4 w-4" />Simulate inbound call</Button></>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {AGENTS.map((a) => (
          <Card key={a.name} className="flex items-center gap-3 p-3 shadow-sm">
            <div className={cn('relative flex h-10 w-10 items-center justify-center rounded-full', a.name === 'Human queue' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-primary/10 text-primary')}>
              {a.name === 'Human queue' ? <Headset className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card', a.status === 'On call' ? 'bg-destructive' : a.status === 'Available' ? 'bg-success' : 'bg-warning')} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{a.status} · {a.lang}</p>
            </div>
            <p className="num ml-auto text-xs text-muted-foreground">{a.calls} today</p>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="queue">Call queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="live">Live call</TabsTrigger>
          <TabsTrigger value="history">Call history</TabsTrigger>
          <TabsTrigger value="timeline">Unified timeline</TabsTrigger>
          <TabsTrigger value="config">Follow-up rules</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="overflow-x-auto shadow-sm">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2.5 text-left">Ticket</th><th className="px-3 text-left">SPOC / Station</th><th className="px-3 text-right">Amount</th><th className="px-3 text-left">Severity</th><th className="px-3 text-left">Status</th><th className="px-3 text-left">Attempts</th><th className="px-3" /></tr>
              </thead>
              <tbody>
                {queue.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="num px-3 py-2.5 font-semibold text-primary">{t.id}</td>
                    <td className="px-3">{t.spoc}<p className="text-[11px] text-muted-foreground">{s.stationById(t.stationId).name}</p></td>
                    <td className="num px-3 text-right text-destructive">{inr(t.amount)}</td>
                    <td className="px-3"><SeverityBadge severity={t.severity} /></td>
                    <td className="px-3"><TicketStatusBadge status={t.status} /></td>
                    <td className="px-3">
                      <div className="flex gap-1">{Array.from({ length: s.settings.maxAttempts }).map((_, i) => <span key={i} className={cn('h-1.5 w-5 rounded-full', i < t.attempts ? 'bg-primary' : 'bg-muted')} />)}</div>
                    </td>
                    <td className="px-3 text-right"><Button size="sm" variant="outline" onClick={() => pick(t.id)}><PhoneOutgoing className="mr-1.5 h-3.5 w-3.5" />Call</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {queue.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Queue is empty — all SPOCs contacted.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="live"><LiveCall ticket={ticket} onDone={() => queue[0] ? pick(queue.find((x) => x.id !== ticketId)?.id ?? queue[0].id) : setTab('queue')} /></TabsContent>

        <TabsContent value="history">
          <Card className="overflow-x-auto shadow-sm">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2.5 text-left">When</th><th className="px-3 text-left">Direction</th><th className="px-3 text-left">Ticket</th><th className="px-3 text-left">Outcome</th><th className="px-3 text-left">Sentiment</th><th className="px-3 text-right">Duration</th></tr>
              </thead>
              <tbody>
                {[...calls].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40).map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => pick(c.ticketId)}>
                    <td className="px-3 py-2.5 text-xs">{fmtDateTime(c.at)}</td>
                    <td className="px-3">{c.type === 'call-in' ? <span className="inline-flex items-center gap-1 text-sky-700"><PhoneIncoming className="h-3.5 w-3.5" />Inbound</span> : <span className="inline-flex items-center gap-1 text-primary"><PhoneOutgoing className="h-3.5 w-3.5" />Outbound</span>}</td>
                    <td className="num px-3 font-medium">{c.ticketId}</td>
                    <td className="px-3">{c.outcome}</td>
                    <td className={cn('px-3', c.sentiment === 'Positive' && 'text-success', c.sentiment === 'Negative' && 'text-destructive')}>{c.sentiment}</td>
                    <td className="num px-3 text-right">{fmtDur(c.durationSec ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <SectionCard title={<span className="flex items-center gap-2"><Mail className="h-4 w-4" />Calls, emails & follow-ups</span>}
            action={<div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket or text…" className="h-9 w-48 pl-8" /></div>
              <FilterSelect value={type} onChange={setType} className="w-[120px]" options={[{ value: 'all', label: 'All' }, { value: 'call', label: 'Calls' }, { value: 'email', label: 'Emails' }, { value: 'system', label: 'System' }]} /></div>}>
            <CommTimeline items={timeline.slice(0, 50)} showTicket />
          </SectionCard>
        </TabsContent>

        <TabsContent value="config">
          <SectionCard title="Follow-up attempts, retries & escalation"><FollowUpConfig /></SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
