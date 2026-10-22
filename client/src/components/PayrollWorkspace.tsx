// @ts-nocheck
import { useMemo, useState } from "react";
import { Banknote, Download, FileCheck2, LoaderCircle, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_KENYA_PAYROLL_RULES } from "@shared/payroll";
import { trpc } from "@/lib/trpc";

const control = "w-full rounded-lg border border-[#d7ddd5] bg-white px-3 py-2 text-sm text-[#20392f] outline-none transition focus:border-[#557667] focus:ring-2 focus:ring-[#dce8df]";
const button = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#193d32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#285647] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#ccd5cd] bg-white px-3 py-2 text-sm font-medium text-[#365346] transition hover:bg-[#f5f7f2] disabled:opacity-50";
const currentMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const cash = (value: unknown) => `KSh ${Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
const fail = (error: unknown) => toast.error((error instanceof Error ? error.message : "Request failed").replaceAll("_", " "));

type Props = { canView: boolean; canEdit: boolean; canApprove: boolean; canEditRules: boolean; canFinance: boolean };

export function PayrollWorkspace({ canView, canEdit, canApprove, canEditRules, canFinance }: Props) {
  const utils = trpc.useUtils();
  const workspace = trpc.smis.payroll.workspace.useQuery(undefined, { enabled: canView, retry: false });
  const mySlips = trpc.smis.payroll.mySlips.useQuery(undefined, { retry: false });
  const [period, setPeriod] = useState(currentMonth());
  const [staffProfileId, setStaffProfileId] = useState("");
  const [contract, setContract] = useState({ effectiveFrom: today(), basicSalary: "", earningsJson: "[]", deductionsJson: "[]", resident: true, additionalPension: "0", postRetirementMedical: "0", mortgageInterest: "0" });
  const [adjustment, setAdjustment] = useState({ staffProfileId: "", period: currentMonth(), kind: "earning" as "earning" | "deduction", description: "", amount: "", taxable: true });
  const [loan, setLoan] = useState({ staffProfileId: "", loanType: "loan" as "loan" | "advance", description: "", principalAmount: "", installmentAmount: "", startPeriod: currentMonth() });
  const [reportPeriod, setReportPeriod] = useState(currentMonth());
  const [reportYear, setReportYear] = useState(Number(currentMonth().slice(0, 4)));
  const [rulesDate, setRulesDate] = useState(today());
  const [rulesNotes, setRulesNotes] = useState("Reviewed against official KRA, NSSF and Kenya Law sources. Verify amendments before live payroll.");
  const [rulesJson, setRulesJson] = useState(JSON.stringify(DEFAULT_KENYA_PAYROLL_RULES, null, 2));
  const [ruleError, setRuleError] = useState("");

  const refresh = async () => { await utils.smis.payroll.workspace.invalidate(); await utils.smis.payroll.mySlips.invalidate(); };
  const run = async (fn: () => Promise<unknown>, done: string) => { try { await fn(); toast.success(done); await refresh(); } catch (error) { fail(error); } };
  const saveRules = trpc.smis.payroll.saveRules.useMutation();
  const saveComp = trpc.smis.payroll.saveCompensation.useMutation();
  const createAdj = trpc.smis.payroll.createAdjustment.useMutation();
  const reviewAdj = trpc.smis.payroll.reviewAdjustment.useMutation();
  const createLoan = trpc.smis.payroll.createLoan.useMutation();
  const reviewLoan = trpc.smis.payroll.reviewLoan.useMutation();
  const recordExport = trpc.smis.payroll.recordExport.useMutation();
  const createRun = trpc.smis.payroll.createDraft.useMutation();
  const transitionRun = trpc.smis.payroll.transitionRun.useMutation();
  const busy = [saveRules, saveComp, createAdj, reviewAdj, createLoan, reviewLoan, recordExport, createRun, transitionRun].some(mutation => mutation.isPending);
  const data = workspace.data;
  const selectedStaff = data?.staff.find(person => person.id === Number(staffProfileId));
  const viewOnlySlips = mySlips.data ?? [];
  const fallbackRules = useMemo(() => JSON.stringify(data?.rules[0]?.rules ?? DEFAULT_KENYA_PAYROLL_RULES, null, 2), [data?.rules]);

  const field = (label: string, child: React.ReactNode) => <label className="grid gap-1.5 text-xs font-semibold text-[#5e7065]"><span>{label}</span>{child}</label>;
  const panel = (title: string, description: string, content: React.ReactNode, icon?: React.ReactNode) => <section className="soft-card rounded-xl border border-[#d8ded7] bg-white p-5"><div className="mb-4 flex items-start gap-3">{icon && <span className="rounded-lg bg-[#edf3ed] p-2 text-[#2b5747]">{icon}</span>}<div><h2 className="font-semibold text-[#193d32]">{title}</h2><p className="mt-1 text-xs text-[#6e7c72]">{description}</p></div></div>{content}</section>;

  const downloadSlip = async (slip: any) => {
    try { await recordExport.mutateAsync({ kind: "payslip", period: slip.period }); } catch (error) { fail(error); return; }
    const calculation = slip.calculation;
    const rows = [["Employee", slip.employeeName], ["Period", slip.period], ["Gross pay", calculation.gross], ["NSSF", calculation.nssfEmployee], ["SHIF", calculation.shif], ["Affordable Housing Levy", calculation.housingLevyEmployee], ["PAYE", calculation.paye], ["Other deductions", calculation.otherDeductions], ["Net pay", calculation.netPay]];
    csvDownload(`pay-slip-${slip.period}.csv`, rows);
  };

  const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const printSlip = async (slip: any) => {
    const win = window.open("", "_blank", "width=840,height=900");
    if (!win) { toast.error("Allow pop-ups to print or save a payslip as PDF."); return; }
    win.opener = null;
    try { await recordExport.mutateAsync({ kind: "payslip", period: slip.period }); } catch (error) { win.close(); fail(error); return; }
    const calculation = slip.calculation;
    const items = [
      ["Gross pay", calculation.gross], ["PAYE", calculation.paye], ["NSSF employee", calculation.nssfEmployee],
      ["SHIF", calculation.shif], ["Affordable Housing Levy", calculation.housingLevyEmployee],
      ["Additional pension", calculation.additionalPension], ["Other deductions", calculation.otherDeductions], ["Net pay", calculation.netPay],
    ].map(([label, amount]) => `<tr><td>${escapeHtml(label)}</td><td class="amount">KSh ${Number(amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>`).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${escapeHtml(slip.period)}</title><style>body{font:15px/1.5 Arial,sans-serif;color:#24392e;margin:40px}h1{color:#193d32}.meta{color:#647369}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:11px;border-bottom:1px solid #dce2da}.amount{text-align:right;font-variant-numeric:tabular-nums}tr:last-child{font-weight:bold;font-size:1.12rem}footer{margin-top:35px;color:#647369;font-size:12px}@media print{body{margin:12mm}}</style></head><body><p class="meta">NEXUS · CONFIDENTIAL PAYROLL</p><h1>Employee payslip</h1><p><strong>${escapeHtml(slip.employeeName)}</strong><br>Pay period: ${escapeHtml(slip.period)}</p><table>${items}</table><footer>Prepared by NEXUS for internal payroll records. This is not a KRA return or proof of bank payment. Verify statutory calculations before live use.</footer><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };
  const csvDownload = (filename: string, rows: unknown[][]) => {
    const csv = rows.map(row => row.map(cell => { const raw = String(cell ?? ""); const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  };
  const exportPayrollReport = async (kind: "monthly_summary" | "deduction_schedule" | "annual_summary") => {
    if (!data) return;
    try {
      const reportResult = await recordExport.mutateAsync(kind === "annual_summary" ? { kind, year: reportYear } : { kind, period: reportPeriod });
      if (kind === "annual_summary") {
        const grouped = new Map<number, any>();
        for (const row of reportResult.rows) {
          const calc = row.calculation; const target = grouped.get(row.staffProfileId) ?? { employeeName: row.employeeName, gross: 0, paye: 0, nssf: 0, shif: 0, housing: 0, net: 0 };
          target.gross += Number(row.gross); target.paye += Number(row.paye); target.nssf += Number(calc.nssfEmployee); target.shif += Number(calc.shif); target.housing += Number(calc.housingLevyEmployee); target.net += Number(row.net); grouped.set(row.staffProfileId, target);
        }
        const rows: unknown[][] = [["Employee", "Year", "Gross", "PAYE", "NSSF", "SHIF", "Housing Levy", "Net"]];
        for (const totals of Array.from(grouped.values())) rows.push([totals.employeeName, reportYear, ...[totals.gross, totals.paye, totals.nssf, totals.shif, totals.housing, totals.net].map(value => Math.round(value * 100) / 100)]);
        csvDownload(`payroll-annual-summary-${reportYear}.csv`, rows);
        return;
      }
      const source = reportResult.rows;
      if (kind === "monthly_summary") {
        csvDownload(`payroll-monthly-summary-${reportPeriod}.csv`, [["Employee", "Period", "Gross", "Employer NSSF", "Employer Levy", "Total Employer Cost", "Net"], ...source.map((row: any) => [row.employeeName, row.period, row.gross, row.calculation.nssfEmployer, row.calculation.housingLevyEmployer, row.calculation.totalEmployerCost, row.net])]);
      } else {
        csvDownload(`payroll-deduction-schedule-${reportPeriod}.csv`, [["Employee", "Period", "PAYE", "NSSF employee", "SHIF", "Housing Levy employee", "Other deductions", "Net"], ...source.map((row: any) => [row.employeeName, row.period, row.paye, row.calculation.nssfEmployee, row.calculation.shif, row.calculation.housingLevyEmployee, row.calculation.otherDeductions, row.net])]);
      }
      if (!source.length) toast.message("No payroll run exists for the selected period; an empty schedule was downloaded.");
    } catch (error) { fail(error); }
  };

  if (canView && workspace.isLoading) return <div className="soft-card flex items-center gap-3 rounded-xl p-6 text-sm text-[#53675d]"><LoaderCircle className="animate-spin" size={18}/>Loading confidential payroll records…</div>;
  if (canView && workspace.error) return <div role="alert" className="soft-card rounded-xl border border-[#e8bcb6] p-5 text-sm text-[#843b35]">Payroll data is unavailable. Check database connectivity or ask an administrator for Payroll access.</div>;

  return <div className="space-y-5">
    <div className="rounded-xl border border-[#e8d7aa] bg-[#fffbef] p-4 text-sm leading-6 text-[#725522]"><strong>Confidential payroll:</strong> salary data and other employees’ slips are permission-gated. Draft calculations are estimates for review, not tax filings or proof of payment. Confirm eligibility and rates with a qualified payroll adviser before processing.</div>

    {!canView && <div className="space-y-4">{panel("My payslips", "Only released and closed slips for the signed-in staff profile are shown.", <div className="space-y-3">{mySlips.isLoading ? <p className="text-sm text-[#728076]">Loading your slips…</p> : viewOnlySlips.map((slip: any) => <div key={slip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4e9e2] p-3"><div><p className="font-semibold text-[#294a3c]">{slip.period} · {cash(slip.net)}</p><p className="text-xs text-[#758278]">Gross {cash(slip.gross)} · PAYE {cash(slip.paye)}</p></div><div className="flex gap-2"><button className={secondary} onClick={() => void downloadSlip(slip)}><Download size={15}/>CSV</button><button className={button} onClick={() => void printSlip(slip)}>Print / Save PDF</button></div></div>)}{!mySlips.isLoading && !viewOnlySlips.length && <p className="text-sm text-[#7a867d]">There are no closed payslips for your account.</p>}</div>, <Banknote size={18}/>)}<p className="text-xs text-[#7b877f]">For corrections or access questions, contact your school payroll administrator.</p></div>}

    {canView && data && <>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#dce2da] bg-white p-4"><p className="text-xs text-[#728076]">Active staff</p><p className="mt-1 font-editorial text-xl text-[#193d32]">{data.staff.filter(person => person.status === "active").length}</p></div><div className="rounded-xl border border-[#dce2da] bg-white p-4"><p className="text-xs text-[#728076]">Latest run</p><p className="mt-1 font-editorial text-xl text-[#193d32]">{data.runs[0]?.period ?? "—"}</p></div><div className="rounded-xl border border-[#dce2da] bg-white p-4"><p className="text-xs text-[#728076]">Effective rule sets</p><p className="mt-1 font-editorial text-xl text-[#193d32]">{data.rules.length}</p></div></div>

      {canEditRules && panel("Statutory rule set", "Effective-dated, versioned rates; values are preloaded from the cited 2026 source check. Use the source note and review date when updating.", <form className="space-y-3" onSubmit={event => { event.preventDefault(); try { const parsed = JSON.parse(rulesJson); setRuleError(""); void run(() => saveRules.mutateAsync({ effectiveFrom: rulesDate, sourceNotes: rulesNotes, rules: parsed }), "Effective payroll rules saved"); } catch { setRuleError("Rules must be valid JSON matching the payroll rate structure."); } }}>
        <div className="grid gap-3 sm:grid-cols-2">{field("Effective from", <input className={control} type="date" value={rulesDate} onChange={e => setRulesDate(e.target.value)}/>)}{field("Source / review note", <input className={control} maxLength={600} value={rulesNotes} onChange={e => setRulesNotes(e.target.value)}/>)}</div>
        <textarea aria-label="Payroll statutory rules JSON" className={`${control} min-h-56 font-mono text-xs`} value={rulesJson} onChange={e => { setRulesJson(e.target.value); setRuleError(""); }} onFocus={() => { if (!data.rules.length && rulesJson === JSON.stringify(DEFAULT_KENYA_PAYROLL_RULES, null, 2)) setRulesJson(fallbackRules); }}/>
        {ruleError && <p role="alert" className="text-xs text-[#9b3f36]">{ruleError}</p>}
        <button className={button} disabled={busy}><ShieldCheck size={16}/>Save rule set</button>
        <p className="text-xs text-[#7b877f]">Latest saved rule set: {data.rules[0] ? dateText(data.rules[0].effectiveFrom) : "none saved yet"}. The initial migration seeds the reviewed 2026 baseline. Source details are in <a className="underline" href="/payroll-sources.html" target="_blank" rel="noreferrer">the statutory reference note</a>.</p>
      </form>, <ShieldCheck size={18}/>)}

      {canEdit && panel("Effective-dated salary contract", "Stores compensation, taxable and pensionable earning flags, selected deductions, and individual tax relief inputs. No bank account, PIN or tax password is stored.", <form className="grid gap-3 md:grid-cols-3" onSubmit={event => { event.preventDefault(); try { const earnings = JSON.parse(contract.earningsJson); const deductions = JSON.parse(contract.deductionsJson); if (!Array.isArray(earnings) || !Array.isArray(deductions)) throw new Error(); void run(() => saveComp.mutateAsync({ staffProfileId: Number(staffProfileId), effectiveFrom: contract.effectiveFrom, basicSalary: Number(contract.basicSalary), earnings, deductions, resident: contract.resident, additionalPension: Number(contract.additionalPension), postRetirementMedical: Number(contract.postRetirementMedical), mortgageInterest: Number(contract.mortgageInterest) }), "Salary contract saved"); } catch { toast.error("Earnings and deduction fields must contain valid JSON arrays."); } }}>
        {field("Active staff member", <select className={control} required value={staffProfileId} onChange={e => { setStaffProfileId(e.target.value); setAdjustment({ ...adjustment, staffProfileId: e.target.value }); }}><option value="">Choose staff member</option>{data.staff.filter(person => person.status === "active").map(person => <option key={person.id} value={person.id}>{person.displayName} · {person.role}</option>)}</select>)}
        {field("Effective from", <input className={control} type="date" value={contract.effectiveFrom} onChange={e => setContract({ ...contract, effectiveFrom: e.target.value })}/>)}
        {field("Basic salary (KSh)", <input className={control} required type="number" min="0" step="0.01" value={contract.basicSalary} onChange={e => setContract({ ...contract, basicSalary: e.target.value })}/>)}
        {field("Tax residency", <select className={control} value={contract.resident ? "resident" : "nonresident"} onChange={e => setContract({ ...contract, resident: e.target.value === "resident" })}><option value="resident">Resident (personal relief applied)</option><option value="nonresident">Non-resident</option></select>)}
        {field("Additional pension (KSh)", <input className={control} type="number" min="0" step="0.01" value={contract.additionalPension} onChange={e => setContract({ ...contract, additionalPension: e.target.value })}/>)}
        {field("Post-retirement medical contribution (KSh)", <input className={control} type="number" min="0" step="0.01" value={contract.postRetirementMedical} onChange={e => setContract({ ...contract, postRetirementMedical: e.target.value })}/>)}
        {field("Mortgage-interest qualifying deduction (KSh)", <input className={control} type="number" min="0" step="0.01" value={contract.mortgageInterest} onChange={e => setContract({ ...contract, mortgageInterest: e.target.value })}/>)}
        <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
          {field("Earnings JSON", <textarea className={`${control} min-h-24 font-mono text-xs`} value={contract.earningsJson} onChange={e => setContract({ ...contract, earningsJson: e.target.value })}/>)}
          {field("Deductions JSON", <textarea className={`${control} min-h-24 font-mono text-xs`} value={contract.deductionsJson} onChange={e => setContract({ ...contract, deductionsJson: e.target.value })}/>)}
          <p className="md:col-span-2 text-xs leading-5 text-[#7b877f]">Example line: <code>{'{"name":"House allowance","amount":12000,"taxable":true,"pensionable":false}'}</code>. A deduction may set <code>taxDeductible:true</code> only if verified as legally eligible.</p>
        </div>
        <div className="md:col-span-3"><button className={button} disabled={busy || !staffProfileId}>Save effective-dated contract</button></div>
      </form>, <Users size={18}/>)}

      {canEdit && panel("One-off payroll adjustment", "Bonuses, overtime and one-time deductions are held pending until a different authorised user approves them.", <form className="grid gap-3 md:grid-cols-3" onSubmit={event => { event.preventDefault(); void run(() => createAdj.mutateAsync({ staffProfileId: Number(adjustment.staffProfileId), period: adjustment.period, kind: adjustment.kind, description: adjustment.description, amount: Number(adjustment.amount), taxable: adjustment.taxable }), "Adjustment submitted for independent review"); }}>
        {field("Staff member", <select className={control} required value={adjustment.staffProfileId} onChange={e => setAdjustment({ ...adjustment, staffProfileId: e.target.value })}><option value="">Choose staff member</option>{data.staff.filter(person => person.status === "active").map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select>)}
        {field("Payroll period", <input className={control} type="month" value={adjustment.period} onChange={e => setAdjustment({ ...adjustment, period: e.target.value })}/>)}
        {field("Type", <select className={control} value={adjustment.kind} onChange={e => setAdjustment({ ...adjustment, kind: e.target.value as "earning" | "deduction" })}><option value="earning">Earning</option><option value="deduction">Deduction</option></select>)}
        {field("Description", <input className={control} required maxLength={120} value={adjustment.description} onChange={e => setAdjustment({ ...adjustment, description: e.target.value })}/>)}
        {field("Amount (KSh)", <input className={control} required type="number" min="0.01" step="0.01" value={adjustment.amount} onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })}/>)}
        {field("Tax treatment", <select className={control} value={adjustment.taxable ? "taxable" : "nontaxable"} onChange={e => setAdjustment({ ...adjustment, taxable: e.target.value === "taxable" })}><option value="taxable">Taxable earning / qualifying deduction</option><option value="nontaxable">Non-taxable earning / non-deductible withholding</option></select>)}
        <div className="md:col-span-3"><button className={button} disabled={busy || !adjustment.staffProfileId}>Submit adjustment</button></div>
      </form>, <FileCheck2 size={18}/>)}

      {canEdit && panel("Build monthly payroll draft", "Uses the effective salary contract and the rule set applicable on day one of the chosen month. No funds are transferred by this action.", <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void run(() => createRun.mutateAsync({ period }), "Payroll draft calculated"); }}>
        {field("Payroll period", <input className={control} type="month" value={period} onChange={e => setPeriod(e.target.value)}/>)}<button className={button} disabled={busy}><Banknote size={16}/>Calculate draft</button>
      </form>, <Banknote size={18}/>)}

      {panel("Payroll run approvals", "Workflow is draft → submitted → approved by a different user → externally paid then recorded in the central expenditure ledger → closed.", <div className="space-y-3">{data.runs.map(run => <article key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4e9e2] p-3"><div><p className="font-semibold text-[#294a3c]">{run.period} payroll <span className="ml-2 rounded-full bg-[#edf3ed] px-2 py-1 text-xs">{run.status}</span></p><p className="text-xs text-[#748077]">{run.itemCount ?? "—"} staff slips · prepared user #{run.preparedByUserId}{run.approvedByUserId ? ` · approved user #${run.approvedByUserId}` : ""}</p></div><div className="flex flex-wrap gap-2">{run.status === "draft" && canEdit && <button className={secondary} disabled={busy} onClick={() => void runAction(run.id, "submit")}>Submit for review</button>}{run.status === "submitted" && canApprove && <button className={button} disabled={busy || run.preparedByUserId === (data as any).currentUserId} onClick={() => void runAction(run.id, "approve")}>Approve</button>}{run.status === "approved" && canFinance && <button className={button} disabled={busy} onClick={() => { if (window.confirm(`Confirm that payroll ${run.period} was paid outside NEXUS. This records the amount as an expense; it does not transfer funds.`)) void runAction(run.id, "record_external_payment", "External payment confirmed by authorised finance user"); }}>Record external payment</button>}{run.status === "recorded" && canApprove && <button className={secondary} disabled={busy} onClick={() => void runAction(run.id, "close")}>Close period</button>}</div></article>)}{!data.runs.length && <p className="text-sm text-[#7a867d]">No payroll runs yet.</p>}</div>, <ShieldCheck size={18}/>)}

      {panel("Confidential payroll detail", "Latest run only; slip values are server-calculated from a frozen snapshot of the rules and compensation contract.", <div className="overflow-x-auto"><table className="w-full min-w-[770px] text-left text-sm"><thead><tr className="border-b text-xs text-[#758278]"><th className="py-2">Staff member</th><th>Gross</th><th>NSSF</th><th>SHIF</th><th>Housing levy</th><th>PAYE</th><th>Net</th><th>Slip</th></tr></thead><tbody>{data.latestRunItems.map((row: any) => <tr key={row.id} className="border-b border-[#edf0eb]"><td className="py-3 font-medium text-[#294a3c]">{row.employeeName}</td><td>{cash(row.gross)}</td><td>{cash(row.calculation.nssfEmployee)}</td><td>{cash(row.calculation.shif)}</td><td>{cash(row.calculation.housingLevyEmployee)}</td><td>{cash(row.paye)}</td><td className="font-semibold">{cash(row.net)}</td><td>{row.status === "closed" ? <button className={secondary} onClick={() => void printSlip(row)}>Print / PDF</button> : <span className="text-xs text-[#77847b]">Not released</span>}</td></tr>)}</tbody></table>{!data.latestRunItems.length && <p className="py-5 text-sm text-[#7a867d]">No payroll slips in the latest run.</p>}</div>, <Banknote size={18}/>)}

      {panel("Adjustment review", "A user may not approve their own one-off payroll adjustment.", <div className="space-y-2">{data.adjustments.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0eb] py-2 text-sm"><span className="text-[#294a3c]">{row.period} · staff #{row.staffProfileId} · {row.kind} · {row.description} · {cash(row.amount)} <small className="text-[#77847b]">{row.status}</small></span>{row.status === "pending" && canApprove && <div className="flex gap-2"><button className={secondary} disabled={busy} onClick={() => void run(() => reviewAdj.mutateAsync({ adjustmentId: row.id, status: "approved" }), "Adjustment approved")}>Approve</button><button className={secondary} disabled={busy} onClick={() => void run(() => reviewAdj.mutateAsync({ adjustmentId: row.id, status: "rejected" }), "Adjustment rejected")}>Reject</button></div>}</div>)}{!data.adjustments.length && <p className="text-sm text-[#7a867d]">No adjustments pending or recorded.</p>}</div>, <FileCheck2 size={18}/>)}
      {canEdit && panel("Salary loan or advance", "Create a repayment plan against an existing staff profile. An independent payroll approver must review it before deductions can begin.", <form className="grid gap-3 md:grid-cols-3" onSubmit={event => { event.preventDefault(); void run(() => createLoan.mutateAsync({ staffProfileId: Number(loan.staffProfileId), loanType: loan.loanType, description: loan.description, principalAmount: Number(loan.principalAmount), installmentAmount: Number(loan.installmentAmount), startPeriod: loan.startPeriod }), "Loan / advance submitted for review"); }}>
        {field("Staff member", <select className={control} required value={loan.staffProfileId} onChange={e => setLoan({ ...loan, staffProfileId: e.target.value })}><option value="">Choose staff member</option>{data.staff.filter(person => person.status === "active").map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select>)}
        {field("Type", <select className={control} value={loan.loanType} onChange={e => setLoan({ ...loan, loanType: e.target.value as "loan" | "advance" })}><option value="loan">Staff loan</option><option value="advance">Salary advance</option></select>)}
        {field("First deduction period", <input className={control} type="month" value={loan.startPeriod} onChange={e => setLoan({ ...loan, startPeriod: e.target.value })}/>)}
        {field("Description", <input className={control} required maxLength={160} value={loan.description} onChange={e => setLoan({ ...loan, description: e.target.value })}/>)}
        {field("Principal (KSh)", <input className={control} required type="number" min="0.01" step="0.01" value={loan.principalAmount} onChange={e => setLoan({ ...loan, principalAmount: e.target.value })}/>)}
        {field("Monthly instalment (KSh)", <input className={control} required type="number" min="0.01" step="0.01" value={loan.installmentAmount} onChange={e => setLoan({ ...loan, installmentAmount: e.target.value })}/>)}
        <div className="md:col-span-3"><button className={button} disabled={busy || !loan.staffProfileId}>Submit for independent review</button></div>
      </form>, <Banknote size={18}/>)}

      {panel("Loan and advance register", "Installments are deducted only after approval and are applied once when the associated payroll run is recorded as externally paid.", <div className="space-y-2">{data.loans.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0eb] py-2 text-sm"><span className="text-[#294a3c]">{item.staffName} · {item.loanType} · {item.description} · balance {cash(item.outstandingBalance)} / {cash(item.principalAmount)} · {cash(item.installmentAmount)} monthly · from {item.startPeriod} <small className="text-[#77847b]">{item.status}</small></span>{item.status === "pending" && canApprove && <div className="flex gap-2"><button className={secondary} disabled={busy || item.createdByUserId === data.currentUserId} onClick={() => void run(() => reviewLoan.mutateAsync({ loanId: item.id, status: "approved" }), "Loan / advance approved")}>Approve</button><button className={secondary} disabled={busy || item.createdByUserId === data.currentUserId} onClick={() => void run(() => reviewLoan.mutateAsync({ loanId: item.id, status: "rejected" }), "Loan / advance rejected")}>Reject</button></div>}</div>)}{!data.loans.length && <p className="text-sm text-[#7a867d]">No loans or advances recorded.</p>}</div>, <FileCheck2 size={18}/>)}

      {panel("Payroll reports and schedules", "Prepared by NEXUS from saved payroll records. These exports are not statutory returns and are not filed by the application.", <div className="flex flex-wrap items-end gap-3"><div className="min-w-40">{field("Monthly period", <input className={control} type="month" value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}/>)}</div><button className={secondary} disabled={recordExport.isPending} onClick={() => void exportPayrollReport("monthly_summary")}>Monthly summary CSV</button><button className={secondary} disabled={recordExport.isPending} onClick={() => void exportPayrollReport("deduction_schedule")}>Deduction schedule CSV</button><div className="min-w-28">{field("Annual year", <input className={control} type="number" min="2000" max="2100" value={reportYear} onChange={e => setReportYear(Number(e.target.value))}/>)}</div><button className={button} disabled={recordExport.isPending} onClick={() => void exportPayrollReport("annual_summary")}>Annual report CSV</button></div>, <Download size={18}/>)}
    </>}
  </div>;

  async function runAction(runId: number, action: "submit" | "approve" | "record_external_payment" | "close", note?: string) {
    await run(() => transitionRun.mutateAsync({ runId, action, note }), action === "record_external_payment" ? "External payment recorded to finance ledger" : `Payroll run ${action.replaceAll("_", " ")} complete`);
  }
}
