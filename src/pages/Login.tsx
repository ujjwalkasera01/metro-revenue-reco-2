import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, TrainFront, CheckCircle2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { cn } from '@project/components/lib/utils';
import { useStore } from '../lib/store';
import { ROLE_INFO } from '../lib/format';
import { DEMO_USER_FOR_ROLE, USERS_SEED } from '../lib/mockData';
import type { Role } from '../lib/types';

const ROLES = Object.keys(ROLE_INFO) as Role[];

export default function Login() {
  const { login } = useStore();
  const [role, setRole] = useState<Role>('Revenue Team');
  const [loading, setLoading] = useState(false);
  const user = USERS_SEED.find((u) => u.id === DEMO_USER_FOR_ROLE[role])!;

  const submit = () => {
    setLoading(true);
    setTimeout(() => login(role), 900);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-lg bg-sidebar-primary p-2"><TrainFront className="h-6 w-6" /></div>
          <span className="text-lg font-bold">MetroRev</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Every rupee, reconciled.</h1>
          <p className="mt-4 text-sidebar-foreground">AFC vs station revenue reconciliation, automated discrepancy ticketing and AI-driven SPOC follow-ups — in one operations console.</p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground">
            {['10 stations across Blue & Green lines', 'Auto-ticketing with SLA tracking', 'AI voice follow-ups with human handoff', 'Signed monthly settlement reports'].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sidebar-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">Prototype for UI review · simulated data only</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a demo role to explore its dashboard and permissions.</p>
          <div className="mt-6 space-y-2">
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={cn('flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all',
                  role === r ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40')}>
                <span className={cn('h-8 w-1.5 rounded-full', ROLE_INFO[r].color)} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{r}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_INFO[r].desc}</span>
                </span>
                <span className={cn('h-4 w-4 rounded-full border-2', role === r ? 'border-[5px] border-primary' : 'border-input')} />
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <div><Label className="text-xs">Email</Label><Input value={user.email} readOnly className="mt-1 bg-muted" /></div>
            <div><Label className="text-xs">Password</Label><Input type="password" value="demo-password" readOnly className="mt-1 bg-muted" /></div>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Sign in as {user.name}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Authentication is simulated locally for this demo.</p>
        </motion.div>
      </div>
    </div>
  );
}
