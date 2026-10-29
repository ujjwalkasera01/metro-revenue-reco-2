import { useState } from 'react';
import { Check, Minus, Plus, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { cn } from '@project/components/lib/utils';
import { PageHeader, SectionCard } from '../components/common';
import { FilterSelect } from '../components/filters';
import { useStore } from '../lib/store';
import { ROLE_INFO, ROLE_PERMS, fmtAgo, maskEmail, type Permission } from '../lib/format';
import type { AppUser, Role } from '../lib/types';

const ROLES = Object.keys(ROLE_INFO) as Role[];
const PERM_LABEL: Record<Permission, string> = {
  'tickets.edit': 'Update tickets & add notes', 'tickets.escalate': 'Escalate / bulk resolve', 'recon.run': 'Run reconciliation',
  'reports.generate': 'Generate reports', 'reports.approve': 'Approve & sign reports', 'comm.call': 'Trigger AI calls',
  'pii.view': 'View unmasked contacts', admin: 'Administer users & settings',
};
const schema = z.object({ name: z.string().min(3, 'Name is required'), email: z.string().email('Valid email required').endsWith('@metrorail.in', 'Must be a @metrorail.in address'), scope: z.string().min(2, 'Required') });
const blank = (): AppUser => ({ id: 'U' + Date.now(), name: '', email: '', role: 'Revenue Team', status: 'Invited', lastActive: '', scope: 'All stations' });

export default function UsersPage() {
  const { users, upsertUser, settings } = useStore();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [edit, setEdit] = useState<AppUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const list = users.filter((u) => (role === 'all' || u.role === role) && (!q || [u.name, u.email].some((x) => x.toLowerCase().includes(q.toLowerCase()))));
  const v = edit ? schema.safeParse(edit) : null;
  const fe: Partial<Record<string, string[]>> = v && !v.success ? v.error.flatten().fieldErrors : {};

  return (
    <div>
      <PageHeader title="User Management" subtitle="Users, roles and access control"
        actions={<Button onClick={() => { setEdit(blank()); setIsNew(true); }}><Plus className="mr-2 h-4 w-4" />Invite user</Button>} />
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="h-9 w-56 pl-8" /></div>
          <FilterSelect value={role} onChange={setRole} className="w-[160px]" options={[{ value: 'all', label: 'All roles' }, ...ROLES.map((r) => ({ value: r, label: r }))]} />
          <span className="ml-auto text-xs text-muted-foreground">{list.length} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5 text-left">User</th><th className="px-3 text-left">Role</th><th className="px-3 text-left">Scope</th><th className="px-3 text-left">Status</th><th className="px-3 text-left">Last active</th><th className="px-3" /></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="px-3 py-2.5"><p className="font-medium">{u.name}</p><p className="num text-[11px] text-muted-foreground">{settings.maskPii ? maskEmail(u.email) : u.email}</p></td>
                  <td className="px-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium"><span className={cn('h-2 w-2 rounded-full', ROLE_INFO[u.role].color)} />{u.role}</span></td>
                  <td className="px-3 text-xs">{u.scope}</td>
                  <td className="px-3"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', u.status === 'Active' ? 'bg-success/10 text-success' : u.status === 'Invited' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>{u.status}</span></td>
                  <td className="px-3 text-xs text-muted-foreground">{u.lastActive ? fmtAgo(u.lastActive) : '—'}</td>
                  <td className="px-3 text-right"><Button variant="ghost" size="sm" onClick={() => { setEdit(u); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionCard className="mt-4" title="Role permission matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 text-left">Permission</th>{ROLES.map((r) => <th key={r} className="px-2 text-center font-medium">{r}</th>)}</tr></thead>
            <tbody>
              {(Object.keys(PERM_LABEL) as Permission[]).map((p) => (
                <tr key={p} className="border-b last:border-0">
                  <td className="py-2">{PERM_LABEL[p]}</td>
                  {ROLES.map((r) => <td key={r} className="text-center">{ROLE_PERMS[r].includes(p) ? <Check className="mx-auto h-4 w-4 text-success" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? 'Invite user' : `Edit ${edit?.name}`}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              {(['name', 'email', 'scope'] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs capitalize">{k}</Label>
                  <Input className="mt-1" value={edit[k]} disabled={k === 'email' && !isNew} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                  {fe[k] && <p className="mt-1 text-xs text-destructive">{fe[k]![0]}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Role</Label><FilterSelect value={edit.role} onChange={(r) => setEdit({ ...edit, role: r as Role })} className="mt-1 w-full" options={ROLES.map((r) => ({ value: r, label: r }))} /></div>
                <div><Label className="text-xs">Status</Label><FilterSelect value={edit.status} onChange={(s) => setEdit({ ...edit, status: s as AppUser['status'] })} className="mt-1 w-full" options={['Active', 'Invited', 'Suspended'].map((s) => ({ value: s, label: s }))} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button disabled={!v?.success} onClick={() => { upsertUser(edit!); toast.success(isNew ? `Invitation sent to ${edit!.email} (simulated)` : 'User updated'); setEdit(null); }}>{isNew ? 'Send invite' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
