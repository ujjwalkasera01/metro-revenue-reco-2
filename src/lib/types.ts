export type Role = 'Station Team' | 'AFC Team' | 'Revenue Team' | 'Finance Team' | 'Administrator';
export type LineId = 'L1' | 'L2';
export type ReconStatus = 'Reconciled' | 'Discrepancy' | 'Pending';
export type TicketStatus =
  | 'Open'
  | 'Contacted'
  | 'In Progress'
  | 'Awaiting Response'
  | 'Escalated'
  | 'Resolved'
  | 'Closed';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Line {
  id: LineId;
  name: string;
  short: string;
  route: string;
}

export interface Spoc {
  name: string;
  phone: string;
  email: string;
  designation: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  lineId: LineId;
  spoc: Spoc;
  team: string;
  active: boolean;
}

export interface Breakdown {
  ticketSales: number;
  cardRecharge: number;
  cash: number;
  digital: number;
  refunds: number;
  adjustments: number;
}

export interface ReconRecord {
  id: string;
  date: string; // yyyy-mm-dd
  stationId: string;
  afc: Breakdown;
  stn: Breakdown;
  expected: number;
  reported: number;
  variance: number;
  variancePct: number;
  status: ReconStatus;
  lastSync: string;
}

export interface Note {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface HistoryEntry {
  status: TicketStatus;
  at: string;
  by: string;
  note?: string;
}

export interface Ticket {
  id: string;
  reconId: string;
  stationId: string;
  lineId: LineId;
  date: string;
  amount: number;
  severity: Severity;
  spoc: string;
  owner: string;
  status: TicketStatus;
  createdAt: string;
  slaDueAt: string;
  attempts: number;
  notes: Note[];
  history: HistoryEntry[];
  attachments: string[];
  resolution?: string;
}

export type CommType = 'call-out' | 'call-in' | 'email-out' | 'email-in' | 'system';

export interface TranscriptLine {
  speaker: 'AI' | 'SPOC';
  text: string;
}

export interface Comm {
  id: string;
  ticketId: string;
  type: CommType;
  at: string;
  title: string;
  summary: string;
  outcome?: string;
  durationSec?: number;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  intent?: string;
  transcript?: TranscriptLine[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Invited' | 'Suspended';
  lastActive: string;
  scope: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  role: Role | 'System';
  action: string;
  entity: string;
  detail: string;
  from?: string;
  to?: string;
}

export interface Settings {
  tolerancePct: number;
  toleranceAmount: number;
  autoTicket: boolean;
  maxAttempts: number;
  retryHours: number;
  escalateAfterHours: number;
  humanHandoff: boolean;
  escalateOnNegative: boolean;
  escalateAbove: number;
  callWindowStart: string;
  callWindowEnd: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  dailyDigest: boolean;
  signatory: string;
  signatoryTitle: string;
  autoGenerateReport: boolean;
  reportFormat: 'PDF' | 'CSV';
  mfa: boolean;
  maskPii: boolean;
  sessionTimeout: number;
  ipAllowlist: string;
  dataRetentionDays: number;
}
