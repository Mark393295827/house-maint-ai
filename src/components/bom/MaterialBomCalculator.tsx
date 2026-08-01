import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface MaterialItem {
  id: string;
  name: string;
  category: 'plumbing' | 'electrical' | 'drywall' | 'painting' | 'hvac' | 'hardware' | 'flooring' | 'appliances' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  laborMultiplier: number;
  sku?: string;
  supplier?: string;
  spec?: string;
  notes?: string;
}

export interface BomSummary {
  items: MaterialItem[];
  materialSubtotal: number;
  laborSubtotal: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export interface MaterialBomCalculatorProps {
  initialItems?: MaterialItem[];
  reportTitle?: string;
  categoryHint?: string;
  readOnly?: boolean;
  onSave?: (summary: BomSummary) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  plumbing: { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
  electrical: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  drywall: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
  painting: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  hvac: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  hardware: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  flooring: { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
  appliances: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  other: { bg: 'bg-gray-500/10 dark:bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/30' },
};

const PRESET_TEMPLATES: Record<string, { title: string; items: MaterialItem[] }> = {
  plumbing: {
    title: 'Water Leak Repair BOM',
    items: [
      { id: 'p1', name: 'PEX Pipe 1/2" (10m)', category: 'plumbing', quantity: 2, unit: 'roll', unitPrice: 85, laborMultiplier: 1.5, sku: 'PEX-05-10', supplier: 'Zhejiang PipeCo', spec: '1/2 inch flexible' },
      { id: 'p2', name: 'Brass Ball Valve 1/2"', category: 'plumbing', quantity: 2, unit: 'pcs', unitPrice: 38, laborMultiplier: 1.2, sku: 'VAL-BR-05', supplier: 'Valves Direct' },
      { id: 'p3', name: 'Waterproof Sealant Tape', category: 'plumbing', quantity: 3, unit: 'roll', unitPrice: 12, laborMultiplier: 1.0, sku: 'TAPE-PTFE' },
      { id: 'p4', name: 'Stainless Steel Hose Clamp', category: 'plumbing', quantity: 6, unit: 'pcs', unitPrice: 6, laborMultiplier: 1.0, sku: 'CL-SS-12' },
    ],
  },
  electrical: {
    title: 'Socket & Wiring Repair BOM',
    items: [
      { id: 'e1', name: '16A Smart Wall Outlet Panel', category: 'electrical', quantity: 3, unit: 'set', unitPrice: 65, laborMultiplier: 1.4, sku: 'OUT-16A-SM', supplier: 'Schneider Elec' },
      { id: 'e2', name: '2.5mm² Copper Wire (50m)', category: 'electrical', quantity: 1, unit: 'roll', unitPrice: 160, laborMultiplier: 1.6, sku: 'WR-CU-25' },
      { id: 'e3', name: '40A Circuit Breaker (RCBO)', category: 'electrical', quantity: 1, unit: 'pcs', unitPrice: 110, laborMultiplier: 1.3, sku: 'CB-40A-RCBO' },
    ],
  },
  drywall: {
    title: 'Turnover Wall Patch & Paint BOM',
    items: [
      { id: 'd1', name: 'Drywall Repair Patch (8x8")', category: 'drywall', quantity: 4, unit: 'pcs', unitPrice: 18, laborMultiplier: 1.3, sku: 'DW-PT-08' },
      { id: 'd2', name: 'Joint Compound Spackle 5kg', category: 'drywall', quantity: 1, unit: 'bucket', unitPrice: 45, laborMultiplier: 1.4, sku: 'JC-SP-05' },
      { id: 'd3', name: 'Washable Interior Latex Paint 18L', category: 'painting', quantity: 1, unit: 'bucket', unitPrice: 320, laborMultiplier: 1.8, sku: 'PNT-LX-18', supplier: 'Nippon Paint' },
      { id: 'd4', name: 'Microfiber Paint Roller Kit', category: 'hardware', quantity: 2, unit: 'set', unitPrice: 35, laborMultiplier: 1.0, sku: 'RL-KIT-09' },
    ],
  },
};

export const MaterialBomCalculator: React.FC<MaterialBomCalculatorProps> = ({
  initialItems,
  reportTitle,
  categoryHint,
  readOnly = false,
  onSave,
  className = '',
}) => {
  const { t } = useLanguage();

  const defaultItems = useMemo(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    if (categoryHint && PRESET_TEMPLATES[categoryHint.toLowerCase()]) {
      return PRESET_TEMPLATES[categoryHint.toLowerCase()].items;
    }
    return PRESET_TEMPLATES.plumbing.items;
  }, [initialItems, categoryHint]);

  const [items, setItems] = useState<MaterialItem[]>(defaultItems);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taxRatePct, setTaxRatePct] = useState<number>(6);
  const [globalLaborMultiplier, setGlobalLaborMultiplier] = useState<number>(1.3);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // New item form state
  const [newItem, setNewItem] = useState<Partial<MaterialItem>>({
    name: '',
    category: 'plumbing',
    quantity: 1,
    unit: 'pcs',
    unitPrice: 0,
    laborMultiplier: 1.3,
    sku: '',
    supplier: '',
    spec: '',
  });

  // Calculate totals
  const summary: BomSummary = useMemo(() => {
    const materialSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const laborSubtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (item.laborMultiplier - 1),
      0
    );
    const taxAmount = (materialSubtotal + laborSubtotal) * (taxRatePct / 100);
    const grandTotal = materialSubtotal + laborSubtotal + taxAmount;

    return {
      items,
      materialSubtotal,
      laborSubtotal,
      taxAmount,
      grandTotal,
      currency: '¥',
    };
  }, [items, taxRatePct]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const matchQuery =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [items, filterCategory, searchQuery]);

  const handleUpdateItem = (id: string, field: keyof MaterialItem, value: any) => {
    if (readOnly) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'unitPrice' || field === 'quantity') {
          updated.unitPrice = Math.max(0, Number(updated.unitPrice) || 0);
          updated.quantity = Math.max(1, Number(updated.quantity) || 1);
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (readOnly) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyGlobalLabor = (mult: number) => {
    setGlobalLaborMultiplier(mult);
    setItems((prev) => prev.map((item) => ({ ...item, laborMultiplier: mult })));
  };

  const handleLoadPreset = (presetKey: string) => {
    if (PRESET_TEMPLATES[presetKey]) {
      setIsLoading(true);
      setErrorMsg(null);
      setTimeout(() => {
        setItems(PRESET_TEMPLATES[presetKey].items);
        setIsLoading(false);
      }, 400);
    }
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name?.trim()) {
      setErrorMsg(t('bom.error.nameRequired', { defaultValue: 'Item name is required' }));
      return;
    }
    setErrorMsg(null);
    const itemToAdd: MaterialItem = {
      id: `custom_${Date.now()}`,
      name: newItem.name.trim(),
      category: (newItem.category as MaterialItem['category']) || 'other',
      quantity: Math.max(1, Number(newItem.quantity) || 1),
      unit: newItem.unit?.trim() || 'pcs',
      unitPrice: Math.max(0, Number(newItem.unitPrice) || 0),
      laborMultiplier: Math.max(1, Number(newItem.laborMultiplier) || 1.2),
      sku: newItem.sku?.trim() || undefined,
      supplier: newItem.supplier?.trim() || undefined,
      spec: newItem.spec?.trim() || undefined,
    };
    setItems((prev) => [...prev, itemToAdd]);
    setShowAddModal(false);
    setNewItem({
      name: '',
      category: 'plumbing',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      laborMultiplier: globalLaborMultiplier,
      sku: '',
      supplier: '',
      spec: '',
    });
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Item Name', 'Category', 'Quantity', 'Unit', 'Unit Price (CNY)', 'Labor Multiplier', 'Subtotal (CNY)', 'SKU', 'Supplier'];
    const rows = items.map((item) => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      item.category,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.laborMultiplier,
      (item.quantity * item.unitPrice * item.laborMultiplier).toFixed(2),
      item.sku || '',
      item.supplier || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOM_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveBOM = () => {
    if (onSave) {
      onSave(summary);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 ${className}`}
      data-testid="material-bom-calculator"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </span>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
              {t('bom.badge', { defaultValue: 'Material BOM & Pricing' })}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {reportTitle ? `${reportTitle} - BOM` : t('bom.title', { defaultValue: 'Material BOM & Cost Estimator' })}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('bom.subtitle', { defaultValue: 'Itemized material quantity, supplier pricing index, labor multiplier, and tax allocation.' })}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              {t('bom.addItem', { defaultValue: 'Add Item' })}
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-base">download</span>
            {t('bom.exportCSV', { defaultValue: 'Export CSV' })}
          </button>
          {onSave && (
            <button
              type="button"
              onClick={handleSaveBOM}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-500"
            >
              <span className="material-symbols-outlined text-base">save</span>
              {savedSuccess ? t('bom.saved', { defaultValue: 'Saved!' }) : t('bom.save', { defaultValue: 'Save BOM' })}
            </button>
          )}
        </div>
      </div>

      {/* Presets & Filters Row */}
      <div className="relative z-10 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t('bom.presets', { defaultValue: 'Presets:' })}
              </span>
              <button
                type="button"
                onClick={() => handleLoadPreset('plumbing')}
                className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-500/20 dark:text-cyan-300"
              >
                {t('bom.presetPlumbing', { defaultValue: 'Plumbing Leak' })}
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('electrical')}
                className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-300"
              >
                {t('bom.presetElectrical', { defaultValue: 'Electrical Wiring' })}
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('drywall')}
                className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 transition hover:bg-purple-500/20 dark:text-purple-300"
              >
                {t('bom.presetTurnover', { defaultValue: 'Turnover Patch & Paint' })}
              </button>
            </div>
          )}

          {/* Global Labor Multiplier */}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <label htmlFor="globalLaborMult" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('bom.laborMultiplier', { defaultValue: 'Global Labor Multiplier:' })}
              </label>
              <select
                id="globalLaborMult"
                value={globalLaborMultiplier}
                onChange={(e) => handleApplyGlobalLabor(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-sm focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value={1.0}>1.0x (Materials Only / DIY)</option>
                <option value={1.2}>1.2x (Standard Installation)</option>
                <option value={1.35}>1.35x (Skilled Craftsmanship)</option>
                <option value={1.5}>1.5x (Emergency / Heavy Labor)</option>
              </select>
            </div>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder={t('bom.searchPlaceholder', { defaultValue: 'Search material name, SKU, or supplier...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex overflow-x-auto gap-1 py-1 no-scrollbar">
            {['all', 'plumbing', 'electrical', 'drywall', 'painting', 'hvac', 'hardware'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white shadow dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white/80 text-slate-600 hover:bg-slate-200/60 dark:bg-slate-800/80 dark:text-slate-300'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading and Error States */}
      {isLoading && (
        <div className="my-8 flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-xs font-semibold">{t('bom.loading', { defaultValue: 'Recalculating material index...' })}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* BOM Table */}
      {!isLoading && (
        <div className="relative z-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Item & Category</th>
                <th className="px-3 py-3">Spec & Supplier</th>
                <th className="px-3 py-3 text-center">Qty & Unit</th>
                <th className="px-3 py-3 text-right">Unit Price</th>
                <th className="px-3 py-3 text-center">Labor Mult</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                {!readOnly && <th className="px-3 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 6 : 7} className="py-10 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">
                      inventory
                    </span>
                    <p className="mt-2 text-xs font-semibold">{t('bom.empty', { defaultValue: 'No material items found.' })}</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
                  const itemSubtotal = item.quantity * item.unitPrice * item.laborMultiplier;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      {/* Name & Category */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {item.category}
                          </span>
                          {item.sku && (
                            <span className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                          )}
                        </div>
                      </td>

                      {/* Spec & Supplier */}
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        <div className="truncate font-medium">{item.spec || '-'}</div>
                        {item.supplier && (
                          <div className="text-[10px] text-slate-400">{item.supplier}</div>
                        )}
                      </td>

                      {/* Quantity & Unit */}
                      <td className="px-3 py-3 text-center">
                        {readOnly ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.quantity} {item.unit}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                              className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <span className="text-[11px] font-semibold text-slate-500">{item.unit}</span>
                          </div>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-3 text-right font-semibold">
                        {readOnly ? (
                          <span>¥{item.unitPrice.toFixed(2)}</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-slate-400">¥</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                          </div>
                        )}
                      </td>

                      {/* Labor Multiplier */}
                      <td className="px-3 py-3 text-center">
                        {readOnly ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.laborMultiplier}x
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            max={3}
                            step={0.1}
                            value={item.laborMultiplier}
                            onChange={(e) => handleUpdateItem(item.id, 'laborMultiplier', Number(e.target.value))}
                            className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100">
                        ¥{itemSubtotal.toFixed(2)}
                      </td>

                      {/* Action */}
                      {!readOnly && (
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title="Remove item"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Cost Breakdown Cards */}
      <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('bom.materialSubtotal', { defaultValue: 'Material Subtotal' })}
          </p>
          <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">
            ¥{summary.materialSubtotal.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('bom.laborSubtotal', { defaultValue: 'Labor Allowance' })}
          </p>
          <p className="mt-1 text-xl font-extrabold text-blue-600 dark:text-blue-400">
            ¥{summary.laborSubtotal.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('bom.taxRate', { defaultValue: 'Tax / Fee' })} ({taxRatePct}%)
            </p>
            {!readOnly && (
              <select
                aria-label="Tax rate percentage"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(Number(e.target.value))}
                className="rounded bg-transparent text-[10px] font-bold focus:outline-none"
              >
                <option value={0}>0%</option>
                <option value={6}>6%</option>
                <option value={13}>13%</option>
              </select>
            )}
          </div>
          <p className="mt-1 text-xl font-extrabold text-slate-700 dark:text-slate-300">
            ¥{summary.taxAmount.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-4 shadow-md backdrop-blur-md dark:border-cyan-500/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            {t('bom.grandTotal', { defaultValue: 'Grand Total' })}
          </p>
          <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">
            ¥{summary.grandTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {t('bom.addModalTitle', { defaultValue: 'Add New Material Item' })}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Pipe Elbow 1/2 inch"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as MaterialItem['category'] })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="drywall">Drywall</option>
                    <option value="painting">Painting</option>
                    <option value="hvac">HVAC</option>
                    <option value="hardware">Hardware</option>
                    <option value="flooring">Flooring</option>
                    <option value="appliances">Appliances</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="pcs / set / m / roll"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unit Price (¥)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Labor Mult
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={newItem.laborMultiplier}
                    onChange={(e) => setNewItem({ ...newItem, laborMultiplier: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-1002"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Supplier / Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Master Hardware"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-cyan-500"
                >
                  Add Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialBomCalculator;
