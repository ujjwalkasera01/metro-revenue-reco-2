import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppUser, AuditEntry, Comm, ReconRecord, Role, Settings, Station, Ticket, TicketStatus } from './types';
import {
  AUDIT_SEED, DEMO_USER_FOR_ROLE, INTERNAL_OWNERS, SETTINGS_SEED, SLA_HOURS, STATIONS_SEED, TODAY, USERS_SEED,
  makeRecord, rand, seedRecords, seedTickets, severityFor,
} from './mockData';
import { ROLE_PERMS, type Permission } from './format';

export interface Report {
  id: string;
  period: string;
  status: 'Draft' | 'Pending Approval' | 'Approved';
  generatedAt: string;
  generatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  auditRef: string;
}

interface Session { userId: string; role: Role }

interface Store {
  session: Session | null;
  me: AppUser | null;
  can: (p: Permission) => boolean;
  login: (role: Role) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
  stations: Station[];
  records: ReconRecord[];
  tickets: Ticket[];
  comms: Comm[];
  users: AppUser[];
  audit: AuditEntry[];
  settings: Settings;
  reports: Report[];
  stationById: (id: string) => Station;
  runReconciliation: () => Promise<{ discrepancies: number; created: number }>;
  createTicketFor: (reconId: string) => Ticket | null;
  setTicketStatus: (id: string, status: TicketStatus, note?: string) => void;
  assignTicket: (id: string, owner: string) => void;
  addNote: (id: string, text: string) => void;
  addAttachment: (id: string, name: string) => void;
  resolveTicket: (id: string, resolution: string) => void;
  addComm: (c: Omit<Comm, 'id'>) => void;
  updateSettings: (s: Partial<Settings>, label: string) => void;
  updateStation: (s: Station) => void;
  upsertUser: (u: AppUser) => void;
  generateReport: (period: string) => Report;
  approveReport: (id: string) => void;
  log: (action: string, entity: string, detail: string, from?: string, to?: string) => void;
}

const Ctx = createContext<Store | null>(null);
const nowIso = () => new Date().toISOString();

const initial = (() => {
  const records = seedRecords();
  const { tickets, comms } = seedTickets(records, STATIONS_SEED);
  const closed = new Set(tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').map((t) => t.reconId));
  return { records: records.map((r) => (closed.has(r.id) ? { ...r, status: 'Reconciled' as const } : r)), tickets, comms };
})();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('mrr-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [stations, setStations] = useState(STATIONS_SEED);
  const [records, setRecords] = useState(initial.records);
  const [tickets, setTickets] = useState(initial.tickets);
  const [comms, setComms] = useState(initial.comms);
  const [users, setUsers] = useState(USERS_SEED);
  const [audit, setAudit] = useState(AUDIT_SEED);
  const [settings, setSettings] = useState(SETTINGS_SEED);
  const [reports, setReports] = useState<Report[]>([
    { id: 'RPT-2026-09', period: '2026-09', status: 'Approved', generatedAt: '2026-10-05T10:00:00', generatedBy: 'Meera Pillai', approvedBy: 'Ananya Joshi', approvedAt: '2026-10-28T18:20:00', auditRef: 'AUD-7F3K-0925' },
  ]);

  const me = useMemo(() => users.find((u) => u.id === session?.userId) ?? null, [users, session]);
  const actor = me?.name ?? 'System';
  const role = session?.role;

  const log = useCallback(
    (action: string, entity: string, detail: string, from?: string, to?: string) =>
      setAudit((a) => [{ id: 'A' + Date.now() + Math.random(), at: nowIso(), user: actor, role: role ?? 'System', action, entity, detail, from, to }, ...a]),
    [actor, role],
  );

  const startSession = (r: Role) => {
    const s = { role: r, userId: DEMO_USER_FOR_ROLE[r] };
    localStorage.setItem('mrr-session', JSON.stringify(s));
    setSession(s);
  };

  const stationById = useCallback((id: string) => stations.find((s) => s.id === id)!, [stations]);

  const buildTicket = (rec: ReconRecord, existing: Ticket[]): Ticket => {
    const st = stations.find((s) => s.id === rec.stationId)!;
    const sev = severityFor(rec.variance);
    const max = Math.max(...existing.map((t) => Number(t.id.split('-')[1])), 1000);
    const created = nowIso();
    return {
      id: `TKT-${max + 1}`, reconId: rec.id, stationId: st.id, lineId: st.lineId, date: rec.date,
      amount: rec.variance, severity: sev, spoc: st.spoc.name, owner: INTERNAL_OWNERS[max % 4], status: 'Open',
      createdAt: created, slaDueAt: new Date(Date.now() + SLA_HOURS[sev] * 3600000).toISOString(), attempts: 0,
      notes: [], attachments: [],
      history: [{ status: 'Open', at: created, by: 'System', note: 'Auto-created: AFC vs Station variance exceeded threshold' }],
    };
  };

  const runReconciliation = async () => {
    await new Promise((r) => setTimeout(r, 1600));
    const fresh = stations.map((s) => makeRecord(TODAY, s.id, rand, false, settings.tolerancePct));
    const disc = fresh.filter((r) => r.status === 'Discrepancy');
    setRecords((rs) => [...rs.filter((r) => r.date !== TODAY), ...fresh]);
    let created = 0;
    if (settings.autoTicket) {
      setTickets((ts) => {
        let next = ts.filter((t) => t.date !== TODAY || t.status !== 'Open');
        for (const rec of disc) {
          if (next.some((t) => t.reconId === rec.id)) continue;
          next = [buildTicket(rec, next), ...next];
          created++;
        }
        return next;
      });
    }
    log('Reconciliation run', `Batch ${TODAY}`, `${fresh.length} stations reconciled, ${disc.length} discrepancies detected`);
    return { discrepancies: disc.length, created: settings.autoTicket ? disc.length : 0 };
  };

  const createTicketFor = (reconId: string) => {
    const rec = records.find((r) => r.id === reconId);
    if (!rec || tickets.some((t) => t.reconId === reconId)) return null;
    const t = buildTicket(rec, tickets);
    setTickets((ts) => [t, ...ts]);
    log('Ticket created', t.id, `Manual ticket for ${stationById(rec.stationId).name}`);
    return t;
  };

  const patch = (id: string, fn: (t: Ticket) => Ticket) => setTickets((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  const setTicketStatus = (id: string, status: TicketStatus, note?: string) => {
    const prev = tickets.find((t) => t.id === id)?.status;
    patch(id, (t) => ({ ...t, status, history: [...t.history, { status, at: nowIso(), by: actor, note }] }));
    log('Status change', id, note ?? 'Status updated', prev, status);
  };

  const store: Store = {
    session, me,
    can: (p) => (role ? ROLE_PERMS[role].includes(p) : false),
    login: (r) => { startSession(r); },
    logout: () => { localStorage.removeItem('mrr-session'); setSession(null); },
    switchRole: (r) => { startSession(r); },
    stations, records, tickets, comms, users, audit, settings, reports, stationById,
    runReconciliation, createTicketFor, setTicketStatus,
    assignTicket: (id, owner) => {
      patch(id, (t) => ({ ...t, owner }));
      log('Ticket assigned', id, `Assigned to ${owner}`);
    },
    addNote: (id, text) => {
      patch(id, (t) => ({ ...t, notes: [...t.notes, { id: String(Date.now()), author: actor, text, at: nowIso() }] }));
      log('Note added', id, text.slice(0, 80));
    },
    addAttachment: (id, name) => {
      patch(id, (t) => ({ ...t, attachments: [...t.attachments, name] }));
      log('Attachment added', id, name);
    },
    resolveTicket: (id, resolution) => {
      const prev = tickets.find((t) => t.id === id)?.status;
      patch(id, (t) => ({ ...t, status: 'Resolved', resolution, history: [...t.history, { status: 'Resolved', at: nowIso(), by: actor, note: resolution }] }));
      setRecords((rs) => {
        const t = tickets.find((x) => x.id === id);
        return rs.map((r) => (r.id === t?.reconId ? { ...r, status: 'Reconciled' } : r));
      });
      log('Ticket resolved', id, resolution, prev, 'Resolved');
    },
    addComm: (c) => {
      setComms((cs) => [{ ...c, id: 'C' + Date.now() }, ...cs]);
      if (c.type === 'call-out') patch(c.ticketId, (t) => ({ ...t, attempts: t.attempts + 1 }));
    },
    updateSettings: (s, label) => {
      setSettings((x) => ({ ...x, ...s }));
      log('Settings change', label, 'Configuration updated');
    },
    updateStation: (s) => {
      setStations((ss) => ss.map((x) => (x.id === s.id ? s : x)));
      log('Station updated', s.name, `SPOC: ${s.spoc.name}`);
    },
    upsertUser: (u) => {
      const exists = users.find((x) => x.id === u.id);
      setUsers((us) => (exists ? us.map((x) => (x.id === u.id ? u : x)) : [...us, u]));
      log(exists ? 'User updated' : 'User invited', u.name, `${u.role} · ${u.status}`, exists?.role, u.role);
    },
    generateReport: (period) => {
      const r: Report = {
        id: `RPT-${period}`, period, status: 'Pending Approval', generatedAt: nowIso(), generatedBy: actor,
        auditRef: 'AUD-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + period.slice(2).replace('-', ''),
      };
      setReports((rs) => [r, ...rs.filter((x) => x.id !== r.id)]);
      log('Report generated', r.id, `Settlement report for ${period}`, undefined, 'Pending Approval');
      return r;
    },
    approveReport: (id) => {
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'Approved', approvedBy: actor, approvedAt: nowIso() } : r)));
      log('Report approved', id, 'Digitally signed (simulated)', 'Pending Approval', 'Approved');
    },
    log,
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export const OPEN_STATUSES: TicketStatus[] = ['Open', 'Contacted', 'In Progress', 'Awaiting Response', 'Escalated'];
export const ALL_STATUSES: TicketStatus[] = [...OPEN_STATUSES, 'Resolved', 'Closed'];
