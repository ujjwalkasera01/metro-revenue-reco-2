import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { useStore } from '../lib/store';
import type { Settings } from '../lib/types';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 border-b py-3 last:border-0">
      <div><Label className="text-sm">{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <div className="sm:w-56 sm:shrink-0 sm:text-right">{children}</div>
    </div>
  );
}

export function useDraft<K extends keyof Settings>(keys: K[]) {
  const { settings } = useStore();
  const [d, setD] = useState(() => Object.fromEntries(keys.map((k) => [k, settings[k]])) as Pick<Settings, K>);
  const set = <T extends K>(k: T, v: Settings[T]) => setD((x) => ({ ...x, [k]: v }));
  return { d, set };
}

export default function FollowUpConfig() {
  const { updateSettings, can } = useStore();
  const { d, set } = useDraft(['maxAttempts', 'retryHours', 'escalateAfterHours', 'humanHandoff', 'escalateOnNegative', 'escalateAbove', 'callWindowStart', 'callWindowEnd']);
  const ro = !can('comm.call') && !can('admin');
  const invalid = d.maxAttempts < 1 || d.maxAttempts > 10 || d.retryHours < 1 || d.escalateAfterHours < 1;
  return (
    <div>
      <Field label="Maximum follow-up attempts" hint="AI calls before automatic escalation (1–10)">
        <Input type="number" disabled={ro} value={d.maxAttempts} onChange={(e) => set('maxAttempts', Number(e.target.value))} className="sm:ml-auto sm:w-24" />
      </Field>
      <Field label="Retry interval (hours)" hint="Wait between unanswered attempts">
        <Input type="number" disabled={ro} value={d.retryHours} onChange={(e) => set('retryHours', Number(e.target.value))} className="sm:ml-auto sm:w-24" />
      </Field>
      <Field label="Escalate if unresolved after (hours)">
        <Input type="number" disabled={ro} value={d.escalateAfterHours} onChange={(e) => set('escalateAfterHours', Number(e.target.value))} className="sm:ml-auto sm:w-24" />
      </Field>
      <Field label="Auto-escalate discrepancies above (₹)" hint="Skip AI and route directly to a human">
        <Input type="number" disabled={ro} value={d.escalateAbove} onChange={(e) => set('escalateAbove', Number(e.target.value))} className="sm:ml-auto sm:w-32" />
      </Field>
      <Field label="Calling window" hint="IST, AI calls only within this window">
        <div className="flex items-center gap-1 sm:justify-end">
          <Input type="time" disabled={ro} value={d.callWindowStart} onChange={(e) => set('callWindowStart', e.target.value)} className="w-28" />–
          <Input type="time" disabled={ro} value={d.callWindowEnd} onChange={(e) => set('callWindowEnd', e.target.value)} className="w-28" />
        </div>
      </Field>
      <Field label="Human-in-the-loop handoff" hint="Transfer to a supervisor when attempts are exhausted">
        <Switch disabled={ro} checked={d.humanHandoff} onCheckedChange={(v) => set('humanHandoff', v)} />
      </Field>
      <Field label="Escalate on negative sentiment" hint="Immediately hand off if the SPOC is upset or requests a human">
        <Switch disabled={ro} checked={d.escalateOnNegative} onCheckedChange={(v) => set('escalateOnNegative', v)} />
      </Field>
      {invalid && <p className="mt-2 text-xs text-destructive">Attempts must be 1–10 and intervals at least 1 hour.</p>}
      {!ro && <Button className="mt-4" disabled={invalid} onClick={() => { updateSettings(d, 'Follow-up & escalation rules'); toast.success('Follow-up settings saved'); }}>Save changes</Button>}
    </div>
  );
}
