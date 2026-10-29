import type {
  AppUser, AuditEntry, Breakdown, Comm, Line, ReconRecord, Settings, Severity, Station, Ticket, TicketStatus,
} from './types';

export const TODAY = '2026-10-29';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = mulberry32(20261029);

export function addDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const LINES: Line[] = [
  { id: 'L1', name: 'Blue Line', short: 'BL', route: 'Central Terminal ↔ Airport' },
  { id: 'L2', name: 'Green Line', short: 'GL', route: 'Old City ↔ Tech Park' },
];

const spoc = (name: string, phone: string, designation = 'Station Controller') => ({
  name, phone, designation,
  email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@metrorail.in',
});

export const STATIONS_SEED: Station[] = [
  { id: 'S01', code: 'CTM', name: 'Central Terminal', lineId: 'L1', spoc: spoc('Rakesh Sharma', '+91 98110 42387'), team: 'Station Ops – North', active: true },
  { id: 'S02', code: 'MGR', name: 'MG Road', lineId: 'L1', spoc: spoc('Priya Nair', '+91 98450 11823'), team: 'Station Ops – North', active: true },
  { id: 'S03', code: 'RJC', name: 'Rajiv Chowk', lineId: 'L1', spoc: spoc('Amit Verma', '+91 99100 67214'), team: 'Station Ops – Central', active: true },
  { id: 'S04', code: 'IND', name: 'Indiranagar', lineId: 'L1', spoc: spoc('Kavya Reddy', '+91 97401 33958'), team: 'Station Ops – Central', active: true },
  { id: 'S05', code: 'AIR', name: 'Airport Terminal', lineId: 'L1', spoc: spoc('Suresh Iyer', '+91 98860 21477', 'Senior Station Manager'), team: 'Station Ops – East', active: true },
  { id: 'S06', code: 'OCG', name: 'Old City Gate', lineId: 'L2', spoc: spoc('Fatima Khan', '+91 98200 58831'), team: 'Station Ops – West', active: true },
  { id: 'S07', code: 'CHM', name: 'Charminar', lineId: 'L2', spoc: spoc('Vikram Singh', '+91 99490 77102'), team: 'Station Ops – West', active: true },
  { id: 'S08', code: 'UNI', name: 'University', lineId: 'L2', spoc: spoc('Anjali Desai', '+91 98190 44569'), team: 'Station Ops – South', active: true },
  { id: 'S09', code: 'HTC', name: 'Hitech City', lineId: 'L2', spoc: spoc('Arjun Menon', '+91 97890 26631'), team: 'Station Ops – South', active: true },
  { id: 'S10', code: 'TPK', name: 'Tech Park', lineId: 'L2', spoc: spoc('Neha Gupta', '+91 98730 90145', 'Senior Station Manager'), team: 'Station Ops – South', active: true },
];

const BASE: Record<string, number> = {
  S01: 1180000, S02: 640000, S03: 920000, S04: 510000, S05: 870000,
  S06: 430000, S07: 560000, S08: 380000, S09: 990000, S10: 760000,
};

const sum = (b: Breakdown) => b.ticketSales + b.cardRecharge - b.refunds + b.adjustments;

export function makeRecord(date: string, stationId: string, r: () => number, forcePending = false, tolPct = 0.5): ReconRecord {
  const dow = new Date(date + 'T00:00:00').getDay();
  const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
  const base = BASE[stationId] * weekend * (0.9 + r() * 0.2);
  const ticketSales = Math.round(base * 0.68);
  const cardRecharge = Math.round(base * 0.32);
  const refunds = Math.round(base * (0.004 + r() * 0.008));
  const adjustments = Math.round((r() - 0.5) * 4000);
  const total = ticketSales + cardRecharge - refunds + adjustments;
  const cash = Math.round(total * (0.28 + r() * 0.1));
  const afc: Breakdown = { ticketSales, cardRecharge, cash, digital: total - cash, refunds, adjustments };
  const stn: Breakdown = { ...afc };
  const roll = r();
  if (roll < 0.22) {
    const kind = Math.floor(r() * 3);
    const delta = Math.round((r() < 0.75 ? -1 : 1) * base * (0.006 + r() * 0.05));
    if (kind === 0) { stn.cash += delta; stn.ticketSales += delta; }
    else if (kind === 1) { stn.refunds -= Math.round(delta / 2); stn.digital += Math.round(delta / 2); stn.cardRecharge += Math.round(delta / 2) + Math.round(delta / 2) * 0; }
    else { stn.digital += delta; stn.cardRecharge += delta; }
  } else if (roll < 0.3) {
    const d = Math.round((r() - 0.5) * 600);
    stn.cash += d; stn.ticketSales += d;
  }
  const expected = sum(afc);
  const reported = sum(stn);
  const variance = reported - expected;
  const variancePct = (variance / expected) * 100;
  const status = forcePending ? 'Pending' : Math.abs(variancePct) <= tolPct && Math.abs(variance) < 5000 ? 'Reconciled' : 'Discrepancy';
  const hh = String(6 + Math.floor(r() * 3)).padStart(2, '0');
  const mm = String(Math.floor(r() * 60)).padStart(2, '0');
  return {
    id: `RC-${date.replace(/-/g, '')}-${stationId}`,
    date, stationId, afc, stn, expected, reported, variance, variancePct,
    status,
    lastSync: `${addDays(date, 1)}T${hh}:${mm}:00`,
  };
}

export function seedRecords(): ReconRecord[] {
  const out: ReconRecord[] = [];
  for (let i = 60; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    for (const s of STATIONS_SEED) out.push(makeRecord(date, s.id, rand, i === 0));
  }
  return out;
}

export function severityFor(amount: number): Severity {
  const a = Math.abs(amount);
  if (a < 5000) return 'Low';
  if (a < 20000) return 'Medium';
  if (a < 50000) return 'High';
  return 'Critical';
}

export const SLA_HOURS: Record<Severity, number> = { Low: 72, Medium: 48, High: 24, Critical: 8 };

export const INTERNAL_OWNERS = ['Meera Pillai', 'Rohan Kapoor', 'Sanjay Bhatt', 'Divya Krishnan'];

const statusPath: TicketStatus[] = ['Open', 'Contacted', 'Awaiting Response', 'In Progress', 'Resolved', 'Closed'];

function addHours(iso: string, h: number) {
  return new Date(new Date(iso).getTime() + h * 3600000).toISOString();
}

export function seedTickets(records: ReconRecord[], stations: Station[]) {
  const tickets: Ticket[] = [];
  const comms: Comm[] = [];
  const disc = records.filter((r) => r.status === 'Discrepancy');
  let n = 1001;
  for (const rec of disc) {
    const st = stations.find((s) => s.id === rec.stationId)!;
    const ageDays = Math.round((new Date(TODAY).getTime() - new Date(rec.date).getTime()) / 86400000);
    const createdAt = rec.lastSync.slice(0, 16) + ':00.000Z';
    const sev = severityFor(rec.variance);
    // older tickets progress further along the lifecycle
    let idx: number;
    if (ageDays > 20) idx = 5;
    else if (ageDays > 10) idx = rand() < 0.7 ? 5 : 4;
    else if (ageDays > 4) idx = Math.floor(rand() * 5);
    else idx = Math.floor(rand() * 3);
    let status = statusPath[idx];
    if (idx < 4 && (sev === 'Critical' || sev === 'High') && rand() < 0.35) status = 'Escalated';
    const history = [{ status: 'Open' as TicketStatus, at: createdAt, by: 'System', note: 'Auto-created: AFC vs Station variance exceeded threshold' }];
    const path = status === 'Escalated' ? (['Contacted', 'Awaiting Response', 'Escalated'] as TicketStatus[]) : statusPath.slice(1, idx + 1);
    path.forEach((s, i) =>
      history.push({
        status: s, at: addHours(createdAt, (i + 1) * (3 + Math.floor(rand() * 8))),
        by: s === 'Contacted' ? 'AI Agent (Aria)' : INTERNAL_OWNERS[i % 4],
        note: s === 'Escalated' ? 'No satisfactory response after follow-ups; handed to human agent' : undefined,
      } as never),
    );
    const id = `TKT-${n++}`;
    const attempts = idx === 0 ? 0 : Math.min(3, 1 + Math.floor(rand() * 3));
    tickets.push({
      id, reconId: rec.id, stationId: st.id, lineId: st.lineId, date: rec.date,
      amount: rec.variance, severity: sev, spoc: st.spoc.name, owner: INTERNAL_OWNERS[n % 4],
      status, createdAt, slaDueAt: addHours(createdAt, SLA_HOURS[sev]), attempts,
      notes: idx > 2 ? [{ id: id + '-n1', author: INTERNAL_OWNERS[n % 4], at: addHours(createdAt, 10), text: 'SPOC confirmed cash bag count mismatch at closing shift. Requested CCTV & TOM shift report.' }] : [],
      history: history as Ticket['history'], attachments: idx > 3 ? ['TOM_shift_report.pdf'] : [],
      resolution: idx >= 4 ? 'Cash deposit slip reconciled; variance booked as late deposit adjustment.' : undefined,
    });
    if (attempts > 0) {
      comms.push(...seedComms(id, st.spoc.name, st.name, rec.variance, createdAt, attempts, status));
    }
  }
  return { tickets: tickets.reverse(), comms };
}

function seedComms(ticketId: string, spocName: string, station: string, amt: number, created: string, attempts: number, status: TicketStatus): Comm[] {
  const out: Comm[] = [];
  const a = Math.abs(amt).toLocaleString('en-IN');
  out.push({
    id: ticketId + '-e1', ticketId, type: 'email-out', at: addHours(created, 1),
    title: `Discrepancy notice – ${station}`, summary: `Automated notice sent to ${spocName} for a variance of ₹${a}.`,
  });
  for (let i = 0; i < attempts; i++) {
    const last = i === attempts - 1;
    const success = last && status !== 'Escalated';
    out.push({
      id: `${ticketId}-c${i}`, ticketId, type: 'call-out', at: addHours(created, 3 + i * 4),
      title: `AI follow-up call #${i + 1}`,
      summary: success ? `${spocName} acknowledged the variance and agreed to share the shift report.` : 'No answer / SPOC requested callback.',
      outcome: success ? 'Acknowledged' : i % 2 ? 'Callback requested' : 'No answer',
      durationSec: success ? 140 + Math.floor(rand() * 120) : 25 + Math.floor(rand() * 30),
      sentiment: success ? 'Positive' : 'Neutral', intent: success ? 'Acknowledge discrepancy' : 'Defer',
      transcript: success ? [
        { speaker: 'AI', text: `Hello ${spocName}, this is Aria, the revenue assistant. I'm calling about a ₹${a} variance at ${station}.` },
        { speaker: 'SPOC', text: 'Yes, I saw the email. I think the evening shift cash was deposited late.' },
        { speaker: 'AI', text: 'Thank you. Could you share the TOM shift report and deposit slip?' },
        { speaker: 'SPOC', text: "Sure, I'll upload it by end of day." },
      ] : undefined,
    });
  }
  if (status === 'Resolved' || status === 'Closed' || status === 'In Progress') {
    out.push({
      id: ticketId + '-e2', ticketId, type: 'email-in', at: addHours(created, 20),
      title: `RE: Discrepancy notice – ${station}`, summary: `${spocName} replied with the shift report and bank deposit slip.`,
    });
  }
  return out;
}

export const USERS_SEED: AppUser[] = [
  { id: 'U1', name: 'Rakesh Sharma', email: 'rakesh.sharma@metrorail.in', role: 'Station Team', status: 'Active', lastActive: '2026-10-29T10:42:00', scope: 'Central Terminal' },
  { id: 'U2', name: 'Kiran Rao', email: 'kiran.rao@metrorail.in', role: 'AFC Team', status: 'Active', lastActive: '2026-10-29T11:30:00', scope: 'All stations' },
  { id: 'U3', name: 'Meera Pillai', email: 'meera.pillai@metrorail.in', role: 'Revenue Team', status: 'Active', lastActive: '2026-10-29T11:58:00', scope: 'Blue Line' },
  { id: 'U4', name: 'Rohan Kapoor', email: 'rohan.kapoor@metrorail.in', role: 'Revenue Team', status: 'Active', lastActive: '2026-10-29T09:15:00', scope: 'Green Line' },
  { id: 'U5', name: 'Ananya Joshi', email: 'ananya.joshi@metrorail.in', role: 'Finance Team', status: 'Active', lastActive: '2026-10-28T18:20:00', scope: 'All stations' },
  { id: 'U6', name: 'Sanjay Bhatt', email: 'sanjay.bhatt@metrorail.in', role: 'Revenue Team', status: 'Active', lastActive: '2026-10-29T08:05:00', scope: 'All stations' },
  { id: 'U7', name: 'Divya Krishnan', email: 'divya.krishnan@metrorail.in', role: 'Revenue Team', status: 'Active', lastActive: '2026-10-27T16:44:00', scope: 'All stations' },
  { id: 'U8', name: 'Arvind Mehta', email: 'arvind.mehta@metrorail.in', role: 'Administrator', status: 'Active', lastActive: '2026-10-29T12:01:00', scope: 'Global' },
  { id: 'U9', name: 'Pooja Bansal', email: 'pooja.bansal@metrorail.in', role: 'Finance Team', status: 'Invited', lastActive: '', scope: 'All stations' },
  { id: 'U10', name: 'Fatima Khan', email: 'fatima.khan@metrorail.in', role: 'Station Team', status: 'Suspended', lastActive: '2026-09-30T14:10:00', scope: 'Old City Gate' },
];

export const DEMO_USER_FOR_ROLE: Record<string, string> = {
  'Station Team': 'U1', 'AFC Team': 'U2', 'Revenue Team': 'U3', 'Finance Team': 'U5', Administrator: 'U8',
};

export const AUDIT_SEED: AuditEntry[] = [
  { id: 'A1', at: '2026-10-29T11:58:00', user: 'Meera Pillai', role: 'Revenue Team', action: 'Status change', entity: 'TKT-1188', detail: 'Ticket moved after SPOC response', from: 'Contacted', to: 'In Progress' },
  { id: 'A2', at: '2026-10-29T11:30:00', user: 'Kiran Rao', role: 'AFC Team', action: 'AFC sync', entity: 'All stations', detail: 'AFC clearing-house data imported (10 stations)' },
  { id: 'A3', at: '2026-10-29T10:42:00', user: 'Rakesh Sharma', role: 'Station Team', action: 'Data submission', entity: 'Central Terminal', detail: 'Daily station revenue statement submitted for 28 Oct' },
  { id: 'A4', at: '2026-10-29T09:00:00', user: 'System', role: 'System', action: 'Reconciliation run', entity: 'Batch 28-Oct', detail: 'Automated reconciliation completed; discrepancies flagged' },
  { id: 'A5', at: '2026-10-28T18:20:00', user: 'Ananya Joshi', role: 'Finance Team', action: 'Report approved', entity: 'RPT-2026-09', detail: 'September settlement report approved & signed', from: 'Pending Approval', to: 'Approved' },
  { id: 'A6', at: '2026-10-28T16:05:00', user: 'Arvind Mehta', role: 'Administrator', action: 'Settings change', entity: 'Reconciliation thresholds', detail: 'Tolerance updated', from: '0.75%', to: '0.50%' },
  { id: 'A7', at: '2026-10-28T14:12:00', user: 'AI Agent (Aria)', role: 'System', action: 'Escalation', entity: 'TKT-1172', detail: 'Max follow-up attempts reached – handed to human agent', from: 'Awaiting Response', to: 'Escalated' },
  { id: 'A8', at: '2026-10-28T11:47:00', user: 'Arvind Mehta', role: 'Administrator', action: 'User invited', entity: 'Pooja Bansal', detail: 'Invited with Finance Team role' },
  { id: 'A9', at: '2026-10-27T17:30:00', user: 'Arvind Mehta', role: 'Administrator', action: 'Role change', entity: 'Fatima Khan', detail: 'Account suspended pending transfer', from: 'Active', to: 'Suspended' },
  { id: 'A10', at: '2026-10-27T10:02:00', user: 'Rohan Kapoor', role: 'Revenue Team', action: 'Ticket resolved', entity: 'TKT-1150', detail: 'Variance booked as late deposit', from: 'In Progress', to: 'Resolved' },
];

export const SETTINGS_SEED: Settings = {
  tolerancePct: 0.5, toleranceAmount: 5000, autoTicket: true,
  maxAttempts: 3, retryHours: 4, escalateAfterHours: 24, humanHandoff: true, escalateOnNegative: true, escalateAbove: 50000,
  callWindowStart: '09:00', callWindowEnd: '20:00',
  notifyEmail: true, notifySms: false, notifyInApp: true, dailyDigest: true,
  signatory: 'Ananya Joshi', signatoryTitle: 'Chief Finance Officer (Revenue)', autoGenerateReport: false, reportFormat: 'PDF',
  mfa: true, maskPii: true, sessionTimeout: 30, ipAllowlist: '10.20.0.0/16, 172.16.4.0/24', dataRetentionDays: 2555,
};
