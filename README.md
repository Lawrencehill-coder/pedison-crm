# Pedison Funding & Corporate Credit Builder CRM

New unified Google Apps Script CRM, backed by Google Sheets and Google Drive. Two intake tracks: **Pedison Business Loan Application** and **NCCB Business Credit Counseling Application**. This is a fresh implementation; it does not modify the former CRM.

## Setup
1. The dedicated database has been created: https://docs.google.com/spreadsheets/d/1XwICzRzHptm0A-u7EEJRfcOPXomkE9jAJZI5w4esVw8/edit . Verify it is restricted to authorized Pedison staff before use.
2. Create a new standalone Apps Script project. Add `Code.gs` and `Index.html` from this repository.
3. In Apps Script Project Settings > Script Properties set `SPREADSHEET_ID` to `1XwICzRzHptm0A-u7EEJRfcOPXomkE9jAJZI5w4esVw8`, `ADMIN_EMAILS` to comma-separated approved Google Workspace admin emails, and `ALLOWED_DOMAIN` to `pedisonusa.com` if applicable.
4. Run `initializeCRM` as the owner once, review permissions and authorize. It creates tabs: Leads, Applications, Activities, Tasks, Documents, Audit, Settings.
5. Deploy as Web App. **Execute as: user accessing the web app** and **Access: within the organization** for internal staff. For external applicant intake, deploy a separate vetted public endpoint/service with spam prevention, authentication/verification and rate limiting; do not publish this internal admin deployment to Anyone.
6. Open the deployed URL. Employees may add leads, create applications, update pipeline stages and print an intake copy. Data writes to Google Sheets; no sample client data is seeded.

## Security boundaries
- Internal-only baseline. The script checks signed-in identity and admin email/domain before any read or write. No client-provided role grants access.
- No SSNs, DOBs, full bank/account/card numbers, credit reports, passwords, or other sensitive identity data are collected or written to Sheets. The source NCCB PDF includes these fields; obtain them via an independently vetted secure collection provider if legally needed.
- Google Sheets is a lightweight CRM store, **not** a regulated loan origination system, secure identity vault, credit bureau interface, or substitute for a compliance review.
- Consent to contact is captured separately from credit-report authorization; submitting a form does not authorize a credit pull or guarantee financing.
- Clay integration is **not** connected: import approved prospecting data through CSV or a reviewed API integration later. Do not send applicant PII to Clay.
- No automated lender submission, underwriting decisions, or external CRM integrations are claimed.
- This repository contains no secrets. Restrict GitHub access as appropriate. Use a separate production environment, retention policy, audit and incident-response plan before onboarding real borrowers.

## Product scope
- Business loan: business/contact profile, funding request, revenue, time in business, credit product interest, use of funds, collateral and existing obligations.
- NCCB: business details, operations, history, up to three owner professional profiles, 16 vendor trade references, declaration. Historic 2019–2022 fields in the PDF are represented as current/prior-year revenue fields.
- CRM: pipeline stages, activity log, follow-up tasks, dashboard counts, intake print, duplicate checks, server-side validation, spreadsheet formula injection protection.
- Not a pixel-identical reproduction of the legacy PDF. No public applicant portal or secure uploads are enabled yet.

## Test checklist
- Run `initializeCRM` and `selfTest` in Apps Script.
- Verify unauthorized Google accounts cannot access the app or call server functions.
- Submit a test lead and each intake type with **fictional** data; check row creation and IDs.
- Verify dashboard, pipeline changes, activity logging, and printing.
- Verify restricted sheet sharing, execution logs and admin email settings before any live deployment.

## Build verification (2026-11-12)
- GitHub source files committed and JavaScript syntax compilation passed for Code.gs and Index.html.
- Google Sheets database created with the seven named tabs and header rows through Google Sheets API.
- **Not yet deployed:** no Apps Script project/deployment API is connected in this environment. No end-to-end live submission test has been run.
- Official March 2025 Pedison Business Loan Application used to align field schema. NCCB four-page form used for credit-builder fields and 16 references. Sensitive identity fields intentionally excluded.
