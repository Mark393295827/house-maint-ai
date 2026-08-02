import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export type ResponsibilityType = 'landlord' | 'tenant' | 'shared';
export type DamageCategoryType = 'normal_wear_and_tear' | 'tenant_misuse' | 'accidental_damage' | 'structural_defect' | 'force_majeure';
export type DisputeRiskLevel = 'low' | 'medium' | 'high';

export interface EvidenceFactor {
  id: string;
  title: string;
  weight: number; // 0-100
  supports: ResponsibilityType;
  description: string;
}

export interface FaultAttributionData {
  reportId?: string | number;
  issueTitle: string;
  responsibility: ResponsibilityType;
  landlordPct: number;
  tenantPct: number;
  damageCategory: DamageCategoryType;
  disputeRisk: DisputeRiskLevel;
  leaseClauseRef: string;
  legalRationale: string;
  totalRepairCost: number;
  evidenceFactors: EvidenceFactor[];
}

export interface FaultAttributionBreakdownProps {
  initialData?: Partial<FaultAttributionData>;
  readOnly?: boolean;
  onUpdateAttribution?: (data: FaultAttributionData) => void;
  className?: string;
}

const DEFAULT_ATTRIBUTION: FaultAttributionData = {
  reportId: 'REP-1029',
  issueTitle: 'Master Bathroom Pipe Burst & Ceiling Water Damage',
  responsibility: 'landlord',
  landlordPct: 80,
  tenantPct: 20,
  damageCategory: 'normal_wear_and_tear',
  disputeRisk: 'low',
  leaseClauseRef: 'Section 8.2: Landlord Structural & Concealed Piping Maintenance',
  legalRationale:
    'Primary cause identified as internal metal corrosion of 12-year-old concealed copper pipe behind wall. Under standard lease law, concealed plumbing aging is landlord responsibility. 20% tenant share allocated due to delayed reporting (water valve left open 48h after leak onset).',
  totalRepairCost: 1850,
  evidenceFactors: [
    {
      id: 'e1',
      title: 'Pipe Corrosion Age > 10 Years',
      weight: 85,
      supports: 'landlord',
      description: 'Concealed copper pipe exhibits extensive oxidation along seam, indicating natural end of lifespan.',
    },
    {
      id: 'e2',
      title: 'No Direct Physical Impact',
      weight: 90,
      supports: 'landlord',
      description: 'No exterior dents, drilling holes, or user tampering found on drywall or pipe surface.',
    },
    {
      id: 'e3',
      title: 'Delayed Water Shutoff Reporting',
      weight: 40,
      supports: 'tenant',
      description: 'Tenant noticed ceiling discoloration 2 days prior to main valve isolation, exacerbating drywall dampness.',
    },
  ],
};

const RESPONSIBILITY_BADGES: Record<ResponsibilityType, { label: string; bg: string; text: string; ring: string }> = {
  landlord: {
    label: 'Landlord Responsibility',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  tenant: {
    label: 'Tenant Responsibility',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-500/30',
  },
  shared: {
    label: 'Shared Allocation (50/50)',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
};

const RISK_BADGES: Record<DisputeRiskLevel, { label: string; color: string; icon: string }> = {
  low: { label: 'Low Dispute Risk', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', icon: 'verified' },
  medium: { label: 'Medium Dispute Risk', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', icon: 'warning' },
  high: { label: 'High Dispute Risk', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', icon: 'gavel' },
};

export const FaultAttributionBreakdown: React.FC<FaultAttributionBreakdownProps> = ({
  initialData,
  readOnly = false,
  onUpdateAttribution,
  className = '',
}) => {
  const { t } = useLanguage();

  const [data, setData] = useState<FaultAttributionData>({
    ...DEFAULT_ATTRIBUTION,
    ...initialData,
  });

  const [overrideLandlordPct, setOverrideLandlordPct] = useState<number>(data.landlordPct);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Financial Split calculation
  const financialSplit = useMemo(() => {
    const landlordAmt = (data.totalRepairCost * overrideLandlordPct) / 100;
    const tenantAmt = data.totalRepairCost - landlordAmt;
    return {
      landlordAmt,
      tenantAmt,
      landlordPct: overrideLandlordPct,
      tenantPct: 100 - overrideLandlordPct,
    };
  }, [data.totalRepairCost, overrideLandlordPct]);

  const handleSliderChange = (newLandlordPct: number) => {
    setOverrideLandlordPct(newLandlordPct);
    const updatedResp: ResponsibilityType =
      newLandlordPct > 65 ? 'landlord' : newLandlordPct < 35 ? 'tenant' : 'shared';

    const updated = {
      ...data,
      landlordPct: newLandlordPct,
      tenantPct: 100 - newLandlordPct,
      responsibility: updatedResp,
    };

    setData(updated);
    if (onUpdateAttribution) {
      onUpdateAttribution(updated);
    }
  };

  const handleCopyMemo = () => {
    const memo = `
==================================================
HOUSE MAINT AI - FAULT ATTRIBUTION MEMORANDUM
==================================================
Case Title: ${data.issueTitle}
Responsibility Verdict: ${data.responsibility.toUpperCase()}
Cost Split: Landlord ${financialSplit.landlordPct}% (¥${financialSplit.landlordAmt.toFixed(2)}) | Tenant ${financialSplit.tenantPct}% (¥${financialSplit.tenantAmt.toFixed(2)})
Total Repair Cost: ¥${data.totalRepairCost.toFixed(2)}
Lease Clause: ${data.leaseClauseRef}
Dispute Risk Level: ${data.disputeRisk.toUpperCase()}

Legal & Technical Rationale:
${data.legalRationale}

Evidence Factors:
${data.evidenceFactors.map((e) => `- [${e.supports.toUpperCase()}] ${e.title}: ${e.description}`).join('\n')}
==================================================
    `.trim();

    navigator.clipboard.writeText(memo);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleRecalculateAI = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData((prev) => ({
        ...prev,
        landlordPct: 75,
        tenantPct: 25,
        responsibility: 'landlord',
        disputeRisk: 'low',
      }));
      setOverrideLandlordPct(75);
      setIsLoading(false);
    }, 600);
  };

  const respStyle = RESPONSIBILITY_BADGES[data.responsibility];
  const riskStyle = RISK_BADGES[data.disputeRisk];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 ${className}`}
      data-testid="fault-attribution-breakdown"
    >
      {/* Glow effect */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-indigo-500/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <span className="material-symbols-outlined text-xl">balance</span>
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${respStyle.bg} ${respStyle.text} ${respStyle.ring}`}>
              {respStyle.label}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${riskStyle.color}`}>
              <span className="material-symbols-outlined text-sm">{riskStyle.icon}</span>
              {riskStyle.label}
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {t('attribution.title', { defaultValue: 'Fault Attribution Breakdown' })}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {data.issueTitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleRecalculateAI}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
                auto_awesome
              </span>
              {t('attribution.recalculate', { defaultValue: 'AI Re-analyze' })}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyMemo}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">
              {isCopied ? 'check' : 'content_copy'}
            </span>
            {isCopied ? t('attribution.copied', { defaultValue: 'Copied Memo!' }) : t('attribution.exportMemo', { defaultValue: 'Export Decision Brief' })}
          </button>
        </div>
      </div>

      {/* Main Responsibility Progress Bar */}
      <div className="relative z-10 mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Landlord Share: {financialSplit.landlordPct}% (¥{financialSplit.landlordAmt.toFixed(2)})
          </span>
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            Tenant Share: {financialSplit.tenantPct}% (¥{financialSplit.tenantAmt.toFixed(2)})
            <span className="h-3 w-3 rounded-full bg-indigo-500" />
          </span>
        </div>

        {/* Visual Dual Progress Bar */}
        <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${financialSplit.landlordPct}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${financialSplit.tenantPct}%` }}
          />
        </div>

        {/* Interactive Override Slider */}
        {!readOnly && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <label htmlFor="attributionSlider" className="font-bold">
                {t('attribution.negotiationSlider', { defaultValue: 'Negotiated Adjustment Slider:' })}
              </label>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {financialSplit.landlordPct}% / {financialSplit.tenantPct}%
              </span>
            </div>
            <input
              id="attributionSlider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={overrideLandlordPct}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-slate-700"
            />
          </div>
        )}
      </div>

      {/* Grid details: Legal Rationale & Financial Summary */}
      <div className="relative z-10 mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rationale & Clause */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span className="material-symbols-outlined text-emerald-500">description</span>
              {t('attribution.legalRationale', { defaultValue: 'Legal & Contractual Assessment' })}
            </h3>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="text-slate-400">Lease Reference: </span>
              <span className="text-emerald-600 dark:text-emerald-400">{data.leaseClauseRef}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {data.legalRationale}
            </p>
          </div>

          {/* Evidence Factors */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span className="material-symbols-outlined text-teal-500">fact_check</span>
              {t('attribution.evidenceHeader', { defaultValue: 'Technical Evidence Factors' })}
            </h3>
            <div className="mt-3 space-y-2.5">
              {data.evidenceFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span
                    className={`mt-0.5 inline-block rounded-md p-1 ${
                      factor.supports === 'landlord'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {factor.supports === 'landlord' ? 'gavel' : 'person'}
                    </span>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {factor.title}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        Confidence Weight {factor.weight}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {factor.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Cost Allocation Box */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-slate-50/50 p-5 shadow-sm backdrop-blur-md dark:border-emerald-500/30 dark:bg-slate-900/90">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                payments
              </span>
              {t('attribution.costAllocation', { defaultValue: 'Cost Allocation Summary' })}
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs dark:bg-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Repair Quote</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  ¥{data.totalRepairCost.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-3 dark:bg-emerald-500/20">
                <div>
                  <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Landlord Pays ({financialSplit.landlordPct}%)
                  </span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Concealed defect responsibility</span>
                </div>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  ¥{financialSplit.landlordAmt.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-indigo-500/10 p-3 dark:bg-indigo-500/20">
                <div>
                  <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Tenant Pays ({financialSplit.tenantPct}%)
                  </span>
                  <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">Delayed reporting share</span>
                </div>
                <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                  ¥{financialSplit.tenantAmt.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">Note: </span>
            This attribution is generated automatically based on standard tenancy laws and local housing tribunal precedents.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultAttributionBreakdown;
