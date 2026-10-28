# NEXUS Software — Finance and Operations Guide

**Version:** 1.0 — 28 October 2026  
**Audience:** bursars, accounts officers, principals, storekeepers, transport officers, payroll reviewers and authorised operations staff.

## 1. Finance & Resources workspace

Open **Finance & Resources**. The current internal areas are **Dashboard**, **Fees**, **Finance**, **Procurement**, **Stores**, **Assets**, **Maintenance**, **Reports**, **Audit**, **Payroll** and **Transport** where permissions allow.

The authoritative financial records currently demonstrated are learner payments, fee structures/balance calculations, expenditures, transport payments/costs and payroll external-payment ledger entries. Several labels in the UI describe future workflow stages but do not yet have dedicated domain records.

## 2. Fees and payments — partial but real

### Receive a payment

1. Open **Finance & Resources → Fees**.
2. Locate the correct learner record.
3. Review the displayed balance.
4. Select **Receive payment**.
5. Enter a positive amount.
6. Select **M-Pesa**, **Bank** or **Cash**.
7. Enter the actual transaction reference; do not reuse a reference.
8. Save and confirm the new row in **Receipts** and the recalculated balance.

The payment is stored in the central payments table and audited. The current UI does not prove automatic M-Pesa callbacks, bank reconciliation or a dedicated official receipt PDF/numbering service. Treat the displayed payment row/reference as an internal transaction record unless local procedure supplies the official receipt.

### Current limitations

`+ Learner` returns to People. `+ Fee item` and `Create Term 3 invoices` are informational/placeholder interactions. There is no verified invoice entity, discount workflow, arrears approval workflow or fee-structure CRUD screen in the current source.

## 3. Finance ledger and expenditure

Open **Finance & Resources → Finance**. Enter expenditure date, amount, category, description and responsible person, then select **Save expenditure**. Confirm the ledger row, summary and audit event. Do not treat this as a procurement approval, supplier invoice or budget approval: those workflows are not implemented as dedicated records.

Finance overview calculates balances from fee structures and payments. Expenditures and payments are school-scoped by the authenticated actor in the current repaired service paths.

## 4. Procurement — placeholder boundary

The UI describes `Purchase request → approval → quotation → purchase order → goods received → supplier invoice and payment`, but the audit found no complete procurement/purchase-order/supplier/invoice service or schema. Do not demonstrate a purchase order as a saved official transaction. Record only the actually implemented expenditure or store movement and label future procurement as planned.

## 5. Stores and inventory — partial

Stores uses `store_items` and `store_movements`. Quantity is computed from received, issued and adjustment movements. Where the UI and permission are active, review item history and use movement actions carefully. There is no fully verified item CRUD workflow behind every visible button, and no explicit return movement type was confirmed. Do not use an adjustment to hide an unexplained discrepancy; record a reference and escalate.

## 6. Assets — not a full asset register

The current Assets area reuses stock-style rows and displays references such as `ST-{id}`. A dedicated lifecycle register with custodian, condition, depreciation, transfer, disposal and audit workflow was not verified. Do not promise asset depreciation or disposal reporting.

## 7. Maintenance — weak/placeholder implementation

The current maintenance form records a synthetic expenditure-style entry, including a small amount and problem description. It is not a verified work-order system with assignment, status stages, estimated/actual cost, completion or SLA tracking. Use local maintenance records alongside NEXUS until a dedicated workflow is approved.

## 8. Payroll — substantially implemented, not a statutory filing system

Open **Finance & Resources → Payroll** where permitted.

1. Configure effective-dated payroll rules and source notes.
2. Enter effective-dated compensation, earnings and deductions.
3. Create adjustments/loans as pending.
4. Have a different authorised user approve or reject them; self-approval is rejected.
5. Create a monthly draft and review calculated items.
6. Submit, approve, record external payment and close in sequence.
7. Use payslip/monthly summary/deduction schedule/annual summary exports.
8. Reconcile the external payment and resulting Finance expenditure before closing.

The state machine is `draft → submitted → approved → recorded → closed`. Recording external payment does not transfer funds. Exports are internal schedules, not KRA returns or statutory filings. Verify current PAYE, NSSF, SHIF, Affordable Housing Levy and other statutory rules against official guidance for the payment period.

## 9. Transport & Fleet — substantially implemented

Open **Finance & Resources → Transport** where permitted.

1. Enable transport if required.
2. Create/update an active vehicle with registration, capacity, driver, insurance/inspection and odometer details.
3. Create a route with vehicle, fee and billing cycle.
4. Allocate active learners and guardians; verify capacity.
5. Bill the correct period once.
6. Record transport payment with M-Pesa/Bank/Cash and a unique reference.
7. Capture AM/PM route attendance.
8. Record trips, odometer and driver details.
9. Record fuel/maintenance/repair costs with an idempotency key; confirm the linked Finance expenditure.
10. Record and resolve incidents with a factual written resolution.

Transport payments link to central payments and vehicle costs link to expenditures. This is an internal record flow, not a bank or mobile-money gateway.

## 10. Reports, audit and reconciliation

Finance currently supports balances CSV and browser print. Payroll provides CSV schedules and payslip print. Transport and finance reports are not all dedicated server-generated exports. The generic **Audit Trail** records actor, school, action, entity, metadata and timestamp; it is not proven to be immutable/WORM or externally retained.

For every financial correction, retain the original reference, document the reason, use an authorised correction path and confirm the audit event. Never delete a transaction to conceal an error.

## 11. Finance troubleshooting

| Problem | Check | Safe response |
|---|---|---|
| Wrong balance | Learner, fee structure, payment reference, school | Stop and reconcile; do not enter a compensating fake payment |
| Duplicate payment | Reference and learner history | Escalate for audited correction/reversal policy; no automatic reversal is promised |
| Receipt requested | Payment row/reference and browser print | Explain that a dedicated official receipt service was not verified |
| Procurement button does nothing | Placeholder action/source scope | Record only supported expenditure/store event; escalate feature gap |
| Stock mismatch | Movement types and references | Perform controlled count/adjustment with approval and audit note |
| Payroll total questioned | Rule effective date, approved adjustments/loans, external payment | Recalculate draft and obtain independent review |
| Transport over capacity | Route capacity and active allocations | Correct allocation before billing; do not bypass validation |

## 12. Operations acceptance checklist

- [ ] Finance permissions are limited to authorised users.
- [ ] Learner and school identity is confirmed before payment.
- [ ] Payment references are unique and reconciled.
- [ ] Expenditure corrections have an audit reason.
- [ ] Payroll rules are reviewed against current official guidance.
- [ ] Payroll approver differs from preparer.
- [ ] Transport insurance/inspection and capacity are current.
- [ ] Stores adjustments are documented.
- [ ] Procurement/assets/maintenance limitations are explained to users.
- [ ] Backup and restore arrangements are configured outside this manual.
