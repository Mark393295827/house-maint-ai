import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, MapControl, ControlPosition, useMap } from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../i18n/LanguageContext';

// ============ Constants & Helpers ============
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'f090d80c0d0d0d0d';
const CENTER = { lat: 18.2528, lng: 109.5119 }; // Sanya, Hainan
const LEAFLET_CENTER: [number, number] = [18.2528, 109.5119];

// Check if we should use Demo Mode (Leaflet)
const isDemoMode = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE';

export interface LocalizedText {
    zh: string;
    en: string;
}

export interface WorkerLocation {
    id: string;
    name: string;
    status: 'repairing' | 'idle';
    location: { lat: number; lng: number };
    taskKey: 'pipe' | 'standby' | 'electrical';
    unitCode?: string;
    phone?: string;
}

export interface IncidentLocation {
    id: string;
    title: string;
    titleEn: string;
    severity: 'critical' | 'high' | 'medium';
    location: { lat: number; lng: number };
    time: string;
    status: string;
    statusEn: string;
}

export interface HotspotLocation {
    lat: number;
    lng: number;
    radius: number;
    label?: string;
}

export interface MaintenanceTrack {
    id: string;
    workerId: string;
    workerName: string;
    routeName: LocalizedText;
    frequency: 'high' | 'medium' | 'standard';
    color: string;
    incidentCount: number;
    path: [number, number][];
    completedJobs: number;
    arrivalEfficiency: string;
    hotspots?: HotspotLocation[];
}

export interface WorkerStatusSummary {
    total: number;
    repairing: number;
    idle: number;
}

export interface EnterpriseMapProps {
    onStatusChange?: (summary: WorkerStatusSummary) => void;
    onSelectWorker?: (workerId: string | null) => void;
    onDirectDispatch?: (targetId: string) => void;
    onContactWorker?: (workerId: string) => void;
}

const mockWorkers: WorkerLocation[] = [
    { id: 'w1', name: '张师傅 (Zhang)', status: 'repairing', location: { lat: 18.2558, lng: 109.5149 }, taskKey: 'pipe', unitCode: 'UNIT #1', phone: '138-0000-0001' },
    { id: 'w2', name: '李师傅 (Li)', status: 'idle', location: { lat: 18.2488, lng: 109.5089 }, taskKey: 'standby', unitCode: 'UNIT #2', phone: '138-0000-0002' },
    { id: 'w3', name: '王师傅 (Wang)', status: 'repairing', location: { lat: 18.2588, lng: 109.5029 }, taskKey: 'electrical', unitCode: 'UNIT #3', phone: '138-0000-0003' },
];

const mockIncidents: IncidentLocation[] = [
    {
        id: 'inc-1',
        title: '海棠湾社区主水管压差异常 (爆管风险)',
        titleEn: 'Haitang Bay Pipe Pressure Spike (Burst Risk)',
        severity: 'critical',
        location: { lat: 18.2570, lng: 109.5160 },
        time: '5 min ago',
        status: '紧急处置',
        statusEn: 'Critical Alert',
    },
    {
        id: 'inc-2',
        title: '中央广场 17F 空调主机高压报警',
        titleEn: 'Central Plaza 17F HVAC High-Pressure Alarm',
        severity: 'high',
        location: { lat: 18.2510, lng: 109.5050 },
        time: '18 min ago',
        status: '待派工单',
        statusEn: 'Pending Dispatch',
    },
];

export const mockTracks: MaintenanceTrack[] = [
    {
        id: 'track-1',
        workerId: 'w1',
        workerName: '张师傅',
        routeName: {
            zh: '海棠湾度假区专线',
            en: 'Haitang Bay Route',
        },
        frequency: 'high',
        color: '#38bdf8',
        incidentCount: 14,
        completedJobs: 42,
        arrivalEfficiency: '98.5%',
        path: [
            [18.2528, 109.5119],
            [18.2548, 109.5135],
            [18.2570, 109.5160],
            [18.2595, 109.5185],
            [18.2620, 109.5210],
        ],
        hotspots: [
            { lat: 18.2570, lng: 109.5160, radius: 80, label: '海棠湾管网热点' },
        ],
    },
    {
        id: 'track-2',
        workerId: 'w2',
        workerName: '李师傅',
        routeName: {
            zh: '中央广场管网维护线',
            en: 'Central Plaza Route',
        },
        frequency: 'medium',
        color: '#f59e0b',
        incidentCount: 9,
        completedJobs: 28,
        arrivalEfficiency: '96.2%',
        path: [
            [18.2450, 109.5030],
            [18.2488, 109.5089],
            [18.2510, 109.5050],
            [18.2540, 109.5020],
        ],
        hotspots: [
            { lat: 18.2510, lng: 109.5050, radius: 60, label: '中央广场热点' },
        ],
    },
    {
        id: 'track-3',
        workerId: 'w3',
        workerName: '王师傅',
        routeName: {
            zh: '鹿回头高压巡检线',
            en: 'Luhuitou HVAC Route',
        },
        frequency: 'standard',
        color: '#10b981',
        incidentCount: 4,
        completedJobs: 19,
        arrivalEfficiency: '94.8%',
        path: [
            [18.2588, 109.5029],
            [18.2610, 109.5055],
            [18.2635, 109.5080],
        ],
        hotspots: [
            { lat: 18.2610, lng: 109.5055, radius: 45, label: '鹿回头热点' },
        ],
    },
];

// ============ Sub-components ============

interface CustomOverlayPaneProps {
    status: WorkerStatusSummary;
    statusFilter: 'all' | 'repairing' | 'idle';
    setStatusFilter: (filter: 'all' | 'repairing' | 'idle') => void;
    showIncidents: boolean;
    setShowIncidents: React.Dispatch<React.SetStateAction<boolean>>;
    incidentCount: number;
    showTracks: boolean;
    setShowTracks: React.Dispatch<React.SetStateAction<boolean>>;
    trackCount: number;
}

const CustomOverlayPane: React.FC<CustomOverlayPaneProps> = ({
    status,
    statusFilter,
    setStatusFilter,
    showIncidents,
    setShowIncidents,
    incidentCount,
    showTracks,
    setShowTracks,
    trackCount,
}) => {
    const { t, locale } = useLanguage();
    const isZh = locale === 'zh';

    return (
        <div className="enterprise-map-overlay m-4 p-3.5 rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xl text-slate-800 space-y-3 pointer-events-auto max-w-[320px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t('enterprise.map.systemDistribution', { defaultValue: 'System Distribution' })}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm animate-pulse" />
                        <span className="text-[13px] font-bold text-slate-800 tracking-tight">
                            {t('enterprise.map.operationsView', { defaultValue: 'Operations View' })}
                        </span>
                    </div>
                </div>
                {isDemoMode && (
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {t('enterprise.map.demoMode', { defaultValue: 'Demo Mode' })}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center text-[11px]">
                <div className="px-1 py-0.5">
                    <span className="block text-[10px] text-slate-400">{isZh ? '全部' : 'Total'}</span>
                    <span className="font-bold text-slate-700">{status.total}</span>
                </div>
                <div className="px-1 py-0.5 border-l border-slate-200">
                    <span className="block text-[10px] text-blue-600 font-medium">{isZh ? '维修中' : 'Repairing'}</span>
                    <span className="font-bold text-blue-700">{status.repairing}</span>
                </div>
                <div className="px-1 py-0.5 border-l border-slate-200">
                    <span className="block text-[10px] text-emerald-600 font-medium">{isZh ? '待命' : 'Idle'}</span>
                    <span className="font-bold text-emerald-700">{status.idle}</span>
                </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>{isZh ? '人员筛选' : 'Technician Filter'}</span>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center ${
                            statusFilter === 'all'
                                ? 'bg-white text-slate-900 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {isZh ? '全部' : 'All'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('repairing')}
                        className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center ${
                            statusFilter === 'repairing'
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {isZh ? '维修中' : 'Repairing'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('idle')}
                        className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center ${
                            statusFilter === 'idle'
                                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {isZh ? '待命' : 'Idle'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setShowIncidents(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                        showIncidents
                            ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px]">⚠️</span>
                        <span>{isZh ? '突发警情图层' : 'Incident Layer'}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        showIncidents ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                        {showIncidents ? `${incidentCount} ${isZh ? '活跃' : 'Active'}` : (isZh ? '已隐藏' : 'Off')}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setShowTracks(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                        showTracks
                            ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px]">🛣️</span>
                        <span>{isZh ? '运维轨迹图层' : 'Maintenance Tracks / 运维轨迹'}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        showTracks ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                        {showTracks ? `${trackCount} ${isZh ? '条' : 'Routes'}` : (isZh ? '已隐藏' : 'Off')}
                    </span>
                </button>
            </div>
        </div>
    );
};

// ============ Google Maps Helpers ============

interface GooglePolylineProps {
    track: MaintenanceTrack;
    onClick: () => void;
}

const GooglePolyline: React.FC<GooglePolylineProps> = ({ track, onClick }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || typeof google === 'undefined' || !google.maps) return;

        const pathCoords = track.path.map(([lat, lng]) => ({ lat, lng }));
        const isHighFreq = track.frequency === 'high';

        const line = new google.maps.Polyline({
            path: pathCoords,
            geodesic: true,
            strokeColor: track.color,
            strokeOpacity: isHighFreq ? 0.95 : 0.75,
            strokeWeight: isHighFreq ? 6 : track.frequency === 'medium' ? 4 : 3,
            map: map,
            ...(isHighFreq
                ? {
                      icons: [
                          {
                              icon: {
                                  path: 'M 0,-1 0,1',
                                  strokeOpacity: 1,
                                  scale: 3,
                                  strokeColor: '#ffffff',
                              },
                              offset: '0',
                              repeat: '15px',
                          },
                      ],
                  }
                : {}),
        });

        const clickListener = line.addListener('click', onClick);

        let animInterval: number | undefined;
        if (isHighFreq) {
            let offset = 0;
            animInterval = window.setInterval(() => {
                offset = (offset + 1) % 100;
                const icons = line.get('icons');
                if (icons && icons[0]) {
                    icons[0].offset = `${offset}%`;
                    line.set('icons', icons);
                }
            }, 50);
        }

        return () => {
            if (animInterval) clearInterval(animInterval);
            google.maps.event.removeListener(clickListener);
            line.setMap(null);
        };
    }, [map, track, onClick]);

    return null;
};

interface GoogleCircleProps {
    center: { lat: number; lng: number };
    radius: number;
    color: string;
    onClick?: () => void;
}

const GoogleCircle: React.FC<GoogleCircleProps> = ({ center, radius, color, onClick }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || typeof google === 'undefined' || !google.maps) return;

        const circle = new google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.35,
            map,
            center,
            radius,
        });

        let clickListener: google.maps.MapsEventListener | undefined;
        if (onClick) {
            clickListener = circle.addListener('click', onClick);
        }

        return () => {
            if (clickListener) google.maps.event.removeListener(clickListener);
            circle.setMap(null);
        };
    }, [map, center, radius, color, onClick]);

    return null;
};

// ============ Main Component ============

const EnterpriseMap: React.FC<EnterpriseMapProps> = ({
    onStatusChange,
    onSelectWorker,
    onDirectDispatch,
    onContactWorker,
}) => {
    const { locale } = useLanguage();
    const isZh = locale === 'zh';

    const [workers, setWorkers] = useState<WorkerLocation[]>(mockWorkers);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'repairing' | 'idle'>('all');
    const [showIncidents, setShowIncidents] = useState<boolean>(true);
    const [showTracks, setShowTracks] = useState<boolean>(true);

    const repairingCount = workers.filter((worker) => worker.status === 'repairing').length;
    const idleCount = workers.filter((worker) => worker.status === 'idle').length;
    const statusSummary = { total: workers.length, repairing: repairingCount, idle: idleCount };

    useEffect(() => {
        const interval = setInterval(() => {
            setWorkers(prev => prev.map(w => ({
                ...w,
                location: {
                    lat: w.location.lat + (Math.random() * 0.0002 - 0.0001),
                    lng: w.location.lng + (Math.random() * 0.0002 - 0.0001)
                }
            })));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        onStatusChange?.({ total: workers.length, repairing: repairingCount, idle: idleCount });
    }, [idleCount, onStatusChange, repairingCount, workers.length]);

    const handleWorkerClick = (workerId: string) => {
        setSelectedWorkerId(workerId);
        setSelectedIncidentId(null);
        setSelectedTrackId(null);
        onSelectWorker?.(workerId);
    };

    const handleIncidentClick = (incidentId: string) => {
        setSelectedIncidentId(incidentId);
        setSelectedWorkerId(null);
        setSelectedTrackId(null);
    };

    const handleTrackClick = (trackId: string) => {
        setSelectedTrackId(trackId);
        setSelectedWorkerId(null);
        setSelectedIncidentId(null);
        onSelectWorker?.(null);
    };

    const handleCloseInfoWindow = () => {
        setSelectedWorkerId(null);
        setSelectedIncidentId(null);
        setSelectedTrackId(null);
        onSelectWorker?.(null);
    };

    const handleDirectDispatch = (targetId: string) => {
        onDirectDispatch?.(targetId);
    };

    const handleContactWorker = (workerId: string) => {
        onContactWorker?.(workerId);
    };

    const filteredWorkers = workers.filter(worker => {
        if (statusFilter === 'all') return true;
        return worker.status === statusFilter;
    });

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    const selectedIncident = mockIncidents.find(inc => inc.id === selectedIncidentId);
    const selectedTrack = mockTracks.find(t => t.id === selectedTrackId);
    const selectedTrackMidpoint = selectedTrack
        ? {
              lat: selectedTrack.path[Math.floor(selectedTrack.path.length / 2)][0],
              lng: selectedTrack.path[Math.floor(selectedTrack.path.length / 2)][1],
          }
        : null;

    // ─── Google Maps View (Standard) ──────────────────────────
    if (!isDemoMode) {
        return (
            <div className="enterprise-map-root w-full h-full overflow-hidden relative bg-slate-50" data-testid="enterprise-map">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <Map
                        defaultCenter={CENTER}
                        defaultZoom={15}
                        mapId={MAP_ID}
                        disableDefaultUI={false}
                        gestureHandling={'greedy'}
                        className="w-full h-full"
                    >
                        <MapControl position={ControlPosition.TOP_LEFT}>
                            <CustomOverlayPane
                                status={statusSummary}
                                statusFilter={statusFilter}
                                setStatusFilter={setStatusFilter}
                                showIncidents={showIncidents}
                                setShowIncidents={setShowIncidents}
                                incidentCount={mockIncidents.length}
                                showTracks={showTracks}
                                setShowTracks={setShowTracks}
                                trackCount={mockTracks.length}
                            />
                        </MapControl>

                        {showTracks && mockTracks.map(track => (
                            <React.Fragment key={track.id}>
                                <GooglePolyline
                                    track={track}
                                    onClick={() => handleTrackClick(track.id)}
                                />
                                {track.hotspots?.map((hotspot, idx) => (
                                    <GoogleCircle
                                        key={`g-hotspot-${track.id}-${idx}`}
                                        center={{ lat: hotspot.lat, lng: hotspot.lng }}
                                        radius={hotspot.radius}
                                        color={track.color}
                                        onClick={() => handleTrackClick(track.id)}
                                    />
                                ))}
                            </React.Fragment>
                        ))}

                        {filteredWorkers.map((worker, index) => {
                            const isRepairing = worker.status === 'repairing';
                            const unitText = worker.unitCode || `UNIT #${index + 1}`;
                            const statusText = isRepairing ? (isZh ? 'Active Repair' : 'Active Repair') : (isZh ? 'Standby' : 'Standby');

                            return (
                                <AdvancedMarker
                                    key={worker.id}
                                    position={worker.location}
                                    onClick={() => handleWorkerClick(worker.id)}
                                >
                                    <div className="relative group cursor-pointer flex flex-col items-center select-none" title={`${worker.name} - ${statusText}`}>
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shadow-md whitespace-nowrap mb-1 transition-all border backdrop-blur-md ${
                                            isRepairing
                                                ? 'bg-slate-900/90 text-blue-300 border-blue-400/60 shadow-blue-500/30'
                                                : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-500/20'
                                        }`}>
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isRepairing ? 'bg-blue-400 animate-ping' : 'bg-emerald-400'}`} />
                                            {unitText} - {isRepairing ? (isZh ? '维修中' : 'Active Repair') : (isZh ? '待命' : 'Standby')}
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow transition-transform group-hover:scale-125 ${isRepairing ? 'bg-blue-600 strategic-flash' : 'bg-emerald-500'}`} />
                                    </div>
                                </AdvancedMarker>
                            );
                        })}

                        {showIncidents && mockIncidents.map(incident => (
                            <AdvancedMarker
                                key={incident.id}
                                position={incident.location}
                                onClick={() => handleIncidentClick(incident.id)}
                            >
                                <div className="relative group cursor-pointer flex flex-col items-center select-none">
                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shadow-md whitespace-nowrap mb-1 border ${
                                        incident.severity === 'critical' ? 'bg-red-950/90 text-red-200 border-red-500/80' : 'bg-amber-950/90 text-amber-200 border-amber-500/80'
                                    }`}>
                                        ⚠️ {incident.id.toUpperCase()}
                                    </div>
                                    <div className="incident-marker-dot" />
                                </div>
                            </AdvancedMarker>
                        ))}

                        {selectedWorkerId && selectedWorker && (
                            <InfoWindow
                                position={selectedWorker.location}
                                onCloseClick={handleCloseInfoWindow}
                            >
                                <InfoPanel
                                    worker={selectedWorker}
                                    onDirectDispatch={handleDirectDispatch}
                                    onContactWorker={handleContactWorker}
                                />
                            </InfoWindow>
                        )}

                        {selectedIncidentId && selectedIncident && (
                            <InfoWindow
                                position={selectedIncident.location}
                                onCloseClick={handleCloseInfoWindow}
                            >
                                <IncidentInfoPanel
                                    incident={selectedIncident}
                                    onDirectDispatch={handleDirectDispatch}
                                />
                            </InfoWindow>
                        )}

                        {selectedTrackId && selectedTrack && selectedTrackMidpoint && (
                            <InfoWindow
                                position={selectedTrackMidpoint}
                                onCloseClick={handleCloseInfoWindow}
                            >
                                <TrackInfoPanel track={selectedTrack} />
                            </InfoWindow>
                        )}
                    </Map>
                </APIProvider>
                <StyleSheet />
            </div>
        );
    }

    // ─── Demo Mode View (Leaflet Fallback) ─────────────────────────────
    return (
        <div className="enterprise-map-root w-full h-full overflow-hidden relative bg-slate-50" data-testid="enterprise-map">
            <MapContainer 
                center={LEAFLET_CENTER} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {showTracks && mockTracks.map(track => {
                    const isHighFreq = track.frequency === 'high';
                    return (
                        <React.Fragment key={track.id}>
                            <Polyline
                                positions={track.path}
                                pathOptions={{
                                    color: track.color,
                                    weight: isHighFreq ? 6 : track.frequency === 'medium' ? 4 : 3,
                                    dashArray: isHighFreq ? '10, 10' : undefined,
                                    opacity: 0.85,
                                    className: isHighFreq ? 'animated-glow-polyline' : undefined,
                                }}
                                eventHandlers={{
                                    click: () => handleTrackClick(track.id),
                                }}
                            />
                            {track.hotspots?.map((hotspot, idx) => (
                                <CircleMarker
                                    key={`leaflet-hotspot-${track.id}-${idx}`}
                                    center={[hotspot.lat, hotspot.lng]}
                                    radius={16}
                                    pathOptions={{
                                        color: track.color,
                                        fillColor: track.color,
                                        fillOpacity: 0.35,
                                        weight: 2,
                                        className: 'hotspot-pulse-circle',
                                    }}
                                    eventHandlers={{
                                        click: () => handleTrackClick(track.id),
                                    }}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}
                
                {filteredWorkers.map((worker, index) => (
                    <Marker 
                        key={worker.id} 
                        position={[worker.location.lat, worker.location.lng]}
                        icon={createLeafletIcon(worker, index, isZh)}
                        title={`${worker.name} - ${worker.status}`}
                        eventHandlers={{ click: () => handleWorkerClick(worker.id) }}
                    >
                        <Popup closeButton={true} eventHandlers={{ remove: handleCloseInfoWindow }}>
                            <InfoPanel
                                worker={worker}
                                onDirectDispatch={handleDirectDispatch}
                                onContactWorker={handleContactWorker}
                            />
                        </Popup>
                    </Marker>
                ))}

                {showIncidents && mockIncidents.map(incident => (
                    <Marker
                        key={incident.id}
                        position={[incident.location.lat, incident.location.lng]}
                        icon={createLeafletIncidentIcon(incident)}
                        eventHandlers={{
                            click: () => handleIncidentClick(incident.id)
                        }}
                    >
                        <Popup closeButton={true} eventHandlers={{ remove: handleCloseInfoWindow }}>
                            <IncidentInfoPanel
                                incident={incident}
                                onDirectDispatch={handleDirectDispatch}
                            />
                        </Popup>
                    </Marker>
                ))}

                {selectedTrackId && selectedTrack && selectedTrackMidpoint && (
                    <Popup
                        position={[selectedTrackMidpoint.lat, selectedTrackMidpoint.lng]}
                        eventHandlers={{ remove: handleCloseInfoWindow }}
                    >
                        <TrackInfoPanel track={selectedTrack} />
                    </Popup>
                )}
            </MapContainer>

            <div className="absolute top-0 left-0 z-[1000] pointer-events-none">
                <CustomOverlayPane
                    status={statusSummary}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    showIncidents={showIncidents}
                    setShowIncidents={setShowIncidents}
                    incidentCount={mockIncidents.length}
                    showTracks={showTracks}
                    setShowTracks={setShowTracks}
                    trackCount={mockTracks.length}
                />
            </div>
            <StyleSheet />
        </div>
    );
};

// ============ Info Panels & Leaflet Helpers ============

interface InfoPanelProps {
    worker: WorkerLocation;
    onDirectDispatch?: (workerId: string) => void;
    onContactWorker?: (workerId: string) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ worker, onDirectDispatch, onContactWorker }) => {
    const { t, locale } = useLanguage();
    const isZh = locale === 'zh';

    return (
        <div className="p-2 min-w-[220px] max-w-[280px] text-slate-800 font-sans">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${worker.status === 'repairing' ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'}`} />
                    <h4 className="text-[13px] font-bold m-0 text-slate-900">{worker.name}</h4>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {worker.unitCode || 'UNIT #1'}
                </span>
            </div>

            <div className="space-y-2 mb-3">
                <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
                        {t('enterprise.map.assignedTask', { defaultValue: 'Assigned Task' })}
                    </p>
                    <p className="text-[12px] font-medium text-slate-700 m-0 leading-tight">
                        {t(`enterprise.map.tasks.${worker.taskKey}`, { defaultValue: worker.taskKey })}
                    </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        worker.status === 'repairing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                        {worker.status === 'repairing'
                            ? (isZh ? '维修中 (Active Repair)' : 'Active Repair')
                            : (isZh ? '待命 (Standby)' : 'Standby')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {worker.location.lat.toFixed(3)}, {worker.location.lng.toFixed(3)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDirectDispatch?.(worker.id);
                    }}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                    <span className="text-[12px]">⚡</span>
                    <span>{isZh ? '快捷派单' : 'Direct Dispatch'}</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onContactWorker?.(worker.id);
                    }}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-medium transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                    <span className="text-[12px]">📞</span>
                    <span>{isZh ? '呼叫人员' : 'Contact'}</span>
                </button>
            </div>
        </div>
    );
};

const IncidentInfoPanel: React.FC<{
    incident: IncidentLocation;
    onDirectDispatch?: (targetId: string) => void;
}> = ({ incident, onDirectDispatch }) => {
    const { locale } = useLanguage();
    const isZh = locale === 'zh';

    return (
        <div className="p-2 min-w-[220px] max-w-[280px] text-slate-800 font-sans">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-red-100">
                <div className="flex items-center gap-1.5">
                    <span className="text-red-600 text-sm">⚠️</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                        {incident.severity}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400">{incident.time}</span>
            </div>
            <h4 className="text-[13px] font-bold text-slate-900 mb-1 leading-snug">
                {isZh ? incident.title : incident.titleEn}
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
                {isZh ? '状态: ' : 'Status: '}<strong className="text-slate-700">{isZh ? incident.status : incident.statusEn}</strong>
            </p>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDirectDispatch?.(incident.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors shadow-sm cursor-pointer"
            >
                <span>⚡</span>
                <span>{isZh ? '快捷派单 / 指派技师' : 'Direct Dispatch'}</span>
            </button>
        </div>
    );
};

interface TrackInfoPanelProps {
    track: MaintenanceTrack;
}

const TrackInfoPanel: React.FC<TrackInfoPanelProps> = ({ track }) => {
    const { locale } = useLanguage();
    const isZh = locale === 'zh';

    const freqBadgeColor =
        track.frequency === 'high'
            ? 'bg-sky-100 text-sky-800 border-sky-300'
            : track.frequency === 'medium'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-300';

    const freqLabel =
        track.frequency === 'high'
            ? (isZh ? '高频巡检' : 'High Frequency Patrol')
            : track.frequency === 'medium'
            ? (isZh ? '中频巡检' : 'Medium Frequency Patrol')
            : (isZh ? '标准路线' : 'Standard Route');

    return (
        <div className="p-2.5 min-w-[240px] max-w-[290px] text-slate-800 font-sans">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full shadow-sm animate-pulse"
                        style={{ backgroundColor: track.color }}
                    />
                    <h4 className="text-[13px] font-bold m-0 text-slate-900 leading-snug">
                        {isZh ? track.routeName.zh : track.routeName.en}
                    </h4>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${freqBadgeColor}`}>
                    {freqLabel}
                </span>
            </div>

            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">{isZh ? '负责技师' : 'Technician'}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                        <span className="text-xs">👷</span>
                        {track.workerName}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-center text-[11px]">
                    <div className="bg-sky-50/70 p-1.5 rounded-lg border border-sky-100">
                        <span className="block text-[10px] text-sky-600 font-medium">{isZh ? '已完成工单' : 'Completed Jobs'}</span>
                        <span className="font-extrabold text-sky-900 text-[13px]">{track.completedJobs} {isZh ? '单' : 'jobs'}</span>
                    </div>
                    <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                        <span className="block text-[10px] text-emerald-600 font-medium">{isZh ? '到达履约率' : 'Arrival Efficiency'}</span>
                        <span className="font-extrabold text-emerald-900 text-[13px]">{track.arrivalEfficiency}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 pt-1 text-slate-500 border-t border-slate-100">
                    <span>{isZh ? '关联警情数' : 'Incidents Count'}</span>
                    <span className="font-bold text-amber-600">{track.incidentCount} {isZh ? '起' : 'events'}</span>
                </div>
            </div>
        </div>
    );
};

const createLeafletIcon = (worker: WorkerLocation, index: number, isZh: boolean) => {
    const isRepairing = worker.status === 'repairing';
    const unitText = worker.unitCode || `UNIT #${index + 1}`;
    const statusText = isRepairing ? (isZh ? '维修中' : 'Active Repair') : (isZh ? '待命' : 'Standby');
    const badgeBgClass = isRepairing ? 'badge-repairing' : 'badge-idle';
    const dotClass = isRepairing ? 'active strategic-flash' : 'idle';

    return L.divIcon({
        className: 'tactical-worker-marker-icon',
        html: `
            <div class="tactical-marker-container">
                <div class="tactical-badge ${badgeBgClass}">
                    <span class="badge-dot ${isRepairing ? 'blue' : 'green'}"></span>
                    <span class="badge-text">${unitText} - ${statusText}</span>
                </div>
                <div class="marker-dot ${dotClass}"></div>
            </div>
        `,
        iconSize: [150, 48],
        iconAnchor: [75, 48]
    });
};

const createLeafletIncidentIcon = (incident: IncidentLocation) => {
    const isCritical = incident.severity === 'critical';
    return L.divIcon({
        className: 'tactical-incident-marker-icon',
        html: `
            <div class="tactical-marker-container">
                <div class="tactical-badge badge-incident ${isCritical ? 'critical' : 'high'}">
                    <span class="badge-dot red"></span>
                    <span class="badge-text">⚠️ ${incident.id.toUpperCase()}</span>
                </div>
                <div class="incident-marker-dot ${isCritical ? 'critical-flash' : 'high-flash'}"></div>
            </div>
        `,
        iconSize: [130, 48],
        iconAnchor: [65, 48]
    });
};

const StyleSheet: React.FC = () => (
    <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper { border-radius: 12px !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 8px !important; }
        
        .tactical-worker-marker-icon, .tactical-incident-marker-icon {
            background: transparent !important;
            border: none !important;
        }

        .tactical-marker-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: auto;
        }

        .tactical-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            margin-bottom: 2px;
            backdrop-filter: blur(4px);
        }

        .tactical-badge.badge-repairing {
            background: rgba(15, 23, 42, 0.92);
            color: #93c5fd;
            border: 1px solid rgba(96, 165, 250, 0.6);
        }

        .tactical-badge.badge-idle {
            background: rgba(6, 78, 59, 0.92);
            color: #6ee7b7;
            border: 1px solid rgba(52, 211, 153, 0.6);
        }

        .tactical-badge.badge-incident.critical {
            background: rgba(153, 27, 27, 0.95);
            color: #fca5a5;
            border: 1px solid rgba(248, 113, 113, 0.8);
        }

        .tactical-badge.badge-incident.high {
            background: rgba(146, 64, 14, 0.95);
            color: #fde68a;
            border: 1px solid rgba(251, 191, 36, 0.8);
        }

        .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
        }
        .badge-dot.blue { background: #3b82f6; }
        .badge-dot.green { background: #10b981; }
        .badge-dot.red { background: #ef4444; }

        .marker-dot {
            width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;
            background: #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        }
        .marker-dot.active { background: #2563eb; }
        .marker-dot:hover { transform: scale(1.2); }

        .incident-marker-dot {
            width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;
            background: #dc2626; box-shadow: 0 1px 4px rgba(220, 38, 38, 0.4);
            animation: incident-pulse 1.5s infinite;
        }

        @keyframes incident-pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }

        .strategic-flash {
            animation: beacon-flash 2s infinite ease-in-out;
        }
        
        @keyframes beacon-flash {
            0% { box-shadow: 0 0 0 0px rgba(37, 99, 235, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
            100% { box-shadow: 0 0 0 0px rgba(37, 99, 235, 0); }
        }

        .bg-blue-600.strategic-flash {
            animation: google-beacon-flash 2.5s infinite ease-in-out;
        }

        @keyframes google-beacon-flash {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.1); filter: brightness(1.3); }
            100% { transform: scale(1); filter: brightness(1); }
        }

        .animated-glow-polyline {
            stroke-dasharray: 10, 10;
            animation: polyline-glow-dash 2s linear infinite;
            filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8));
        }

        @keyframes polyline-glow-dash {
            0% { stroke-dashoffset: 40; }
            100% { stroke-dashoffset: 0; }
        }

        .hotspot-pulse-circle {
            animation: hotspot-ring-pulse 2s infinite ease-in-out;
        }

        @keyframes hotspot-ring-pulse {
            0% { stroke-width: 2; fill-opacity: 0.35; }
            50% { stroke-width: 4; fill-opacity: 0.6; }
            100% { stroke-width: 2; fill-opacity: 0.35; }
        }
    `}} />
);

export default EnterpriseMap;
