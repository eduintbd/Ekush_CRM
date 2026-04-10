"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, ArrowLeft, Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: QuickOption[];
}

interface QuickOption {
  label: string;
  action: string;
}

/* ------------------------------------------------------------------ */
/*  Bot response logic                                                 */
/* ------------------------------------------------------------------ */

function getBotResponse(action: string): Message {
  const id = Date.now().toString();

  switch (action) {
    // ───────── Main greeting ─────────
    case "greeting":
      return {
        id,
        from: "bot",
        text: "Assalamualaikum! Welcome to Ekush Wealth Management. How can I help you today?",
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Sell Units", action: "nav_sell" },
          { label: "Invest in SIP", action: "nav_sip" },
          { label: "Learn About Funds", action: "funds_menu" },
          { label: "Basics of Mutual Funds", action: "basics_menu" },
          { label: "FAQ", action: "faq_menu" },
          { label: "Myth Busters", action: "myths_menu" },
          { label: "Help & Support", action: "help" },
        ],
      };

    // ───────── Navigation ─────────
    case "nav_buy":
      return {
        id,
        from: "bot",
        text: "To buy units, simply select a fund and enter how much you'd like to invest.\n\nMinimum investment: BDT 5,000 (lump sum)\n\nYou buy and sell at NAV — no entry fees!\n\nNAV is published every Thursday and is effective from Sunday to Wednesday.",
        options: [
          { label: "Go to Buy Units", action: "/transactions/buy" },
          { label: "How to deposit money?", action: "faq_deposit" },
          { label: "Which fund should I pick?", action: "funds_compare" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "nav_sell":
      return {
        id,
        from: "bot",
        text: "You can sell (redeem) your units anytime — there's no lock-in period for lump sum investments!\n\nYou'll receive your money within 3-7 working days via cheque or BEFTN transfer.\n\nNo exit fees are charged.",
        options: [
          { label: "Go to Sell Units", action: "/transactions/sell" },
          { label: "View my portfolio first", action: "/portfolio" },
          { label: "What about SIP lock-in?", action: "faq_sip_lockin" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "nav_sip":
      return {
        id,
        from: "bot",
        text: "SIP (Systematic Investment Plan) is like a DPS — but smarter! You invest a fixed amount every month automatically.\n\nWhy SIP is great:\n\n- Start with just BDT 1,000/month\n- Cost-averaging reduces market timing risk\n- No need to worry about ups & downs\n- Tax savings like Sanchaypatra\n- Builds saving discipline\n- After 5 years, chance of negative return is 0%!\n\nChoose tenure: 3, 5, 7, 10, or 12 years.",
        options: [
          { label: "Start a SIP now", action: "/sip" },
          { label: "How does cost-averaging work?", action: "sip_cost_avg" },
          { label: "SIP after maturity?", action: "sip_maturity" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "sip_cost_avg":
      return {
        id,
        from: "bot",
        text: "Here's how cost-averaging works:\n\nSay you invest BDT 5,000/month. When the price is BDT 10/unit, you get 500 units. When it drops to BDT 9, you get 556 units!\n\nOver 12 months, your average cost per unit becomes lower than if you invested all at once.\n\nResult: More units when prices are low, more returns when prices rise.\n\nThe longer you stay invested, the lower your risk — after 5+ years, the chance of loss is practically zero!",
        options: [
          { label: "Start a SIP", action: "/sip" },
          { label: "What is NAV?", action: "basics_nav" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "sip_maturity":
      return {
        id,
        from: "bot",
        text: "After your SIP matures, you have 3 options:\n\n1. Auto-Renewal — SIP continues until you say stop\n2. Sell — Cash out fully or partially\n3. Remain invested — Treated as lump sum investment\n\nYou can also do partial surrender anytime. SIP is available for individual, joint, and institutional investors.",
        options: [
          { label: "Start a SIP", action: "/sip" },
          { label: "Can I discontinue early?", action: "faq_sip_lockin" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── Fund information ─────────
    case "funds_menu":
      return {
        id,
        from: "bot",
        text: "Ekush manages 3 mutual funds — each designed for different goals. Which one interests you?",
        options: [
          { label: "EFUF — First Unit Fund", action: "fund_EFUF" },
          { label: "EGF — Growth Fund", action: "fund_EGF" },
          { label: "ESRF — Stable Return Fund", action: "fund_ESRF" },
          { label: "Compare all 3 funds", action: "funds_compare" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "fund_EFUF":
      return {
        id,
        from: "bot",
        text: "Ekush First Unit Fund (EFUF)\n\nA balanced fund investing in both equity and fixed-income securities.\n\n- Risk Level: Moderate\n- Best for: Investors seeking steady, balanced growth\n- Invests in: Stocks, bonds, fixed-income, IPOs\n- BSEC approved & Government regulated\n- Trustee: Sandhani Life Insurance Co. Ltd.\n- Custodian: Brac Bank Limited\n- No entry/exit fees\n- NAV published weekly in Financial Express",
        options: [
          { label: "Buy EFUF units", action: "/transactions/buy" },
          { label: "Start SIP in EFUF", action: "/sip" },
          { label: "How is my money protected?", action: "basics_protection" },
          { label: "View other funds", action: "funds_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "fund_EGF":
      return {
        id,
        from: "bot",
        text: "Ekush Growth Fund (EGF)\n\nAn equity-focused fund targeting higher growth.\n\n- Risk Level: Higher\n- Best for: Long-term investors seeking capital appreciation\n- Invests in: Growth stocks, emerging companies, IPOs\n- Active management by CFA-qualified analysts\n- Value investing philosophy\n- Higher return potential in the long run\n- Bangladesh stock market has given 14% CAGR over 20 years!",
        options: [
          { label: "Buy EGF units", action: "/transactions/buy" },
          { label: "Start SIP in EGF", action: "/sip" },
          { label: "What returns can I expect?", action: "basics_returns" },
          { label: "View other funds", action: "funds_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "fund_ESRF":
      return {
        id,
        from: "bot",
        text: "Ekush Stable Return Fund (ESRF)\n\nA conservative fund focused on stability.\n\n- Risk Level: Low\n- Best for: Conservative investors & retirees\n- Invests in: Fixed-income securities, bonds, IPOs\n- Steady income with capital preservation\n- Lower volatility compared to equity funds\n- Great alternative to Sanchaypatra\n- Tax benefits on investment",
        options: [
          { label: "Buy ESRF units", action: "/transactions/buy" },
          { label: "Start SIP in ESRF", action: "/sip" },
          { label: "Tax benefits?", action: "benefits_tax" },
          { label: "View other funds", action: "funds_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "funds_compare":
      return {
        id,
        from: "bot",
        text: "Quick comparison of all 3 funds:\n\nEFUF (First Unit Fund)\nRisk: Moderate | Balanced equity & debt\nBest for: Moderate-risk investors\n\nEGF (Growth Fund)\nRisk: Higher | Equity-focused growth\nBest for: Long-term aggressive investors\n\nESRF (Stable Return Fund)\nRisk: Low | Fixed-income & IPOs\nBest for: Conservative investors & retirees\n\nAll funds are:\n- BSEC regulated\n- Managed by CFA professionals\n- Zero entry/exit fees\n- Buy/sell anytime at NAV",
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Start a SIP", action: "nav_sip" },
          { label: "What are the benefits?", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── Basics of Mutual Funds ─────────
    case "basics_menu":
      return {
        id,
        from: "bot",
        text: "Let's learn about mutual funds! What would you like to know?",
        options: [
          { label: "What is a Mutual Fund?", action: "basics_what" },
          { label: "How do I get returns?", action: "basics_returns" },
          { label: "Open-end vs Closed-end?", action: "basics_types" },
          { label: "What is NAV?", action: "basics_nav" },
          { label: "How is my money safe?", action: "basics_protection" },
          { label: "What is a Unit?", action: "basics_unit" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_what":
      return {
        id,
        from: "bot",
        text: "A mutual fund collects money from many investors and pools it together. This fund then invests in stocks, bonds, IPOs, and other securities.\n\nThink of it like this:\nYour savings + other people's money = A big pool managed by experts at Ekush.\n\nThe returns from these investments are shared with you as dividends and capital gains, based on how many units you own.\n\nAnyone can invest — individuals, companies, even other funds!",
        options: [
          { label: "How do returns work?", action: "basics_returns" },
          { label: "What's the legal structure?", action: "basics_legal" },
          { label: "Benefits of mutual funds?", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_types":
      return {
        id,
        from: "bot",
        text: "There are 2 types of mutual funds:\n\nOpen-end (Unit Fund) — like Ekush's funds:\n- Buy/sell anytime at NAV\n- No maturity period\n- Fund size can grow with demand\n- Fair pricing — you always get actual value\n\nClosed-end:\n- Fixed fund size\n- Usually 10-year life\n- Buy/sell on stock exchange at market price\n- Market price may differ from actual NAV\n\nGlobally, unit funds (open-end) are the standard — worth USD 87 trillion worldwide!\n\nEkush's funds are open-end, giving you flexibility and fair pricing.",
        options: [
          { label: "What is NAV?", action: "basics_nav" },
          { label: "View our funds", action: "funds_menu" },
          { label: "Back to basics", action: "basics_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_nav":
      return {
        id,
        from: "bot",
        text: "NAV = Net Asset Value\n\nSimple formula:\nNAV = Total Assets - Liabilities\nNAV per unit = NAV / Number of units\n\nExample: If you bought at BDT 11/unit and NAV is now BDT 12, your profit is BDT 1/unit (9% return).\n\nNAV is published:\n- Every Thursday on Ekush's website\n- Every Sunday in The Financial Express\n- On social media\n\nThursday's NAV is effective for buying/selling from Sunday to Wednesday.",
        options: [
          { label: "Can NAV go below face value?", action: "faq_nav_below" },
          { label: "View our funds", action: "funds_menu" },
          { label: "Back to basics", action: "basics_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_unit":
      return {
        id,
        from: "bot",
        text: "A 'unit' represents your ownership in the mutual fund — just like a 'share' in a company.\n\nWhen you invest, you receive units based on the current NAV. For example:\n\nInvest BDT 10,000 at NAV BDT 10/unit = 1,000 units\n\nYou can buy or sell units anytime at the current NAV per unit. Your units are held in your BO account — that's your ownership certificate.",
        options: [
          { label: "What is NAV?", action: "basics_nav" },
          { label: "Do I get proof of purchase?", action: "faq_proof" },
          { label: "Back to basics", action: "basics_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_protection":
      return {
        id,
        from: "bot",
        text: "Your money has 4 levels of protection:\n\n1. BSEC (Regulator)\nBangladesh Securities & Exchange Commission regulates all fund activities. Monthly & quarterly reporting.\n\n2. Sandhani Life Insurance (Trustee)\nLegal guardian of the fund. Reviews all investments quarterly. Reports to BSEC.\n\n3. Brac Bank (Custodian)\nAll investment certificates kept in Brac Bank's vault. Full transparency.\n\n4. Ekush's Board of Directors\nLed by reputed professionals — Chairman Mr. Md. Waliullah FCA, Vice Chairman Mr. Swadesh Ranjan Saha FCA. Multiple CFA charter holders on the team.\n\nYour investment is more transparent than bank deposits — you can see exactly where your money is invested!",
        options: [
          { label: "How transparent is it?", action: "basics_transparency" },
          { label: "I'm convinced, let me invest!", action: "nav_buy" },
          { label: "Back to basics", action: "basics_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_transparency":
      return {
        id,
        from: "bot",
        text: "Ekush has the highest level of investment transparency in Bangladesh!\n\n- Weekly NAV emailed directly to you\n- NAV published in Financial Express every Sunday\n- Quarterly financial statements on the website\n- Full portfolio details publicly available\n- Yearly audit by independent auditors\n\nWhen you deposit in a bank, you don't know where your money goes. With Ekush, you can check every investment from your home.\n\nThis is the highest form of financial transparency available in Bangladesh.",
        options: [
          { label: "Let me invest now!", action: "nav_buy" },
          { label: "Learn about returns", action: "basics_returns" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_legal":
      return {
        id,
        from: "bot",
        text: "Mutual funds have a clear legal structure:\n\n- Formed under Trust Act 1908 & Registration Act 1882\n- Regulated by BSEC (Bangladesh Securities & Exchange Commission)\n- Investors own proportionate units (like shares in a company)\n- Board of Trustees oversees the fund (like board of directors)\n- Asset Manager (Ekush) handles investments\n- Financial results published quarterly, audited yearly\n- NAV published weekly\n- Trustee decides dividends at year-end",
        options: [
          { label: "Who are the key parties?", action: "faq_parties" },
          { label: "How is my money safe?", action: "basics_protection" },
          { label: "Back to basics", action: "basics_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "basics_returns":
      return {
        id,
        from: "bot",
        text: "Your return comes from 4 sources:\n\nTotal Return = Tax Savings + Fixed Income + IPO Return + Stock Return\n\n1. Tax Savings (3-5%): Instant benefit — works like Sanchaypatra tax rebate\n\n2. Fixed Income: Bonds & money market provide steady cushion\n\n3. IPO Returns: Mutual funds get 10% privileged IPO quota — some IPOs double within days!\n\n4. Stock Returns: Bangladesh market gave 14% CAGR over 20 years\n\nYou receive returns as:\n- Dividends (at least 70% of profit distributed yearly)\n- Capital gains (NAV appreciation)\n\nSome asset managers have delivered 12-15% p.a. historically!",
        options: [
          { label: "What about tax benefits?", action: "benefits_tax" },
          { label: "What about risks?", action: "myths_risk" },
          { label: "Start investing now!", action: "nav_buy" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── Benefits ─────────
    case "benefits_menu":
      return {
        id,
        from: "bot",
        text: "Here are the key benefits of investing with Ekush:",
        options: [
          { label: "Good returns", action: "benefits_returns" },
          { label: "Risk reduction", action: "benefits_risk" },
          { label: "IPO allocation", action: "benefits_ipo" },
          { label: "Tax savings", action: "benefits_tax" },
          { label: "Buy/sell anytime", action: "benefits_liquidity" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "benefits_returns":
      return {
        id,
        from: "bot",
        text: "Good Returns:\n\nEkush's experienced portfolio managers invest in stocks, bonds, and IPOs to generate strong long-term returns.\n\nThe Bangladesh stock market provided 14% compound annual growth over the last 20 years — and that's without counting dividends!\n\nEkush uses active management and value investing — the safest and most proven approach worldwide — aiming to beat market returns.",
        options: [
          { label: "How are returns generated?", action: "basics_returns" },
          { label: "Start investing", action: "nav_buy" },
          { label: "More benefits", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "benefits_risk":
      return {
        id,
        from: "bot",
        text: "Risk Reduction:\n\nEkush diversifies your money across:\n- Different asset classes (stocks, bonds, money market)\n- Different sectors\n- Different companies\n\nIf you invest directly in stocks, it can be very risky. But mutual funds spread that risk.\n\nEkush's risk management tools:\n- Focus on strong fundamentals\n- Buy at reasonable prices\n- Long-term orientation\n- Broad diversification",
        options: [
          { label: "Is there chance of loss?", action: "myths_risk" },
          { label: "More benefits", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "benefits_ipo":
      return {
        id,
        from: "bot",
        text: "Guaranteed IPO Allocation:\n\nMutual funds enjoy a 10% privileged quota for ALL IPOs in Bangladesh.\n\nIPOs can provide extraordinary returns — some IPOs have doubled or tripled within days of listing!\n\nBy investing through Ekush, you automatically benefit from IPO returns that you might not get as an individual investor.",
        options: [
          { label: "Tell me about tax savings", action: "benefits_tax" },
          { label: "More benefits", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "benefits_tax":
      return {
        id,
        from: "bot",
        text: "Tax Savings:\n\nInvesting in Ekush funds saves you money on taxes!\n\n- Dividend income up to BDT 25,000 is tax-free\n- Profits generated by the fund are tax-exempt\n- Capital gains for individuals are tax-free\n- Your investment counts as investment allowance (like Sanchaypatra) — reducing your tax bill\n\nTax on dividends:\n- With TIN: 10%\n- Without TIN: 15%\n\nIf you've maxed out your Sanchaypatra limit, Ekush's funds are the perfect next option!",
        options: [
          { label: "Is E-TIN mandatory?", action: "faq_etin" },
          { label: "Start investing", action: "nav_buy" },
          { label: "More benefits", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "benefits_liquidity":
      return {
        id,
        from: "bot",
        text: "Buy & Sell Anytime:\n\nUnlike fixed deposits or Sanchaypatra, you can buy and sell units of Ekush's funds at NAV on any working day.\n\nIt's one of the most liquid investments available!\n\nFor lump sum: No lock-in at all\nFor SIP: Minimum 3 years, but early withdrawal allowed in emergencies",
        options: [
          { label: "Buy units now", action: "nav_buy" },
          { label: "More benefits", action: "benefits_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── FAQ ─────────
    case "faq_menu":
      return {
        id,
        from: "bot",
        text: "Frequently Asked Questions — pick a topic:",
        options: [
          { label: "Minimum investment?", action: "faq_minimum" },
          { label: "Fees & charges?", action: "faq_fees" },
          { label: "How to deposit money?", action: "faq_deposit" },
          { label: "Documents needed?", action: "faq_documents" },
          { label: "Need BO account?", action: "faq_bo" },
          { label: "When do I get dividends?", action: "faq_dividends" },
          { label: "What is CIP?", action: "faq_cip" },
          { label: "SIP lock-in period?", action: "faq_sip_lockin" },
          { label: "More questions...", action: "faq_menu2" },
        ],
      };

    case "faq_menu2":
      return {
        id,
        from: "bot",
        text: "More frequently asked questions:",
        options: [
          { label: "Key parties in mutual fund?", action: "faq_parties" },
          { label: "Can NAV go below face value?", action: "faq_nav_below" },
          { label: "Do I get proof of purchase?", action: "faq_proof" },
          { label: "Is E-TIN mandatory?", action: "faq_etin" },
          { label: "Can I transfer units?", action: "faq_transfer" },
          { label: "Buy/sell timing?", action: "faq_timing" },
          { label: "Invest without visiting office?", action: "faq_online" },
          { label: "Back to FAQ", action: "faq_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "faq_minimum":
      return {
        id,
        from: "bot",
        text: "Minimum Investment:\n\nLump sum: BDT 5,000\nSIP: BDT 1,000/month (multiples of BDT 1,000)\n\nSIP is like a DPS but with better growth potential!",
        options: [
          { label: "Start investing", action: "nav_buy" },
          { label: "Start a SIP", action: "nav_sip" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_fees":
      return {
        id,
        from: "bot",
        text: "Fees & Charges:\n\nEntry fee: ZERO\nExit fee: ZERO (for lump sum)\nSIP exit load: 1% (if withdrawn before maturity)\n\nThere's an implicit management fee deducted from NAV:\n- Fund < 5 Crore: 2.5% p.a.\n- 5-25 Crore: 2.0% p.a.\n- 25-50 Crore: 1.5% p.a.\n- > 50 Crore: 1.0% p.a.\n\nThis is already factored into the NAV — no surprise charges!",
        options: [
          { label: "Start investing", action: "nav_buy" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_deposit":
      return {
        id,
        from: "bot",
        text: "How to deposit money:\n\nFund Account Details:\nAccount: Ekush First Unit Fund\nA/C No: 00011090000732\nBank: Midland Bank Limited\nBranch: Dilkhusha Corporate\nRouting: 285271933\n\n3 ways to pay:\n1. Cheque/PO/DD in the name of 'Ekush First Unit Fund' — come to office\n2. Deposit directly to above account — email slip to maruf@ekushwml.com\n3. Online BEFTN transfer — call +8801713086101 first\n\nFor SIP: Payment is via auto-debit from your bank account (BEFTN).",
        options: [
          { label: "Buy units now", action: "/transactions/buy" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_documents":
      return {
        id,
        from: "bot",
        text: "Documents needed to invest:\n\n1. Filled & signed Application Form\n2. Copy of your NID\n3. Copy of Nominee's NID\n4. Your passport-size photo\n5. Nominee's passport-size photo\n6. BO Account statement/acknowledgement\n7. ETIN Certificate (optional but saves tax)\n8. Blank cheque leaf or bank statement\n\nOr simply register online at the portal — upload everything digitally!",
        options: [
          { label: "Invest online", action: "faq_online" },
          { label: "Need a BO account?", action: "faq_bo" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_bo":
      return {
        id,
        from: "bot",
        text: "Yes, you need both a BO account and a bank account to invest.\n\nYou can open a BO account at any brokerage house near you. Ekush can also help you open one!\n\nDocuments for BO:\n- 3 passport-size photos\n- NID/Passport copy\n- Bank statement/cheque leaf\n- 2 nominee photos (attested)\n- Nominee NID (attested)\n\nBrokerage houses charge a small annual maintenance fee.",
        options: [
          { label: "Documents for investment?", action: "faq_documents" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_dividends":
      return {
        id,
        from: "bot",
        text: "Dividends:\n\nAfter December 31 each year, the fund is audited. The Board of Trustees decides the dividend.\n\nBy law, at least 70% of realized profit must be distributed as dividends.\n\nYou'll receive dividends within 45 days of declaration, sent directly to your bank account via EFT.\n\nDividend income up to BDT 25,000 is tax-free!",
        options: [
          { label: "What is CIP?", action: "faq_cip" },
          { label: "Tax benefits?", action: "benefits_tax" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_cip":
      return {
        id,
        from: "bot",
        text: "CIP (Compound Investment Plan):\n\nWith CIP, your dividend is automatically reinvested to buy more units — instead of receiving cash.\n\nThis gives you the power of compounding — what Einstein called the 'eighth wonder of the world'!\n\nYour units grow every year, and each year's dividends earn more dividends. Over time, this can significantly boost your returns.",
        options: [
          { label: "Start investing", action: "nav_buy" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_sip_lockin":
      return {
        id,
        from: "bot",
        text: "SIP Lock-in:\n\nMinimum holding: 3 years\n\nBut don't worry — in emergencies, you CAN withdraw early. Currently no penalties for early discontinuation (Ekush may introduce a small exit load in future with 3 months' notice).\n\nTo discontinue, submit an application at least 5 working days before the next installment date.\n\nNote: 3 consecutive missed installments will auto-cancel your SIP. You can re-enroll by calling +8801713086101.",
        options: [
          { label: "Start a SIP", action: "/sip" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_parties":
      return {
        id,
        from: "bot",
        text: "Key parties in Ekush's mutual fund:\n\nSponsor: Ekush Wealth Management Ltd.\nInvested BDT 1 Crore as seed capital\n\nTrustee: Sandhani Life Insurance Co. Ltd.\nProtects investor interests, oversees fund\n\nCustodian: Brac Bank Limited\nSafekeeps all investment certificates\n\nAsset Manager: Ekush WML\nManages investments per BSEC rules\n\nRegulator: BSEC\nOversees all mutual fund operations",
        options: [
          { label: "How is money protected?", action: "basics_protection" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_nav_below":
      return {
        id,
        from: "bot",
        text: "Can NAV go below face value?\n\nYes, if market values drop substantially, NAV can temporarily go below face value (BDT 10).\n\nHowever, this is expected to be temporary. With expert portfolio management, NAV is projected to grow in the long term.\n\nThe key word is 'long term' — short-term fluctuations are normal in any market. That's why we recommend staying invested for 3-5+ years.",
        options: [
          { label: "What about risk?", action: "myths_risk" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_proof":
      return {
        id,
        from: "bot",
        text: "Yes! After investing, you get:\n\n1. Acknowledgement slip signed by Ekush\n2. Units credited to your BO account (visible in BO statement)\n3. 'Confirmation of Unit Allocation' certificate in your online portal\n\nYou can download and print your certificate anytime from the portal.",
        options: [
          { label: "View my portfolio", action: "/portfolio" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_etin":
      return {
        id,
        from: "bot",
        text: "E-TIN is NOT mandatory to invest.\n\nBut it saves you money!\n\nWith TIN: 10% tax on dividends\nWithout TIN: 15% tax on dividends\n\nPlus, your investment counts as tax-eligible investment allowance, reducing your overall tax bill.",
        options: [
          { label: "Tax benefits explained", action: "benefits_tax" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_transfer":
      return {
        id,
        from: "bot",
        text: "Units can be transferred via inheritance, gift, or by law. The person receiving units must have their own BO account.\n\nFor regular buy/sell, you simply transact at NAV — no transfer needed.",
        options: [
          { label: "Back to FAQ", action: "faq_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "faq_timing":
      return {
        id,
        from: "bot",
        text: "Buy/Sell Timing:\n\nNAV is published every Thursday.\nThis price is effective Sunday through Wednesday.\nUnits are NOT bought or sold on Thursday.\n\nSo: Check Thursday's NAV, then buy/sell from Sunday to Wednesday at that price.\n\nYou can transact online or visit Ekush's office on any working day.",
        options: [
          { label: "Buy units now", action: "/transactions/buy" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    case "faq_online":
      return {
        id,
        from: "bot",
        text: "Yes! You can invest 100% online — no need to visit the office.\n\nFor lump sum: Use the 'Buy Units' feature in your portal\nFor SIP: Register and set up SIP from your portal account\n\nJust upload the required documents digitally and you're good to go!",
        options: [
          { label: "Buy units online", action: "/transactions/buy" },
          { label: "Start SIP online", action: "/sip" },
          { label: "Back to FAQ", action: "faq_menu" },
        ],
      };

    // ───────── Myth Busters ─────────
    case "myths_menu":
      return {
        id,
        from: "bot",
        text: "Let's bust some common myths about mutual fund investing!",
        options: [
          { label: "I'll lose money in stock market!", action: "myths_risk" },
          { label: "I need a lot of money to start", action: "myths_money" },
          { label: "Bank FD is safer", action: "myths_fd" },
          { label: "Mutual funds are like gambling", action: "myths_gambling" },
          { label: "I need to time the market", action: "myths_timing" },
          { label: "Only experts can invest", action: "myths_experts" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_risk":
      return {
        id,
        from: "bot",
        text: "MYTH: \"I'll lose all my money!\"\n\nREALITY: Your money is invested in stocks, bonds AND fixed-income — not just stocks. The fixed-income portion provides a safety cushion.\n\nShort-term (< 1 year): Yes, there can be temporary ups and downs\nMedium term (3-5 years): Risk drops significantly\nLong term (5+ years): Chance of negative return is practically ZERO\n\nEkush manages risk through:\n- Diversification across asset classes & sectors\n- Value investing (buying quality at good prices)\n- Long-term approach\n- CFA-qualified professional team\n\nRemember: \"In the short term, the market is a voting machine. In the long term, it's a weighing machine.\"",
        options: [
          { label: "How is money protected?", action: "basics_protection" },
          { label: "Try SIP for low risk", action: "nav_sip" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_money":
      return {
        id,
        from: "bot",
        text: "MYTH: \"I need lakhs to invest\"\n\nREALITY: You can start with just BDT 1,000/month through SIP!\n\nThat's less than a dinner out. This small monthly amount won't change your lifestyle today, but can build substantial wealth over time.\n\nLump sum minimum is only BDT 5,000.\n\nSmall amounts + consistency + time = Big results. That's the power of compounding!",
        options: [
          { label: "Start SIP with BDT 1,000", action: "/sip" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_fd":
      return {
        id,
        from: "bot",
        text: "MYTH: \"Bank FD is always safer and better\"\n\nREALITY: Let's compare honestly:\n\nBank FD:\n- Fixed return (5-8%)\n- Money locked for a fixed period\n- No transparency on where bank lends your money\n- Interest fully taxable\n\nEkush Mutual Fund:\n- Historically 12-15% p.a. potential\n- Buy/sell anytime (no lock-in)\n- Full transparency — see every investment\n- Tax-free capital gains + dividend exemptions\n- 4 layers of protection (BSEC, Trustee, Custodian, Board)\n\nMutual funds ARE riskier short-term, but in 5+ years, they typically beat FDs significantly.\n\nIf you've maxed Sanchaypatra, Ekush is the ideal next step!",
        options: [
          { label: "Tax benefits explained", action: "benefits_tax" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_gambling":
      return {
        id,
        from: "bot",
        text: "MYTH: \"Mutual funds are like gambling\"\n\nREALITY: Absolutely not!\n\nGambling: Pure chance, no analysis, house always wins\n\nMutual Funds:\n- Managed by CFA professionals with decades of experience\n- Based on deep research and fundamental analysis\n- Regulated by BSEC with strict rules\n- Diversified across many investments\n- Uses proven value investing philosophy\n- Audited quarterly, NAV published weekly\n\nIt's like the difference between throwing darts blindfolded and having a trained archer shoot for you!",
        options: [
          { label: "Who manages my money?", action: "basics_protection" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_timing":
      return {
        id,
        from: "bot",
        text: "MYTH: \"I need to find the perfect time to invest\"\n\nREALITY: Time IN the market beats TIMING the market!\n\nWith SIP, you don't need to worry about when to invest. Cost-averaging does the work:\n- When prices are low → you get more units\n- When prices are high → your existing units earn more\n\nSIP absorbs the market's ups and downs automatically.\n\nThe best time to start investing was yesterday. The second best time is today!",
        options: [
          { label: "How SIP cost-averaging works", action: "sip_cost_avg" },
          { label: "Start a SIP now", action: "/sip" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "myths_experts":
      return {
        id,
        from: "bot",
        text: "MYTH: \"Only finance experts can invest\"\n\nREALITY: That's the whole point of mutual funds! YOU don't need to be an expert.\n\nEkush's professional team — including CFA charter holders and experienced analysts — does all the research and investing for you.\n\nYou just:\n1. Choose a fund that matches your goal\n2. Invest your amount\n3. Let the experts grow your money\n\nAnyone can invest — individuals, companies, anyone!",
        options: [
          { label: "Help me choose a fund", action: "funds_compare" },
          { label: "Start investing", action: "nav_buy" },
          { label: "More myth busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── Help & Support ─────────
    case "help":
      return {
        id,
        from: "bot",
        text: "I can help you navigate the portal or find information. What do you need?",
        options: [
          { label: "View Statements", action: "/statements" },
          { label: "Tax Certificate", action: "/statements/tax" },
          { label: "Edit Profile", action: "/profile" },
          { label: "Bank & BO Details", action: "/profile/bank" },
          { label: "Manage Nominees", action: "/profile/nominees" },
          { label: "Documents", action: "/documents" },
          { label: "Contact Support", action: "help_contact" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    case "help_contact":
      return {
        id,
        from: "bot",
        text: "Contact Ekush:\n\nPhone: +8801713086101\nAlternate: +88001906440541\nEmail: info@ekushwml.com\n\nFor deposits/SIP:\nmaruf@ekushwml.com\nshuva@ekushwml.com\n\nOffice hours: Sun-Thu, 10:00 AM - 6:00 PM\n\nOr raise a support ticket from your portal:",
        options: [
          { label: "Raise support ticket", action: "/support" },
          { label: "Back to menu", action: "greeting" },
        ],
      };

    // ───────── Default ─────────
    default:
      return {
        id,
        from: "bot",
        text: "I'm not sure about that. Let me show you what I can help with!",
        options: [
          { label: "Buy Units", action: "nav_buy" },
          { label: "Sell Units", action: "nav_sell" },
          { label: "Invest in SIP", action: "nav_sip" },
          { label: "Learn About Funds", action: "funds_menu" },
          { label: "Basics of Mutual Funds", action: "basics_menu" },
          { label: "FAQ", action: "faq_menu" },
          { label: "Myth Busters", action: "myths_menu" },
          { label: "Back to menu", action: "greeting" },
        ],
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Free-text matching                                                 */
/* ------------------------------------------------------------------ */

function matchFreeText(text: string): string {
  const t = text.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|assalamualaikum|salam|good morning|good evening)\b/.test(t)) return "greeting";

  // Navigation
  if (/\b(buy|purchase)\b/.test(t) && !/sip/.test(t)) return "nav_buy";
  if (/\b(sell|redeem|withdraw|encash)\b/.test(t)) return "nav_sell";
  if (/\bsip\b/.test(t) || /systematic investment/i.test(t) || /\bdps\b/.test(t)) return "nav_sip";

  // Specific funds
  if (/\befuf\b/.test(t) || /first unit/i.test(t)) return "fund_EFUF";
  if (/\begf\b/.test(t) || /growth fund/i.test(t)) return "fund_EGF";
  if (/\besrf\b/.test(t) || /stable return/i.test(t)) return "fund_ESRF";
  if (/\b(fund|funds)\b/.test(t) && /\b(compare|which|difference|best)\b/.test(t)) return "funds_compare";
  if (/\b(fund|funds)\b/.test(t)) return "funds_menu";

  // Basics
  if (/\b(what is|what are).*mutual fund/i.test(t)) return "basics_what";
  if (/\bnav\b/.test(t)) return "basics_nav";
  if (/\b(unit|units)\b/.test(t) && /\b(what|meaning)\b/.test(t)) return "basics_unit";
  if (/\b(safe|protect|secure|security)\b/.test(t)) return "basics_protection";
  if (/\b(return|profit|earn|income)\b/.test(t)) return "basics_returns";
  if (/\b(open.end|closed.end|types)\b/.test(t)) return "basics_types";
  if (/\b(transparen)/i.test(t)) return "basics_transparency";
  if (/\b(basic|learn|education|knowledge)\b/.test(t)) return "basics_menu";

  // Benefits
  if (/\b(benefit|advantage)\b/.test(t)) return "benefits_menu";
  if (/\b(tax|rebate)\b/.test(t)) return "benefits_tax";
  if (/\bipo\b/.test(t)) return "benefits_ipo";

  // FAQ
  if (/\b(fee|charge|cost|expense)\b/.test(t)) return "faq_fees";
  if (/\b(minimum|how much)\b/.test(t) && /\b(invest|start|need)\b/.test(t)) return "faq_minimum";
  if (/\b(deposit|pay|payment|bank account)\b/.test(t)) return "faq_deposit";
  if (/\b(document|requirement|paper)\b/.test(t)) return "faq_documents";
  if (/\b(bo account|brokerage)\b/.test(t)) return "faq_bo";
  if (/\b(dividend)\b/.test(t)) return "faq_dividends";
  if (/\bcip\b/.test(t) || /compound investment/i.test(t)) return "faq_cip";
  if (/\b(lock.in|maturity|discontinue)\b/.test(t)) return "faq_sip_lockin";
  if (/\b(e.tin|etin|tin)\b/.test(t)) return "faq_etin";
  if (/\b(faq|question)\b/.test(t)) return "faq_menu";

  // Myths
  if (/\b(myth|misconception|buster)\b/.test(t)) return "myths_menu";
  if (/\b(risk|lose|loss|danger)\b/.test(t)) return "myths_risk";
  if (/\b(gambl)/i.test(t)) return "myths_gambling";
  if (/\b(fd|fixed deposit|sanchaypatra)\b/.test(t)) return "myths_fd";
  if (/\b(timing|when to invest|right time)\b/.test(t)) return "myths_timing";

  // Help
  if (/\b(help|support|contact|phone|email|office)\b/.test(t)) return "help_contact";
  if (/\b(statement|certificate|profile|nominee|document)\b/.test(t)) return "help";

  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EkushChatbot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([getBotResponse("greeting")]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleOptionClick = (option: QuickOption) => {
    if (option.action.startsWith("/")) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), from: "user", text: option.label },
        { id: (Date.now() + 1).toString(), from: "bot", text: `Taking you to ${option.label}...` },
      ]);
      setTimeout(() => {
        router.push(option.action);
        setIsOpen(false);
      }, 600);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), from: "user", text: option.label },
      getBotResponse(option.action),
    ]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const action = matchFreeText(text);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), from: "user", text },
      getBotResponse(action),
    ]);
  };

  const handleReset = () => {
    setMessages([getBotResponse("greeting")]);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#2d5a8f] transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Ekush Assistant</p>
                <p className="text-[11px] text-white/70">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Start over">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.from === "user"
                        ? "bg-[#1e3a5f] text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {msg.from === "bot" && msg.options && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleOptionClick(opt)}
                        className="px-3 py-1.5 text-[12px] font-medium text-[#1e3a5f] bg-white border border-[#1e3a5f]/20 rounded-full hover:bg-[#1e3a5f] hover:text-white transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white px-3 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-[#1e3a5f] bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center hover:bg-[#2d5a8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
