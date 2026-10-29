import { format, formatDistanceToNowStrict } from 'date-fns';
import type { Role } from './types';

export const inr = (n: number, digits = 0) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const inrSigned = (n: number) => (n < 0 ? '−' : n > 0 ? '+' : '') + inr(n);

export function inrCompact(n: number) {
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)} K`;
  return `${s}₹${a.toFixed(0)}`;
}

export const fmtDate = (d: string) => format(new Date(d.length === 10 ? d + 'T00:00:00' : d), 'dd MMM yyyy');
export const fmtDateTime = (d: string) => format(new Date(d), 'dd MMM, HH:mm');
export const fmtAgo = (d: string) => formatDistanceToNowStrict(new Date(d), { addSuffix: true });
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function maskPhone(p: string) {
  return p.slice(0, 7) + '•••• ' + p.slice(-2);
}
export function maskEmail(e: string) {
  const [u, d] = e.split('@');
  return u.slice(0, 2) + '•••@' + d;
}

export function downloadFile(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export type Permission =
  | 'tickets.edit' | 'tickets.escalate' | 'recon.run' | 'reports.approve' | 'reports.generate'
  | 'admin' | 'comm.call' | 'pii.view';

export const ROLE_PERMS: Record<Role, Permission[]> = {
  'Station Team': ['tickets.edit'],
  'AFC Team': ['recon.run', 'tickets.edit'],
  'Revenue Team': ['tickets.edit', 'tickets.escalate', 'recon.run', 'reports.generate', 'comm.call'],
  'Finance Team': ['reports.generate', 'reports.approve'],
  Administrator: ['tickets.edit', 'tickets.escalate', 'recon.run', 'reports.generate', 'reports.approve', 'admin', 'comm.call', 'pii.view'],
};

export const ROLE_INFO: Record<Role, { desc: string; color: string }> = {
  'Station Team': { desc: 'Submit station revenue, respond to discrepancy tickets', color: 'bg-sky-500' },
  'AFC Team': { desc: 'Manage AFC clearing data, sync & run reconciliation', color: 'bg-indigo-500' },
  'Revenue Team': { desc: 'Investigate discrepancies, drive follow-ups & escalations', color: 'bg-blue-600' },
  'Finance Team': { desc: 'Review settlement, approve & sign final reports', color: 'bg-emerald-600' },
  Administrator: { desc: 'Full access: users, configuration, audit & security', color: 'bg-slate-800' },
};
