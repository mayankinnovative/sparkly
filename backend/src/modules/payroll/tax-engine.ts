import prisma from '../../config/database';
import { logger } from '../../config/logger';

// ─── Canadian Tax Engine — QC & ON ─────────────────────────────────────────────
// All rates are 2026 defaults loaded from the tax_configs table at runtime.
// Falls back to hardcoded rates if DB lookup fails.

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxConfig {
  province: string;
  year: number;
  federalBrackets: TaxBracket[];
  provincialBrackets: TaxBracket[];
  federalPersonalAmount: number;
  provincialPersonalAmount: number;
  cppRate: number;
  cppMaxContribution: number;
  cppExemption: number;
  eiRate: number;
  eiMaxInsurable: number;
  qppRate?: number;
  qppMaxContribution?: number;
  qpipEmployeeRate?: number;
  qpipMaxInsurable?: number;
  workersCompRate: number; // per $100 payroll — informational only
}

// Hardcoded fallback rates (2026 estimates)
const FALLBACK_QC: TaxConfig = {
  province: 'QC',
  year: 2026,
  federalBrackets: [
    { min: 0, max: 57375, rate: 0.15 },
    { min: 57375, max: 114750, rate: 0.205 },
    { min: 114750, max: 158468, rate: 0.26 },
    { min: 158468, max: 221708, rate: 0.29 },
    { min: 221708, max: null, rate: 0.33 },
  ],
  provincialBrackets: [
    { min: 0, max: 51780, rate: 0.14 },
    { min: 51780, max: 103545, rate: 0.19 },
    { min: 103545, max: 126000, rate: 0.24 },
    { min: 126000, max: null, rate: 0.2575 },
  ],
  federalPersonalAmount: 16129,
  provincialPersonalAmount: 18056,
  cppRate: 0,       // QC uses QPP
  cppMaxContribution: 0,
  cppExemption: 3500,
  eiRate: 0.0132,
  eiMaxInsurable: 65700,
  qppRate: 0.064,
  qppMaxContribution: 4160,
  qpipEmployeeRate: 0.00494,
  qpipMaxInsurable: 94000,
  workersCompRate: 1.86,
};

const FALLBACK_ON: TaxConfig = {
  province: 'ON',
  year: 2026,
  federalBrackets: FALLBACK_QC.federalBrackets,
  provincialBrackets: [
    { min: 0, max: 52886, rate: 0.0505 },
    { min: 52886, max: 105775, rate: 0.0915 },
    { min: 105775, max: 150000, rate: 0.1116 },
    { min: 150000, max: 220000, rate: 0.1216 },
    { min: 220000, max: null, rate: 0.1316 },
  ],
  federalPersonalAmount: 16129,
  provincialPersonalAmount: 11865,
  cppRate: 0.0595,
  cppMaxContribution: 3867,
  cppExemption: 3500,
  eiRate: 0.0163,
  eiMaxInsurable: 65700,
  workersCompRate: 2.35,
};

async function loadTaxConfig(province: string, year: number): Promise<TaxConfig> {
  try {
    const config = await prisma.taxConfig.findFirst({
      where: { province: province as any, taxYear: year },
    });
    if (config && config.rates) {
      const r = config.rates as any;
      // Validate the stored rates have the required shape; otherwise fall back.
      if (Array.isArray(r.federalBrackets) && Array.isArray(r.provincialBrackets)) {
        return r as TaxConfig;
      }
      logger.warn({ province, year }, 'Stored tax_configs.rates is missing brackets, using fallback');
    }
  } catch (err) {
    logger.warn({ province, year, err }, 'Failed to load tax config from DB, using fallback');
  }

  return province === 'QC' ? FALLBACK_QC : FALLBACK_ON;
}

function calculateBracketTax(income: number, brackets: TaxBracket[], personalAmount: number): number {
  const taxableIncome = Math.max(0, income - personalAmount);
  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const max = bracket.max ?? Infinity;
    const taxable = Math.min(taxableIncome, max) - bracket.min;
    tax += taxable * bracket.rate;
  }

  return Math.max(0, tax);
}

export interface PayrollDeductions {
  grossPay: number;
  province: string;
  federalTax: number;
  provincialTax: number;
  cpp: number;      // ON
  ei: number;
  qpp: number;      // QC
  qpip: number;     // QC
  totalDeductions: number;
  netPay: number;
  workersCompEstimate: number; // informational only — employer cost
}

export async function calculateDeductions(
  grossPay: number,
  province: 'QC' | 'ON',
  annualizedGross?: number,
): Promise<PayrollDeductions> {
  const year = new Date().getFullYear();
  const config = await loadTaxConfig(province, year);

  // Use annualized gross for bracket calculation, then prorate back
  const annualGross = annualizedGross || grossPay * 26; // assume biweekly
  const payPeriods = annualizedGross ? annualGross / grossPay : 26;

  // Federal income tax
  const annualFederalTax = calculateBracketTax(annualGross, config.federalBrackets, config.federalPersonalAmount);
  const federalTax = Math.round((annualFederalTax / payPeriods) * 100) / 100;

  // Provincial income tax
  const annualProvTax = calculateBracketTax(annualGross, config.provincialBrackets, config.provincialPersonalAmount);
  const provincialTax = Math.round((annualProvTax / payPeriods) * 100) / 100;

  let cpp = 0;
  let qpp = 0;
  let qpip = 0;
  let ei = 0;

  if (province === 'QC') {
    // QPP
    const qppPensionable = Math.max(0, annualGross - config.cppExemption);
    const annualQpp = Math.min(qppPensionable * (config.qppRate || 0.064), config.qppMaxContribution || 4160);
    qpp = Math.round((annualQpp / payPeriods) * 100) / 100;

    // QPIP
    const qpipInsurable = Math.min(annualGross, config.qpipMaxInsurable || 94000);
    const annualQpip = qpipInsurable * (config.qpipEmployeeRate || 0.00494);
    qpip = Math.round((annualQpip / payPeriods) * 100) / 100;

    // EI (reduced for QC)
    const eiInsurable = Math.min(annualGross, config.eiMaxInsurable);
    const annualEi = eiInsurable * config.eiRate;
    ei = Math.round((annualEi / payPeriods) * 100) / 100;
  } else {
    // CPP
    const cppPensionable = Math.max(0, annualGross - config.cppExemption);
    const annualCpp = Math.min(cppPensionable * config.cppRate, config.cppMaxContribution);
    cpp = Math.round((annualCpp / payPeriods) * 100) / 100;

    // EI
    const eiInsurable = Math.min(annualGross, config.eiMaxInsurable);
    const annualEi = eiInsurable * config.eiRate;
    ei = Math.round((annualEi / payPeriods) * 100) / 100;
  }

  const totalDeductions = Math.round((federalTax + provincialTax + cpp + qpp + qpip + ei) * 100) / 100;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  // Workers Comp (employer cost — informational only)
  const workersCompEstimate = Math.round((grossPay / 100) * config.workersCompRate * 100) / 100;

  return {
    grossPay,
    province,
    federalTax,
    provincialTax,
    cpp,
    ei,
    qpp,
    qpip,
    totalDeductions,
    netPay,
    workersCompEstimate,
  };
}
