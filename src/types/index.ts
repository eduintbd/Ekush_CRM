// UserRole moved to @/lib/roles — re-exported here so existing imports keep working.
export type { UserRole } from "@/lib/roles";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED" | "INVITED" | "LOCKED" | "DEACTIVATED";
export type InvestorType = "INDIVIDUAL" | "COMPANY_ORGANIZATION" | "MUTUAL_FUND" | "PROVIDENT_FUND" | "GRATUITY_FUND";
export type TransactionChannel = "LS" | "SIP";
export type TransactionDirection = "BUY" | "SELL";
export type OrderStatus = "PENDING" | "IN_PROCESS" | "EXECUTED" | "REJECTED";
export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type SipStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DividendOption = "CASH" | "CIP";

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  gainPercent: number;
  funds: FundSummary[];
}

export interface FundSummary {
  fundCode: string;
  fundName: string;
  currentNav: number;
  totalUnits: number;
  totalCost: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  weight: number;
}

export interface NavDataPoint {
  date: string;
  nav: number;
}

export interface TransactionRow {
  id: string;
  date: string;
  fund: string;
  channel: string;
  direction: string;
  amount: number;
  nav: number;
  units: number;
  status: string;
}
