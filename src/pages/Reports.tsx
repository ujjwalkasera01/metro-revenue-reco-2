import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, PenLine, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Card } from '@project/components/ui/card';
import { cn } from '@project/components/lib/utils';
import { DemoTag, KpiCard, PageHeader, SectionCard } from '../components/common';
import { FilterSelect } from '../components/filters';
import { OPEN_STATUSES, useStore } from '../lib/store';
import { LINES } from '../lib/mockData';
import { fmtDateTime, inr, inrCompact, inrSigned } from '../lib/format';
import { reportCsv, reportPdf, type ReportRow } from '../lib/reportExport';
import { IndianRupee, Scale, Ticket as TicketIcon } from 'lucide-react';

const PERIODS = [{ value: '2026-10', label: 'October 2026' }, { value: '2026-09', label: 'September 2026' }];

export default function Reports() {
  const s = useStore();
  const nav = useNavigate();
  const [period, setPeriod] = useState('2026-10');
  const [busy, setBusy] = useState(false);
  const label = PERIODS.find((p) => p.value === period)!.label;
  const recs = s.records.filter((r) => r.date.startsWith(period) && r.status !== 'Pending');
  const openT = s.tickets.filter((t) => t.date.startsWith(period) && OPEN_STATUSES.includes(t.status));
  const report = s.reports.find((r) => r.period === period);

  const rows: ReportRow[] = useMemo(() => s.stations.map((st) => {
    const rs = recs.filter((r) => r.stationId === st.id);
    const expected = rs.reduce((a, r) => a + r.expected, 0);
    const reported = rs.reduce((a, r) => a + r.reported, 0);
    return {
      code: st.code, name: st.name, line: LINES.find((l) => l.id === st.lineId)!.name, expected, reported,
      adjustments: rs.reduce((a, r) => a + r.afc.adjustments, 0), variance: reported - expected,
      status: rs.some((r) => r.status === 'Discrepancy') ? 'Open items' : 'Reconciled',
    };
  }), [recs, s.stations]);
  const tot = rows.reduce((a, r) => ({ e: a.e + r.expected, p: a.p + r.reported, adj: a.adj + r.adjustments, v: a.v + r.variance }), { e: 0, p: 0, adj: 0, v: 0 });
  const meta = report && { id: report.id, periodLabel: label, status: report.status, auditRef: report.auditRef, signatory: s.settings.signatory, signatoryTitle: s.settings.signatoryTitle, approvedAt: report.approvedAt, generatedBy: report.generatedBy };

  const generate = () => {
    setBusy(true);
    setTimeout(() => { s.generateReport(period); setBusy(false); toast.success('Final reconciliation report generated'); }, 1400);
  };
  const autoResolve = () => {
    openT.forEach((t) => s.resolveTicket(t.id, 'Bulk-resolved for period close (demo)'));
    toast.success(`${openT.length} tickets resolved (demo)`);
  };

  return (
    <div>
      <PageHeader title="Revenue Reports & Settlement" subtitle="Final reconciliation and settlement, generated once all discrepancies are resolved"
        actions={<FilterSelect value={period} onChange={setPeriod} className="w-[170px]" options={PERIODS} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Expected (AFC)" value={inrCompact(tot.e)} icon={IndianRupee} />
        <KpiCard label="Reported (Stations)" value={inrCompact(tot.p)} icon={IndianRupee} />
        <KpiCard label={tot.v < 0 ? 'Net receivable' : 'Net payable'} value={inrCompact(Math.abs(tot.v))} icon={Scale} tone={tot.v < 0 ? 'danger' : 'success'} />
        <KpiCard label="Unresolved tickets" value={openT.length} icon={TicketIcon} tone={openT.length ? 'warning' : 'success'} />
      </div>

      {!report && (
        <Card className={cn('mb-4 flex flex-col gap-3 p-4 shadow-sm sm:flex-row sm:items-center', openT.length ? 'border-warning/40 bg-warning/5' : 'border-success/40 bg-success/5')}>
          {openT.length ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
          <div className="flex-1 text-sm">
            {openT.length ? <><b>{openT.length} discrepancies are still open</b> for {label}. The final report can be generated once all are resolved.</> : <><b>All discrepancies resolved.</b> {label} is ready for final reconciliation.</>}
          </div>
          {openT.length > 0 && <Button variant="outline" onClick={() => nav('/tickets')}>Review tickets</Button>}
          {openT.length > 0 && s.can('tickets.escalate') && <Button variant="outline" onClick={autoResolve}><Wand2 className="mr-2 h-4 w-4" />Resolve all (demo)</Button>}
          {s.can('reports.generate') && <Button disabled={openT.length > 0 || busy} onClick={generate}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Generate final report</Button>}
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Station-wise summary" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr className="border-b"><th className="py-2 text-left">Station</th><th className="text-right">Expected</th><th className="text-right">Reported</th><th className="text-right">Adjustments</th><th className="text-right">Balance</th><th className="pl-3 text-left">Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b">
                    <td className="py-2"><span className="font-medium">{r.name}</span> <span className="text-[11px] text-muted-foreground">{r.code}</span></td>
                    <td className="num text-right">{inr(r.expected)}</td><td className="num text-right">{inr(r.reported)}</td>
                    <td className="num text-right">{inrSigned(r.adjustments)}</td>
                    <td className={cn('num text-right', r.variance < 0 ? 'text-destructive' : r.variance > 0 ? 'text-success' : '')}>{inrSigned(r.variance)}</td>
                    <td className="pl-3"><span className={cn('text-xs font-medium', r.status === 'Reconciled' ? 'text-success' : 'text-warning')}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-semibold"><tr><td className="py-2">Total</td><td className="num text-right">{inr(tot.e)}</td><td className="num text-right">{inr(tot.p)}</td><td className="num text-right">{inrSigned(tot.adj)}</td><td className="num text-right">{inrSigned(tot.v)}</td><td /></tr></tfoot>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="Line-wise summary">
          {LINES.map((l) => {
            const lr = rows.filter((r) => r.line === l.name);
            const e = lr.reduce((a, r) => a + r.expected, 0); const v = lr.reduce((a, r) => a + r.variance, 0);
            return (
              <div key={l.id} className="mb-3 rounded-lg border p-3 last:mb-0">
                <p className="text-sm font-semibold">{l.name} <span className="text-xs font-normal text-muted-foreground">· {l.route}</span></p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Revenue</p><p className="num font-semibold">{inrCompact(e)}</p></div>
                  <div><p className="text-muted-foreground">Net balance</p><p className={cn('num font-semibold', v < 0 && 'text-destructive')}>{inrSigned(v)}</p></div>
                  <div><p className="text-muted-foreground">Stations</p><p className="font-semibold">{lr.length}</p></div>
                  <div><p className="text-muted-foreground">Open items</p><p className="font-semibold">{lr.filter((r) => r.status !== 'Reconciled').length}</p></div>
                </div>
              </div>
            );
          })}
        </SectionCard>
      </div>

      {report && meta && (
        <Card className="mt-4 overflow-hidden shadow-md">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-3">
            <p className="text-sm font-semibold">Report preview</p><DemoTag />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { reportCsv(meta, rows); toast.success('CSV downloaded'); }}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Download CSV</Button>
              <Button variant="outline" size="sm" onClick={async () => { await reportPdf(meta, rows); toast.success('PDF downloaded'); }}><Download className="mr-1.5 h-4 w-4" />Download PDF</Button>
              {report.status !== 'Approved' && s.can('reports.approve') && <Button size="sm" onClick={() => { s.approveReport(report.id); toast.success('Report approved & signed (simulated)'); }}><PenLine className="mr-1.5 h-4 w-4" />Approve & sign</Button>}
            </div>
          </div>
          <div className="mx-auto max-w-3xl p-6 sm:p-10">
            <div className="flex items-start justify-between border-b-2 border-primary pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">MetroRev · Revenue Control</p><h2 className="mt-1 text-xl font-bold">Final Revenue Reconciliation & Settlement</h2><p className="text-sm text-muted-foreground">{label}</p></div>
              <div className="text-right text-xs"><p className="num font-semibold">{report.id}</p><p className="text-muted-foreground">Audit ref <span className="num">{report.auditRef}</span></p><p className="text-muted-foreground">Generated {fmtDateTime(report.generatedAt)}</p></div>
            </div>
            <div className="my-5 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Total expected</p><p className="num font-semibold">{inr(tot.e)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total reported</p><p className="num font-semibold">{inr(tot.p)}</p></div>
              <div><p className="text-xs text-muted-foreground">Final {tot.v < 0 ? 'receivable' : 'payable'}</p><p className="num font-semibold text-primary">{inr(tot.v)}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">All {rows.length} stations across {LINES.length} lines reconciled. Adjustments of {inrSigned(tot.adj)} applied per approved resolutions.</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authorised signatory</p>
                <div className={cn('mt-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed', report.status === 'Approved' && 'border-success/40 bg-success/5')}>
                  {report.status === 'Approved' ? <span className="font-serif text-2xl italic text-primary">{report.approvedBy}</span> : <span className="text-xs text-muted-foreground">Signature placeholder</span>}
                </div>
                <p className="mt-2 text-sm font-medium">{s.settings.signatory}</p><p className="text-xs text-muted-foreground">{s.settings.signatoryTitle}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval status</p>
                <p className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', report.status === 'Approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                  {report.status === 'Approved' ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}{report.status}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Prepared by {report.generatedBy}{report.approvedAt && <> · Approved {fmtDateTime(report.approvedAt)}</>}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
