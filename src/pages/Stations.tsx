import { useState } from 'react';
import { Eye, EyeOff, Lock, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { PageHeader, SectionCard } from '../components/common';
import { LineSelect } from '../components/filters';
import { OPEN_STATUSES, useStore } from '../lib/store';
import { LINES } from '../lib/mockData';
import { maskEmail, maskPhone } from '../lib/format';
import type { Station } from '../lib/types';

const schema = z.object({
  name: z.string().min(3, 'Name is required'),
  phone: z.string().regex(/^\+91 \d{5} \d{5}$/, 'Format: +91 98765 43210'),
  email: z.string().email('Enter a valid email'),
  designation: z.string().min(2, 'Required'),
});

export default function Stations() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [line, setLine] = useState('all');
  const [reveal, setReveal] = useState<string | null>(null);
  const [edit, setEdit] = useState<Station | null>(null);
  const admin = s.can('admin');
  const pii = s.can('pii.view') || !s.settings.maskPii;
  const list = s.stations.filter((st) => (line === 'all' || st.lineId === line) && (!q || [st.name, st.code, st.spoc.name].some((x) => x.toLowerCase().includes(q.toLowerCase()))));
  const errs = edit ? schema.safeParse(edit.spoc) : null;
  const fe: Partial<Record<string, string[]>> = errs && !errs.success ? errs.error.flatten().fieldErrors : {};
  const teams = [...new Set(s.stations.map((x) => x.team))];

  return (
    <div>
      <PageHeader title="Stations & SPOCs" subtitle="Network configuration, station single points of contact and team mapping" />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {LINES.map((l) => {
          const sts = s.stations.filter((x) => x.lineId === l.id);
          return (
            <Card key={l.id} className="p-4 shadow-sm">
              <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${l.id === 'L1' ? 'bg-chart-1' : 'bg-chart-3'}`} /><p className="font-semibold">{l.name}</p><span className="text-xs text-muted-foreground">{l.route}</span></div>
              <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
                {sts.map((st, i) => (
                  <div key={st.id} className="flex items-center">
                    <div className="flex flex-col items-center"><span className={`h-3 w-3 rounded-full border-2 bg-card ${l.id === 'L1' ? 'border-chart-1' : 'border-chart-3'}`} /><span className="mt-1 whitespace-nowrap text-[10px] font-medium">{st.code}</span></div>
                    {i < sts.length - 1 && <span className={`mx-1 mb-4 h-0.5 w-10 ${l.id === 'L1' ? 'bg-chart-1' : 'bg-chart-3'}`} />}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station or SPOC…" className="h-9 w-56 pl-8" /></div>
          <LineSelect value={line} onChange={setLine} />
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />{pii ? 'Full contact access' : 'Contact details masked for your role'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5 text-left">Station</th><th className="px-3 text-left">Line</th><th className="px-3 text-left">SPOC</th><th className="px-3 text-left">Contact</th><th className="px-3 text-left">Team</th><th className="px-3 text-right">Open tickets</th><th className="px-3 text-left">Active</th><th className="px-3" /></tr></thead>
            <tbody>
              {list.map((st) => {
                const show = pii && reveal === st.id;
                return (
                  <tr key={st.id} className="border-b">
                    <td className="px-3 py-2.5"><p className="font-medium">{st.name}</p><p className="text-[11px] text-muted-foreground">{st.code}</p></td>
                    <td className="px-3">{LINES.find((l) => l.id === st.lineId)?.name}</td>
                    <td className="px-3">{st.spoc.name}<p className="text-[11px] text-muted-foreground">{st.spoc.designation}</p></td>
                    <td className="num px-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div><p>{show ? st.spoc.phone : maskPhone(st.spoc.phone)}</p><p className="text-muted-foreground">{show ? st.spoc.email : maskEmail(st.spoc.email)}</p></div>
                        {pii && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReveal(show ? null : st.id); if (!show) s.log('PII revealed', st.spoc.name, 'Contact details viewed'); }}>{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>}
                      </div>
                    </td>
                    <td className="px-3 text-xs">{st.team}</td>
                    <td className="num px-3 text-right">{s.tickets.filter((t) => t.stationId === st.id && OPEN_STATUSES.includes(t.status)).length}</td>
                    <td className="px-3"><Switch checked={st.active} disabled={!admin} onCheckedChange={(v) => { s.updateStation({ ...st, active: v }); toast.success(`${st.name} ${v ? 'activated' : 'deactivated'}`); }} /></td>
                    <td className="px-3 text-right">{admin && <Button variant="ghost" size="sm" onClick={() => setEdit(st)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <SectionCard className="mt-4" title="Team configuration">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((t) => (
            <div key={t} className="rounded-lg border p-3"><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs text-muted-foreground">{s.stations.filter((x) => x.team === t).map((x) => x.name).join(', ')}</p></div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit SPOC — {edit?.name}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              {(['name', 'designation', 'phone', 'email'] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs capitalize">{k}</Label>
                  <Input className="mt-1" value={edit.spoc[k]} onChange={(e) => setEdit({ ...edit, spoc: { ...edit.spoc, [k]: e.target.value } })} />
                  {fe[k] && <p className="mt-1 text-xs text-destructive">{fe[k]![0]}</p>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button disabled={!errs?.success} onClick={() => { s.updateStation(edit!); setEdit(null); toast.success('SPOC updated'); }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
