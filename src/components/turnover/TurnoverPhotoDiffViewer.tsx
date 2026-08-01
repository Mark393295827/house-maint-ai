import React, { useState, useRef, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export type DefectSeverity = 'critical' | 'moderate' | 'cosmetic';
export type ViewMode = 'split' | 'sideBySide' | 'overlay' | 'highlights';

export interface InspectionDefect {
  id: string;
  roomZone: string;
  title: string;
  description: string;
  severity: DefectSeverity;
  estimatedCost: number;
  pinLocation: { x: number; y: number }; // percentage 0-100
  attribution: 'tenant' | 'landlord' | 'wear_and_tear';
  status: 'pending' | 'accepted' | 'disputed';
}

export interface TurnoverInspectionData {
  inspectionId: string;
  propertyAddress: string;
  tenantName: string;
  moveInDate: string;
  moveOutDate: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  defects: InspectionDefect[];
}

export interface TurnoverPhotoDiffViewerProps {
  initialData?: Partial<TurnoverInspectionData>;
  onExportReport?: (data: TurnoverInspectionData) => void;
  className?: string;
}

const DEFAULT_INSPECTION: TurnoverInspectionData = {
  inspectionId: 'TURNOVER-2026-88',
  propertyAddress: 'Unit 1204, Tower B, Horizon Residence',
  tenantName: 'Alex Mercer',
  moveInDate: '2025-01-15',
  moveOutDate: '2026-07-28',
  beforePhotoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
  afterPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
  defects: [
    {
      id: 'd1',
      roomZone: 'Living Room',
      title: 'Drywall Scratch & Wall Paint Peeling',
      description: 'Deep 25cm gouge near TV mount anchor points.',
      severity: 'moderate',
      estimatedCost: 280,
      pinLocation: { x: 35, y: 42 },
      attribution: 'tenant',
      status: 'pending',
    },
    {
      id: 'd2',
      roomZone: 'Kitchen',
      title: 'Baseboard Water Staining',
      description: 'Discoloration around sink cabinet baseboard.',
      severity: 'critical',
      estimatedCost: 450,
      pinLocation: { x: 68, y: 78 },
      attribution: 'landlord',
      status: 'accepted',
    },
    {
      id: 'd3',
      roomZone: 'Master Bedroom',
      title: 'Minor Carpet Sun Fade',
      description: 'Slight sun bleaching near south window.',
      severity: 'cosmetic',
      estimatedCost: 0,
      pinLocation: { x: 18, y: 65 },
      attribution: 'wear_and_tear',
      status: 'accepted',
    },
  ],
};

const SEVERITY_BADGES: Record<DefectSeverity, { label: string; bg: string; text: string }> = {
  critical: { label: 'Critical Defect', bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
  moderate: { label: 'Moderate Damage', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  cosmetic: { label: 'Normal Wear', bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' },
};

export const TurnoverPhotoDiffViewer: React.FC<TurnoverPhotoDiffViewerProps> = ({
  initialData,
  onExportReport,
  className = '',
}) => {
  const { t } = useLanguage();

  const [inspection] = useState<TurnoverInspectionData>({
    ...DEFAULT_INSPECTION,
    ...initialData,
  });

  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [activeDefectId, setActiveDefectId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imgErrorBefore, setImgErrorBefore] = useState<boolean>(false);
  const [imgErrorAfter, setImgErrorAfter] = useState<boolean>(false);
  const [isExported, setIsExported] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const roomsList = useMemo(() => {
    const set = new Set(inspection.defects.map((d) => d.roomZone));
    return ['all', ...Array.from(set)];
  }, [inspection.defects]);

  const filteredDefects = useMemo(() => {
    if (selectedRoom === 'all') return inspection.defects;
    return inspection.defects.filter((d) => d.roomZone === selectedRoom);
  }, [inspection.defects, selectedRoom]);

  const totalDeductionCost = useMemo(() => {
    return inspection.defects
      .filter((d) => d.attribution === 'tenant')
      .reduce((sum, d) => sum + d.estimatedCost, 0);
  }, [inspection.defects]);

  // Handle curtain slider drag
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleExport = () => {
    if (onExportReport) {
      onExportReport(inspection);
    }
    setIsExported(true);
    setTimeout(() => setIsExported(false), 3000);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 ${className}`}
      data-testid="turnover-photo-diff-viewer"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <span className="material-symbols-outlined text-xl">compare</span>
            </span>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              {t('turnover.badge', { defaultValue: 'Turnover Inspection Photo Diff' })}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {t('turnover.title', { defaultValue: 'Move-In vs Move-Out Photo Comparison' })}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {inspection.propertyAddress} • Tenant: {inspection.tenantName} ({inspection.moveInDate} to {inspection.moveOutDate})
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-800/80">
            {(['split', 'sideBySide', 'overlay'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  viewMode === mode
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {mode === 'split' ? 'Curtain Slider' : mode === 'sideBySide' ? 'Side-by-Side' : 'Overlay'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">file_download</span>
            {isExported ? t('turnover.exported', { defaultValue: 'Report Saved!' }) : t('turnover.exportReport', { defaultValue: 'Export Sign-off Report' })}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewer */}
      <div className="relative z-10 mb-6 flex flex-col gap-6 lg:flex-row">
        {/* Photo Canvas */}
        <div className="flex-1">
          {/* Zoom controls bar */}
          <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-bold dark:bg-slate-800/70">
            <span className="text-slate-600 dark:text-slate-300">
              {viewMode === 'split' ? 'Drag slider to compare Before & After' : 'Photo Viewer'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="w-12 text-center text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Canvas container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative min-h-[380px] w-full overflow-hidden rounded-2xl border border-slate-300/80 bg-slate-950 shadow-inner select-none dark:border-slate-800"
          >
            {/* View Mode: Split Curtain Slider */}
            {viewMode === 'split' && (
              <div className="relative h-[380px] w-full" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}>
                {/* Before Image (Bottom Layer) */}
                <div className="absolute inset-0">
                  {imgErrorBefore ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-slate-400">
                      <span className="material-symbols-outlined text-4xl">broken_image</span>
                      <p className="mt-2 text-xs">Move-In Photo Unavailable</p>
                    </div>
                  ) : (
                    <img
                      src={inspection.beforePhotoUrl}
                      alt="Move-In Before"
                      onError={() => setImgErrorBefore(true)}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-lg bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                    BEFORE (Move-In: {inspection.moveInDate})
                  </span>
                </div>

                {/* After Image (Top Layer clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                  style={{ width: `${sliderPosition}%` }}
                >
                  {imgErrorAfter ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-slate-400">
                      <span className="material-symbols-outlined text-4xl">broken_image</span>
                      <p className="mt-2 text-xs">Move-Out Photo Unavailable</p>
                    </div>
                  ) : (
                    <img
                      src={inspection.afterPhotoUrl}
                      alt="Move-Out After"
                      onError={() => setImgErrorAfter(true)}
                      className="h-full w-full object-cover"
                      style={{ width: containerRef.current?.clientWidth || '100%' }}
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-lg bg-indigo-950/80 px-2.5 py-1 text-[11px] font-bold text-indigo-300 backdrop-blur-md">
                    AFTER (Move-Out: {inspection.moveOutDate})
                  </span>
                </div>

                {/* Slider handle bar */}
                <div
                  className="absolute bottom-0 top-0 z-20 flex w-1 cursor-ew-resize items-center justify-center bg-white shadow-2xl"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-4 ring-indigo-500/40">
                    <span className="material-symbols-outlined text-lg">code</span>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Side by Side */}
            {viewMode === 'sideBySide' && (
              <div className="grid h-[380px] grid-cols-2 gap-1 bg-slate-900 p-1">
                <div className="relative overflow-hidden rounded-xl">
                  <img src={inspection.beforePhotoUrl} alt="Before" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    BEFORE
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-xl">
                  <img src={inspection.afterPhotoUrl} alt="After" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                    AFTER
                  </span>
                </div>
              </div>
            )}

            {/* View Mode: Overlay */}
            {viewMode === 'overlay' && (
              <div className="relative h-[380px] w-full">
                <img src={inspection.beforePhotoUrl} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
                <img
                  src={inspection.afterPhotoUrl}
                  alt="After"
                  className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-difference"
                />
                <span className="absolute left-3 top-3 rounded-lg bg-purple-950/80 px-2.5 py-1 text-[11px] font-bold text-purple-300">
                  DIFFERENCE OVERLAY MASK
                </span>
              </div>
            )}

            {/* Defect Annotation Pins */}
            {filteredDefects.map((defect) => {
              const isActive = activeDefectId === defect.id;
              return (
                <button
                  key={defect.id}
                  type="button"
                  onClick={() => setActiveDefectId(defect.id)}
                  style={{ left: `${defect.pinLocation.x}%`, top: `${defect.pinLocation.y}%` }}
                  className={`absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-2 transition-all ${
                    isActive
                      ? 'bg-rose-500 text-white ring-4 ring-rose-500/40 scale-125 z-40'
                      : defect.severity === 'critical'
                      ? 'bg-rose-500/90 text-white animate-pulse'
                      : 'bg-amber-500/90 text-white'
                  }`}
                  title={`${defect.title} (${defect.roomZone})`}
                >
                  <span className="material-symbols-outlined text-base">location_on</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Defect List & Inspection Summary Panel */}
        <div className="w-full space-y-4 lg:w-96">
          {/* Room filter tabs */}
          <div className="flex overflow-x-auto gap-1 rounded-xl bg-slate-100 p-1 no-scrollbar dark:bg-slate-800">
            {roomsList.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedRoom === room
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {room === 'all' ? 'All Rooms' : room}
              </button>
            ))}
          </div>

          {/* Defect list */}
          <div className="max-h-[280px] space-y-2.5 overflow-y-auto pr-1 no-scrollbar">
            {filteredDefects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No defects logged for this room zone.
              </div>
            ) : (
              filteredDefects.map((defect) => {
                const isActive = activeDefectId === defect.id;
                const badge = SEVERITY_BADGES[defect.severity];
                return (
                  <div
                    key={defect.id}
                    onClick={() => setActiveDefectId(defect.id)}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-md dark:border-indigo-500 dark:bg-indigo-950/40'
                        : 'border-slate-200/80 bg-white/90 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {defect.roomZone}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {defect.title}
                        </h4>
                      </div>
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {defect.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-bold border-t border-slate-100 pt-2 dark:border-slate-800">
                      <span className="text-slate-500">
                        Attribution: <span className="capitalize text-slate-800 dark:text-slate-200">{defect.attribution.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {defect.estimatedCost > 0 ? `¥${defect.estimatedCost.toFixed(2)}` : 'No Charge'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Deposit Deduction Summary Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-slate-900/5 p-4 shadow-sm backdrop-blur-md dark:border-indigo-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Tenant Security Deposit Deduction:
              </span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                ¥{totalDeductionCost.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Calculated from {inspection.defects.filter((d) => d.attribution === 'tenant').length} tenant-attributed damages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnoverPhotoDiffViewer;
