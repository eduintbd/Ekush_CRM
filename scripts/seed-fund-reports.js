/* eslint-disable */
// Seed FundReport records with data scraped from ekushwml.com public fund pages.
// Run: node scripts/seed-fund-reports.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EFUF_REPORTS = [
  // ─── Financial Statements ─────────────────────────────────────
  ["FINANCIAL_STATEMENT", "Dec 31, 2025 (Audited)", "Audit-Financial-Report-Dec-31,-2025.pdf", "https://ekushwml.com/storage/1133/Audit-Financial-Report-Dec-31,-2025.pdf", "2025-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2025 (Un-audited)", "CamScanner-02-02-2026-16.21.pdf", "https://ekushwml.com/storage/1093/CamScanner-02-02-2026-16.21.pdf", "2025-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2025 (Un-audited)", "EFUF_Financial-Statement_2025-08-17.pdf", "https://ekushwml.com/storage/1083/EFUF_Financial-Statement_2025-08-17.pdf", "2025-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2025 (Un-audited)", "EFUF-2025-Q1-Financial-Statement.pdf", "https://ekushwml.com/storage/1032/EFUF-2025-Q1-Financial-Statement.pdf", "2025-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2024 (Audited)", "Financial-Statement-Dec-31-2024-Audited.pdf", "https://ekushwml.com/storage/1023/Financial-Statement-as-on-Dec-31,-2024-(Audited).pdf", "2024-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2024 (Un-audited)", "EFUF-Sep-30,-2024.pdf", "https://ekushwml.com/storage/1024/EFUF-Sep-30,-2024.pdf", "2024-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2024 (Un-audited)", "EFUF-30-June-2024.pdf", "https://ekushwml.com/storage/1025/EFUF-30-June-2024.pdf", "2024-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2024 (Un-audited)", "EFUF_Financial-Statement_March-2024.pdf", "https://ekushwml.com/storage/1026/EFUF_Financial-Statement_March-2024.pdf", "2024-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2023 (Audited)", "EFUF-Audited-Report-31-Dec-2023.pdf", "https://ekushwml.com/storage/1020/Ekush-First-Unit-Fund_Audited-Report-of-31-Dec-2023.pdf", "2023-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2023 (Un-audited)", "EFUF-Sep-30-2023.pdf", "https://ekushwml.com/storage/1027/EFUF-Sep-30-2023.pdf", "2023-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2023 (Un-audited)", "EFUF_30-June-2023_Financial-Statement.pdf", "https://ekushwml.com/storage/1028/EFUF_30-June-2023_Financial-Statement.pdf", "2023-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2023 (Un-audited)", "Financial-Statement-Mar-2023.pdf", "https://ekushwml.com/storage/508/Financial-Statement.pdf", "2023-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2022 (Audited)", "Audited-Report-2022.pdf", "https://ekushwml.com/storage/463/Audited-Report-2022.pdf", "2022-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2022 (Un-audited)", "EFUF-Statement.pdf", "https://ekushwml.com/storage/454/EFUF-Statement.pdf", "2022-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2022 (Un-audited)", "EFUF-Financial-Statement.pdf", "https://ekushwml.com/storage/428/EFUF---Financial-Statement.pdf", "2022-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2022 (Un-audited)", "EFUF-Q1-2022-Financial-Statement.pdf", "https://ekushwml.com/storage/427/2022_Q1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-FINANCIAL-STAETMENT.pdf", "2022-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2021 (Audited)", "EFUF-Audited-Financial-Statements-2021.pdf", "https://ekushwml.com/storage/426/EKUSH-FIRST-UNIT-FUND---AUDITED-FINANCIAL-STATEMENTS-2021.pdf", "2021-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2021 (Un-audited)", "EFUF-Q3-2021-Financial-Statement.pdf", "https://ekushwml.com/storage/424/2021_Q3_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-FINANCIAL-STAETMENT.pdf", "2021-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2021 (Un-audited)", "EFUF-H1-2021-Financial-Statement.pdf", "https://ekushwml.com/storage/423/2021_H1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-HALF-YEARLY-FINANCIAL-STAETMENT.pdf", "2021-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2021 (Un-audited)", "EFUF-Q1-2021-Financial-Statement.pdf", "https://ekushwml.com/storage/425/2021_Q1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-FINANCIAL-STAETMENT-(1).pdf", "2021-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2020 (Audited)", "2020-Annual-Report.pdf", "https://ekushwml.com/storage/444/2020-Annual-Report.pdf", "2020-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2020 (Un-audited)", "Financial-Statement-Sep-30-2020.pdf", "https://ekushwml.com/storage/432/Financial-Statement-(unaudited)-as-on-September-30,-2020.pdf", "2020-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2020 (Un-audited)", "Financial-Statement-Jun-30-2020.pdf", "https://ekushwml.com/storage/433/Financial-Statement-(unaudited)-as-on-June-30,-2020-(1).pdf", "2020-06-30"],

  // ─── Portfolio Statements ─────────────────────────────────────
  ["PORTFOLIO_STATEMENT", "Dec 31, 2025", "EFUF-Portfolio-Dec-31,-2025.pdf", "https://ekushwml.com/storage/1136/EFUF-Portfolio-Dec-31,-2025.pdf", "2025-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2025", "EFUF_Portfolio-Statement_2025-09-30.pdf", "https://ekushwml.com/storage/1075/ESRF_Portfolio-Statement_2025-09-30.pdf", "2025-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2025", "EFUF_Portfolio-Statement_2025-08-17.pdf", "https://ekushwml.com/storage/1074/EFUF_Portfolio-Statement_2025-08-17.pdf", "2025-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2025", "EFUF-2025-Q1-Portfolio.pdf", "https://ekushwml.com/storage/1029/EFUF-2025-Q1-Portfolio.pdf", "2025-03-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2024", "EFUF-Sep-30,-2024-Portfolio.pdf", "https://ekushwml.com/storage/1047/EFUF-Sep-30,-2024-Portfolio.pdf", "2024-09-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2024", "EFUF_Portfolio-Statement_March-2024.pdf", "https://ekushwml.com/storage/1048/EFUF_Portfolio-Statement_March-2024.pdf", "2024-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2023", "EFUF-Portfolio-Statement-31-Dec-2023.pdf", "https://ekushwml.com/storage/568/Ekush-First-Unit-Fund_Portfolio-Statement-of-31-Dec-2023.pdf", "2023-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2023", "EFUF-Portfolio-Sep-30-2023.pdf", "https://ekushwml.com/storage/536/EFUF-Portfolio-Sep-30-2023.pdf", "2023-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2023", "EFUF_30-June-2023_Portfolio-Statement.pdf", "https://ekushwml.com/storage/537/EFUF_30-June-2023_Portfolio-Statement.pdf", "2023-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2023", "EFUF-Portfolio-Mar-2023.pdf", "https://ekushwml.com/storage/505/Portfolio.pdf", "2023-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2022", "Portfolio-Statement-2022.pdf", "https://ekushwml.com/storage/464/Portfolio-Statement-2022.pdf", "2022-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2022", "EFUF-Portfolio-(1).pdf", "https://ekushwml.com/storage/418/EFUF-Portfolio-(1).pdf", "2022-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2022", "EFUF-Portfolio-(2).pdf", "https://ekushwml.com/storage/419/EFUF-Portfolio-(2).pdf", "2022-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2022", "EFUF-Q1-2022-Portfolio.pdf", "https://ekushwml.com/storage/417/2022_Q1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-PORTFOLIO-STAETMENT.pdf", "2022-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2021", "EFUF-Portfolio-Dec-31-2021.pdf", "https://ekushwml.com/storage/416/EKUSH-FIRST-UNIT-FUND---PORTFOLIO-STATEMENT---DEC-31,-2021.pdf", "2021-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2021", "EFUF-Q3-2021-Portfolio.pdf", "https://ekushwml.com/storage/414/2021_Q3_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-PORTFOLIO-STAETMENT.pdf", "2021-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2021", "EFUF-H1-2021-Portfolio.pdf", "https://ekushwml.com/storage/412/2021_H1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-HALF-YEARLY-PORTFOLIO-STAETMENT.pdf", "2021-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2021", "EFUF-Q1-2021-Portfolio.pdf", "https://ekushwml.com/storage/413/2021_Q1_EKUSH-FIRST-UNIT-FUND_UNAUDITED-QUARTERLY-PORTFOLIO-STAETMENT-(1).pdf", "2021-03-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2020", "Portfolio-Sep-30-2020.pdf", "https://ekushwml.com/storage/29/Portfolio-as-on-September-30,-2020.pdf", "2020-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2020", "Portfolio-Jun-30-2020.pdf", "https://ekushwml.com/storage/28/Portfolio-as-on-June-30,-2020.pdf", "2020-06-30"],

  // ─── Formation Documents ──────────────────────────────────────
  ["FORMATION_DOCUMENT", "BSEC Registration Certificate", "Ekush-First-Unit-Fund-certificate.pdf", "https://ekushwml.com/storage/696/Ekush-First-Unit-Fund-certificate.pdf", null],
  ["FORMATION_DOCUMENT", "Prospectus", "Prospectus.pdf", "https://ekushwml.com/storage/36/Prospectus.pdf", null],
  ["FORMATION_DOCUMENT", "Trust Deed", "Trust-Deed.pdf", "https://ekushwml.com/storage/35/Trust-Deed.pdf", null],
  ["FORMATION_DOCUMENT", "Custodian Agreement", "Custodian-Agreement.pdf", "https://ekushwml.com/storage/34/Custodian-Agreement.pdf", null],
  ["FORMATION_DOCUMENT", "Investment Management Agreement", "Investment-Management-Agreement.pdf", "https://ekushwml.com/storage/33/Investment-Management-Agreement.pdf", null],

  // ─── Form PDFs ────────────────────────────────────────────────
  ["FORM_PDF", "Registration Form", "REGISTRATION-FORM---Main-Editable.pdf", "https://ekushwml.com/storage/939/REGISTRATION-FORM---Main-Editable.pdf", null],
  ["FORM_PDF", "Purchase Form", "Purchase-Form.pdf", "https://ekushwml.com/storage/998/Purchase-Form.pdf", null],
  ["FORM_PDF", "Surrender Form", "Surrender-Form.pdf", "https://ekushwml.com/storage/995/Surrender-Form.pdf", null],
  ["FORM_PDF", "SIP Form", "EFUF_SIP-Form.pdf", "https://ekushwml.com/storage/1004/EFUF_SIP-Form.pdf", null],
];

const EGF_REPORTS = [
  // Financial Statements
  ["FINANCIAL_STATEMENT", "Dec 31, 2025 (Audited)", "Audit-Financial-Report-Dec31,-2025.pdf", "https://ekushwml.com/storage/1134/Audit-Financial-Report-Dec31,-2025.pdf", "2025-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2025 (Un-audited)", "EGF_Financial-Statement_2025-09-30.pdf", "https://ekushwml.com/storage/1094/ESRF_Financial-Statement_2025-09-30.pdf", "2025-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2025 (Un-audited)", "EGF_Financial-Statement_2025-08-17.pdf", "https://ekushwml.com/storage/1085/EGF_Financial-Statement_2025-08-17.pdf", "2025-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2025 (Un-audited)", "EGF-2025-Q1-Financial-Statement.pdf", "https://ekushwml.com/storage/1031/EGF-2025-Q1-Financial-Statement.pdf", "2025-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2024 (Audited)", "EGF-Dec-31-2024-Audited.pdf", "https://ekushwml.com/storage/1040/EGF-Dec-31,-2024(Audited).pdf", "2024-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2024 (Un-audited)", "EGF-Sep-30,-2024.pdf", "https://ekushwml.com/storage/1033/EGF-Sep-30,-2024.pdf", "2024-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2024 (Un-audited)", "EGF-30-June-2024.pdf", "https://ekushwml.com/storage/1034/EGF-30-June-2024.pdf", "2024-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2024 (Un-audited)", "EGF_Financial-Statement_March-2024.pdf", "https://ekushwml.com/storage/1035/EGF_Financial-Statement_March-2024.pdf", "2024-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2023 (Audited)", "EGF-Audited-Report-31-Dec-2023.pdf", "https://ekushwml.com/storage/1036/Ekush-Growth-Fund_Audited-Report-of-31-Dec-2023.pdf", "2023-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2023 (Un-audited)", "EGF-Sep-30-2023.pdf", "https://ekushwml.com/storage/1037/EGF-Sep-30-2023.pdf", "2023-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2023 (Un-audited)", "EGF_30-June-2023_Financial-Statement.pdf", "https://ekushwml.com/storage/1038/EGF_30-June-2023_Financial-Statement.pdf", "2023-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2023 (Un-audited)", "Financial-Statement-Mar-2023.pdf", "https://ekushwml.com/storage/511/Financial-Statement.pdf", "2023-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2022 (Audited)", "Audited-Report-2022.pdf", "https://ekushwml.com/storage/462/Audited-Report-2022.pdf", "2022-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2022 (Un-audited)", "EGF-Statement.pdf", "https://ekushwml.com/storage/461/EGF-Statement.pdf", "2022-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2022 (Un-audited)", "EGF-fin.pdf", "https://ekushwml.com/storage/435/EGF---fin.pdf", "2022-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2022 (Un-audited)", "EGF-Q1-2022-Financial-Statement.pdf", "https://ekushwml.com/storage/434/2022_Q1_EKUSH-GROWTH-FUND_UNAUDITED-QUARTERLY-FINANCIAL-STAETMENTS.pdf", "2022-03-31"],

  // Portfolio Statements
  ["PORTFOLIO_STATEMENT", "Dec 31, 2025", "EGF-Portfolio-Dec-31,-2025.pdf", "https://ekushwml.com/storage/1135/EGF-Portfolio-Dec-31,-2025.pdf", "2025-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2025", "EGF_Portfolio-Statement_2025-09-30.pdf", "https://ekushwml.com/storage/1082/ESRF_Portfolio-Statement_2025-09-30.pdf", "2025-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2025", "EGF_Portfolio-Statement_2025-08-17.pdf", "https://ekushwml.com/storage/1081/EGF_Portfolio-Statement_2025-08-17.pdf", "2025-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2025", "EGF-2025-Q1-Portfolio.pdf", "https://ekushwml.com/storage/1080/EGF-2025-Q1-Portfolio.pdf", "2025-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2024", "EGF_Portfolio-Statement_2024-12-31.pdf", "https://ekushwml.com/storage/1078/ESRF_Portfolio-Statement_2024-12-31.pdf", "2024-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2024", "EGF-Sep-30,-2024-Portfolio.pdf", "https://ekushwml.com/storage/1077/EGF-Sep-30,-2024-Portfolio.pdf", "2024-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2024", "EGF_Portfolio-Statement_2024-06-30.pdf", "https://ekushwml.com/storage/1076/ESRF_Portfolio-Statement_2024-06-30.pdf", "2024-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2024", "EGF_Portfolio-Statement_March-2024.pdf", "https://ekushwml.com/storage/571/EGF_Portfolio-Statement_March-2024.pdf", "2024-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2023", "EGF-Portfolio-Statement-31-Dec-2023.pdf", "https://ekushwml.com/storage/569/Ekush-Growth-Fund_Portfolio-Statement-of-31-Dec-2023.pdf", "2023-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2023", "EGF-Sep-30-2023.pdf", "https://ekushwml.com/storage/543/EGF-Sep-30-2023.pdf", "2023-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2023", "EGF_30-June-2023_Portfolio-Statement.pdf", "https://ekushwml.com/storage/542/EGF_30-June-2023_Portfolio-Statement.pdf", "2023-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2023", "EGF-Portfolio-Mar-2023.pdf", "https://ekushwml.com/storage/506/Portfolio.pdf", "2023-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2022", "Portfolio-Statement-2022.pdf", "https://ekushwml.com/storage/465/Portfolio-Statement-2022.pdf", "2022-12-31"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2022", "EGF-port.pdf", "https://ekushwml.com/storage/421/EGF---port.pdf", "2022-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2022", "EGF-Q1-2022-Portfolio.pdf", "https://ekushwml.com/storage/420/2022_Q1_EKUSH-GROWTH-FUND_UNAUDITED-QUARTERLY-PORTFOLIO-STAETMENT.pdf", "2022-03-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2020", "EGF-Portfolio.pdf", "https://ekushwml.com/storage/411/EGF-Portfolio.pdf", "2020-09-30"],

  // Formation Documents
  ["FORMATION_DOCUMENT", "BSEC Registration Certificate", "Ekush-Growth-Fund-certificate.pdf", "https://ekushwml.com/storage/697/Ekush-Growth-Fund-certificate.pdf", null],
  ["FORMATION_DOCUMENT", "Prospectus", "EKUSH-GROWTH-FUND-PROSPECTUS-Final.pdf", "https://ekushwml.com/storage/359/EKUSH-GROWTH-FUND--PROSPECTUS-Final.pdf", null],
  ["FORMATION_DOCUMENT", "Trust Deed", "Trust-Deed-EGF.pdf", "https://ekushwml.com/storage/360/Trust-Deed-EGF.pdf", null],
  ["FORMATION_DOCUMENT", "Custodian Agreement", "Custodian-Agreement-EGF.pdf", "https://ekushwml.com/storage/358/Custodian-Agreement-EGF.pdf", null],
  ["FORMATION_DOCUMENT", "Fund Certificate", "certificate.pdf", "https://ekushwml.com/storage/339/certificate.pdf", null],

  // Form PDFs
  ["FORM_PDF", "Registration Form", "REGISTRATION-FORM---Main-Editable.pdf", "https://ekushwml.com/storage/940/REGISTRATION-FORM---Main-Editable.pdf", null],
  ["FORM_PDF", "Purchase Form", "Purchase-Form.pdf", "https://ekushwml.com/storage/999/Purchase-Form.pdf", null],
  ["FORM_PDF", "Surrender Form", "Surrender-Form.pdf", "https://ekushwml.com/storage/997/Surrender-Form.pdf", null],
  ["FORM_PDF", "SIP Form", "EGF_SIP-Form.pdf", "https://ekushwml.com/storage/1003/EGF_SIP-Form.pdf", null],
];

const ESRF_REPORTS = [
  // Financial Statements
  ["FINANCIAL_STATEMENT", "Dec 31, 2025 (Un-audited)", "ESRF_Financial-Statement_2025-12-31.pdf", "https://ekushwml.com/storage/1167/ESRF_Financial-Statement_2025-12-31.pdf", "2025-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2025 (Un-audited)", "ESRF_Financial-Statement_2025-09-30.pdf", "https://ekushwml.com/storage/1091/ESRF_Financial-Statement_2025-09-30.pdf", "2025-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2025 (Audited)", "ESRF_Financial-Statement_2025-06-30.pdf", "https://ekushwml.com/storage/1090/ESRF_Financial-Statement_2025-06-30.pdf", "2025-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2025 (Un-audited)", "ESRF-2025-Q1-financial-Statement.pdf", "https://ekushwml.com/storage/1041/ESRF-2025-Q1-financial-Statement.pdf", "2025-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2024 (Un-audited)", "ESRF-2024-Dec-31.pdf", "https://ekushwml.com/storage/1042/ESRF-2024-Dec-31.pdf", "2024-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2024 (Un-audited)", "ESRF-Sep-30,-2024.pdf", "https://ekushwml.com/storage/1043/ESRF-Sep-30,-2024.pdf", "2024-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2024 (Audited)", "ESRF-30-June-2024_compressed.pdf", "https://ekushwml.com/storage/1044/ESRF-30-June-2024_compressed.pdf", "2024-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2024 (Un-audited)", "ESRF_Financial-Statement_March-2024.pdf", "https://ekushwml.com/storage/1045/ESRF_Financial-Statement_March-2024.pdf", "2024-03-31"],
  ["FINANCIAL_STATEMENT", "Dec 31, 2023 (Un-audited)", "ESRF-Dec-31,-2023_Financial-Statement.pdf", "https://ekushwml.com/storage/1046/ESRF-Dec-31,-2023_Financial-Statement.pdf", "2023-12-31"],
  ["FINANCIAL_STATEMENT", "Sep 30, 2023 (Un-audited)", "ESRF-Sep-30-2023.pdf", "https://ekushwml.com/storage/1089/ESRF-Sep-30-2023.pdf", "2023-09-30"],
  ["FINANCIAL_STATEMENT", "Jun 30, 2023 (Audited)", "ESRF-Audited-Report-Jun-30-2023.pdf", "https://ekushwml.com/storage/1021/Audited-Report-Final.pdf", "2023-06-30"],
  ["FINANCIAL_STATEMENT", "Mar 31, 2023 (Un-audited)", "ESRF-Financial-Statement-Mar-2023.pdf", "https://ekushwml.com/storage/510/Financial-Statement.pdf", "2023-03-31"],

  // Portfolio Statements
  ["PORTFOLIO_STATEMENT", "Dec 31, 2025", "ESRF_Portfolio-Statement_2025-12-31.pdf", "https://ekushwml.com/storage/1072/ESRF_Portfolio-Statement_2025-12-31.pdf", "2025-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2025", "ESRF_Portfolio-Statement_2025-09-30.pdf", "https://ekushwml.com/storage/1071/ESRF_Portfolio-Statement_2025-09-30.pdf", "2025-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2025", "ESRF_Portfolio-Statement_2025-06-30.pdf", "https://ekushwml.com/storage/1073/ESRF_Portfolio-Statement_2025-06-30.pdf", "2025-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2025", "ESRF-2025-Q1-Portfolio.pdf", "https://ekushwml.com/storage/720/ESRF-2025-Q1-Portfolio.pdf", "2025-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2024", "ESRF-Dec-31,-2024-Portfolio.pdf", "https://ekushwml.com/storage/687/ESRF-Dec-31,-2024-Portfolio.pdf", "2024-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2024", "ESRF-Sep-30,-2024-Portfolio.pdf", "https://ekushwml.com/storage/646/ESRF-Sep-30,-2024-Portfolio.pdf", "2024-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2024", "ESRF-30-June-2024-Portfolio.pdf", "https://ekushwml.com/storage/621/ESRF-30-June-2024-Portfolio.pdf", "2024-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2024", "ESRF_Portfolio-Statement_March-2024.pdf", "https://ekushwml.com/storage/572/ESRF_Portofolio-Statement_March-2024.pdf", "2024-03-31"],
  ["PORTFOLIO_STATEMENT", "Dec 31, 2023", "ESRF-Dec-31,-2023_Portfolio-Statement.pdf", "https://ekushwml.com/storage/563/ESRF-Dec-31,-2023_Portfolio-Statement.pdf", "2023-12-31"],
  ["PORTFOLIO_STATEMENT", "Sep 30, 2023", "ESRF-Portfolio-Sep-30-2023.pdf", "https://ekushwml.com/storage/544/ESRF-Portfolio-Sep-30-2023.pdf", "2023-09-30"],
  ["PORTFOLIO_STATEMENT", "Jun 30, 2023", "ESRF_Portfolio-Statement-30-June-2023.pdf", "https://ekushwml.com/storage/548/ESRF_Portfolio-Statement-30-June-2023.pdf", "2023-06-30"],
  ["PORTFOLIO_STATEMENT", "Mar 31, 2023", "ESRF-Portfolio-Mar-2023.pdf", "https://ekushwml.com/storage/507/Portfolio.pdf", "2023-03-31"],

  // Formation Documents
  ["FORMATION_DOCUMENT", "BSEC Registration Certificate", "Ekush-S.R.F.-Certificate.pdf", "https://ekushwml.com/storage/698/Ekush-S.R.F.-Certificate.pdf", null],
  ["FORMATION_DOCUMENT", "Prospectus", "Stable-Return-Fund-Prospectus.pdf", "https://ekushwml.com/storage/457/Stable-Return-Fund.pdf", null],
  ["FORMATION_DOCUMENT", "Trust Deed", "Trust-Deed-ESRF.pdf", "https://ekushwml.com/storage/460/Trust-Deed-ESRF.pdf", null],
  ["FORMATION_DOCUMENT", "Custodian Agreement", "ESRF-Custodian-Agreement.pdf", "https://ekushwml.com/storage/459/ESRF---Cust.-Agree.pdf", null],
  ["FORMATION_DOCUMENT", "Investment Management Agreement", "ESRF-IMF.pdf", "https://ekushwml.com/storage/458/ESRF---IMF.pdf", null],

  // Form PDFs
  ["FORM_PDF", "Registration Form", "REGISTRATION-FORM---Main-Editable.pdf", "https://ekushwml.com/storage/941/REGISTRATION-FORM---Main-Editable.pdf", null],
  ["FORM_PDF", "Purchase Form", "Purchase-Form.pdf", "https://ekushwml.com/storage/1001/Purchase-Form.pdf", null],
  ["FORM_PDF", "Surrender Form", "Surrender-Form.pdf", "https://ekushwml.com/storage/996/Surrender-Form.pdf", null],
  ["FORM_PDF", "SIP Form", "ESRF_SIP-Form.pdf", "https://ekushwml.com/storage/1002/ESRF_SIP-Form.pdf", null],
];

async function seedForFund(code, reports) {
  const fund = await prisma.fund.findUnique({ where: { code } });
  if (!fund) {
    console.log(`❌ Fund ${code} not found`);
    return 0;
  }

  // Only delete the imported categories so we don't nuke future admin uploads
  await prisma.fundReport.deleteMany({
    where: {
      fundId: fund.id,
      reportType: { in: ["FINANCIAL_STATEMENT", "PORTFOLIO_STATEMENT", "FORMATION_DOCUMENT", "FORM_PDF"] },
    },
  });

  const data = reports.map(([reportType, title, fileName, filePath, reportDate]) => ({
    fundId: fund.id,
    reportType,
    title,
    fileName,
    filePath,
    mimeType: "application/pdf",
    reportDate: reportDate ? new Date(reportDate) : null,
  }));

  await prisma.fundReport.createMany({ data });
  console.log(`✅ ${code}: inserted ${data.length} reports`);
  return data.length;
}

async function main() {
  const a = await seedForFund("EFUF", EFUF_REPORTS);
  const b = await seedForFund("EGF", EGF_REPORTS);
  const c = await seedForFund("ESRF", ESRF_REPORTS);
  console.log(`\nTotal: ${a + b + c} fund reports seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
