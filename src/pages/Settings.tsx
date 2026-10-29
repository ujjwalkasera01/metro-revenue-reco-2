import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Switch } from '@project/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { PageHeader, SectionCard } from '../components/common';
import { FilterSelect } from '../components/filters';
import FollowUpConfig, { Field, useDraft } from '../components/FollowUpConfig';
import { useStore } from '../lib/store';

function Save({ ok, onSave }: { ok: boolean; onSave: () => void }) {
  const { can } = useStore();
  if (!can('admin')) return <p className="mt-4 text-xs text-muted-foreground">Read-only — only Administrators can change these settings.</p>;
  return <Button className="mt-4" disabled={!ok} onClick={onSave}>Save changes</Button>;
}

function Thresholds() {
  const { updateSettings, can } = useStore();
  const { d, set } = useDraft(['tolerancePct', 'toleranceAmount', 'autoTicket']);
  const ro = !can('admin');
  const ok = d.tolerancePct >= 0 && d.tolerancePct <= 5 && d.toleranceAmount >= 0;
  return (
    <SectionCard title="Reconciliation thresholds">
      <Field label="Variance tolerance (%)" hint="Differences within this % are auto-reconciled (0–5)"><Input type="number" step="0.05" disabled={ro} value={d.tolerancePct} onChange={(e) => set('tolerancePct', Number(e.target.value))} className="sm:ml-auto sm:w-28" /></Field>
      <Field label="Absolute tolerance (₹)" hint="And below this rupee amount"><Input type="number" disabled={ro} value={d.toleranceAmount} onChange={(e) => set('toleranceAmount', Number(e.target.value))} className="sm:ml-auto sm:w-32" /></Field>
      <Field label="Auto-create tickets" hint="Raise a ticket for every discrepancy detected"><Switch disabled={ro} checked={d.autoTicket} onCheckedChange={(v) => set('autoTicket', v)} /></Field>
      {!ok && <p className="text-xs text-destructive">Tolerance must be between 0 and 5%.</p>}
      <Save ok={ok} onSave={() => { updateSettings(d, 'Reconciliation thresholds'); toast.success('Thresholds saved'); }} />
    </SectionCard>
  );
}

function Notifications() {
  const { updateSettings, can } = useStore();
  const { d, set } = useDraft(['notifyEmail', 'notifySms', 'notifyInApp', 'dailyDigest']);
  const ro = !can('admin');
  return (
    <SectionCard title="Notification preferences">
      <Field label="Email alerts" hint="New discrepancies and escalations"><Switch disabled={ro} checked={d.notifyEmail} onCheckedChange={(v) => set('notifyEmail', v)} /></Field>
      <Field label="SMS alerts" hint="Critical severity only"><Switch disabled={ro} checked={d.notifySms} onCheckedChange={(v) => set('notifySms', v)} /></Field>
      <Field label="In-app notifications"><Switch disabled={ro} checked={d.notifyInApp} onCheckedChange={(v) => set('notifyInApp', v)} /></Field>
      <Field label="Daily digest" hint="08:00 IST summary of open items"><Switch disabled={ro} checked={d.dailyDigest} onCheckedChange={(v) => set('dailyDigest', v)} /></Field>
      <Save ok onSave={() => { updateSettings(d, 'Notification preferences'); toast.success('Notification preferences saved'); }} />
    </SectionCard>
  );
}

function Reporting() {
  const { updateSettings, can } = useStore();
  const { d, set } = useDraft(['signatory', 'signatoryTitle', 'autoGenerateReport', 'reportFormat']);
  const ro = !can('admin');
  const ok = d.signatory.trim().length > 2 && d.signatoryTitle.trim().length > 2;
  return (
    <SectionCard title="Reporting settings">
      <Field label="Authorised signatory"><Input disabled={ro} value={d.signatory} onChange={(e) => set('signatory', e.target.value)} /></Field>
      <Field label="Signatory title"><Input disabled={ro} value={d.signatoryTitle} onChange={(e) => set('signatoryTitle', e.target.value)} /></Field>
      <Field label="Default export format"><FilterSelect value={d.reportFormat} onChange={(v) => set('reportFormat', v as 'PDF' | 'CSV')} className="w-full" options={[{ value: 'PDF', label: 'PDF' }, { value: 'CSV', label: 'CSV' }]} /></Field>
      <Field label="Auto-generate at period close" hint="When all discrepancies are resolved"><Switch disabled={ro} checked={d.autoGenerateReport} onCheckedChange={(v) => set('autoGenerateReport', v)} /></Field>
      <Save ok={ok} onSave={() => { updateSettings(d, 'Reporting settings'); toast.success('Reporting settings saved'); }} />
    </SectionCard>
  );
}

function Security() {
  const { updateSettings, can } = useStore();
  const { d, set } = useDraft(['mfa', 'maskPii', 'sessionTimeout', 'ipAllowlist', 'dataRetentionDays']);
  const ro = !can('admin');
  const ok = d.sessionTimeout >= 5 && d.sessionTimeout <= 240;
  return (
    <SectionCard title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Security & compliance</span>}>
      <Field label="Enforce multi-factor authentication"><Switch disabled={ro} checked={d.mfa} onCheckedChange={(v) => set('mfa', v)} /></Field>
      <Field label="Mask SPOC contact details (PII)" hint="Phone/email masked for non-admin roles"><Switch disabled={ro} checked={d.maskPii} onCheckedChange={(v) => set('maskPii', v)} /></Field>
      <Field label="Session timeout (minutes)" hint="5–240"><Input type="number" disabled={ro} value={d.sessionTimeout} onChange={(e) => set('sessionTimeout', Number(e.target.value))} className="sm:ml-auto sm:w-24" /></Field>
      <Field label="IP allowlist" hint="Comma-separated CIDR ranges"><Input disabled={ro} value={d.ipAllowlist} onChange={(e) => set('ipAllowlist', e.target.value)} /></Field>
      <Field label="Audit data retention (days)" hint="Default 7 years"><Input type="number" disabled={ro} value={d.dataRetentionDays} onChange={(e) => set('dataRetentionDays', Number(e.target.value))} className="sm:ml-auto sm:w-28" /></Field>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {['Call recordings encrypted at rest (AES-256)', 'Role-based access control enforced', 'Audit trail write-once'].map((x) => (
          <div key={x} className="rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-success">✓ {x}</div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Compliance indicators are illustrative for the prototype.</p>
      <Save ok={ok} onSave={() => { updateSettings(d, 'Security & compliance'); toast.success('Security settings saved'); }} />
    </SectionCard>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Reconciliation, follow-up, notification, escalation, reporting and security configuration" />
      <Tabs defaultValue="thresholds">
        <TabsList className="mb-4 h-auto flex-wrap">
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="followup">Follow-up & escalation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
          <TabsTrigger value="security">Security & compliance</TabsTrigger>
        </TabsList>
        <div className="max-w-3xl">
          <TabsContent value="thresholds"><Thresholds /></TabsContent>
          <TabsContent value="followup"><SectionCard title="Follow-up & escalation rules"><FollowUpConfig /></SectionCard></TabsContent>
          <TabsContent value="notifications"><Notifications /></TabsContent>
          <TabsContent value="reporting"><Reporting /></TabsContent>
          <TabsContent value="security"><Security /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
