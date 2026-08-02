import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialBomCalculator from '../components/bom/MaterialBomCalculator';
import FaultAttributionBreakdown from '../components/attribution/FaultAttributionBreakdown';
import TurnoverPhotoDiffViewer from '../components/turnover/TurnoverPhotoDiffViewer';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useLanguage } from '../i18n/LanguageContext';

export const PropertyToolsPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'bom';

  const [activeTab, setActiveTab] = useState<'bom' | 'attribution' | 'turnover'>(
    (activeTabParam as 'bom' | 'attribution' | 'turnover') || 'bom'
  );

  const handleTabChange = (tab: 'bom' | 'attribution' | 'turnover') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Navigation Tabs */}
        <div className="mb-6 flex overflow-x-auto rounded-2xl border border-white/20 bg-white/70 p-1.5 shadow-lg backdrop-blur-xl no-scrollbar dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => handleTabChange('bom')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-extrabold transition-all ${
              activeTab === 'bom'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            <span>{t('tools.tabBom', { defaultValue: 'Material BOM Calculator' })}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('attribution')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-extrabold transition-all ${
              activeTab === 'attribution'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">balance</span>
            <span>{t('tools.tabAttribution', { defaultValue: 'Fault Attribution' })}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('turnover')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-extrabold transition-all ${
              activeTab === 'turnover'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">compare</span>
            <span>{t('tools.tabTurnover', { defaultValue: 'Turnover Inspection Diff' })}</span>
          </button>
        </div>

        {/* Tab Content Views */}
        {activeTab === 'bom' && <MaterialBomCalculator />}
        {activeTab === 'attribution' && <FaultAttributionBreakdown />}
        {activeTab === 'turnover' && <TurnoverPhotoDiffViewer />}
      </main>

      <BottomNav />
    </div>
  );
};

export default PropertyToolsPage;
