import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, MapControl, ControlPosition } from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

interface WorkerLocation {
    id: string;
    name: string;
    status: 'repairing' | 'idle';
    location: { lat: number, lng: number };
    taskKey: 'pipe' | 'standby' | 'electrical';
}

const mockWorkers: WorkerLocation[] = [
    { id: 'w1', name: '张师傅 (Zhang)', status: 'repairing', location: { lat: 18.2558, lng: 109.5149 }, taskKey: 'pipe' },
    { id: 'w2', name: '李师傅 (Li)', status: 'idle', location: { lat: 18.2488, lng: 109.5089 }, taskKey: 'standby' },
    { id: 'w3', name: '王师傅 (Wang)', status: 'repairing', location: { lat: 18.2588, lng: 109.5029 }, taskKey: 'electrical' },
];

// ============ Sub-components ============

const CustomOverlayPane: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="m-6 p-4 rounded-xl border border-slate-200 bg-white/95 shadow-lg text-slate-800 space-y-2 pointer-events-auto">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('enterprise.map.systemDistribution')}</h2>
            <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
                <span className="text-[14px] font-bold tracking-tight">{t('enterprise.map.operationsView')}</span>
            </div>
            {isDemoMode && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">{t('enterprise.map.demoMode')}</span>
                </div>
            )}
        </div>
    );
};

// ============ Main Component ============

const EnterpriseMap: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerLocation[]>(mockWorkers);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

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

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);

    // ─── Google Maps View (Standard) ──────────────────────────
    if (!isDemoMode) {
        return (
            <div className="w-full h-full rounded-2xl overflow-hidden relative border border-slate-200 shadow-xl bg-slate-50">
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
                            <CustomOverlayPane />
                        </MapControl>

                        {workers.map(worker => (
                            <AdvancedMarker
                                key={worker.id}
                                position={worker.location}
                                onClick={() => setSelectedWorkerId(worker.id)}
                            >
                                <div className="relative group cursor-pointer">
                                    <div className={`w-4 h-4 rounded-full border-2 border-white shadow transition-transform group-hover:scale-110 ${worker.status === 'repairing' ? 'bg-blue-600 strategic-flash' : 'bg-slate-400'}`} />
                                    <div className="absolute top-1/2 left-full ml-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 px-2 py-1 rounded border border-slate-200 whitespace-nowrap shadow-md">
                                        <span className="text-[11px] font-medium">{worker.name}</span>
                                    </div>
                                </div>
                            </AdvancedMarker>
                        ))}

                        {selectedWorkerId && selectedWorker && (
                            <InfoWindow
                                position={selectedWorker.location}
                                onCloseClick={() => setSelectedWorkerId(null)}
                            >
                                <InfoPanel worker={selectedWorker} />
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
        <div className="w-full h-full rounded-2xl overflow-hidden relative border border-slate-200 shadow-xl bg-slate-50">
            <MapContainer 
                center={LEAFLET_CENTER} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                {workers.map(worker => (
                    <Marker 
                        key={worker.id} 
                        position={[worker.location.lat, worker.location.lng]}
                        icon={createLeafletIcon(worker.status)}
                        eventHandlers={{ click: () => setSelectedWorkerId(worker.id) }}
                    >
                        <Popup closeButton={true}>
                            <InfoPanel worker={worker} />
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Float Overlay for Demo Mode */}
            <div className="absolute top-0 left-0 z-[1000] pointer-events-none">
                <CustomOverlayPane />
            </div>
            <StyleSheet />
        </div>
    );
};

// ============ Specialized Helpers ============

const InfoPanel: React.FC<{ worker: WorkerLocation }> = ({ worker }) => {
    const { t } = useLanguage();

    return (
        <div className="p-1 min-w-[200px] text-slate-800">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <div className={`w-2.5 h-2.5 rounded-full ${worker.status === 'repairing' ? 'bg-blue-600' : 'bg-slate-400'}`} />
                <h4 className="text-[13px] font-bold m-0">{worker.name}</h4>
            </div>
            <div className="space-y-2">
                <div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">{t('enterprise.map.assignedTask')}</p>
                    <p className="text-[12px] font-normal leading-snug m-0">{t(`enterprise.map.tasks.${worker.taskKey}`)}</p>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${worker.status === 'repairing' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                        {t(`enterprise.map.status.${worker.status}`)}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('enterprise.map.position')}: {worker.location.lat.toFixed(3)}, {worker.location.lng.toFixed(3)}</span>
                </div>
            </div>
        </div>
    );
};

const createLeafletIcon = (status: string) => {
    const isRepairing = status === 'repairing';
    return L.divIcon({
        className: 'standard-marker',
        html: `<div class="marker-dot ${isRepairing ? 'active strategic-flash' : ''}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

const StyleSheet: React.FC = () => (
    <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper { border-radius: 8px !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 8px !important; }
        
        .marker-dot {
            width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;
            background: #94a3b8; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        .marker-dot.active { background: #2563eb; }
        .marker-dot:hover { transform: scale(1.1); }

        /* Strategic Flashing Animation */
        .strategic-flash {
            animation: beacon-flash 2s infinite ease-in-out;
        }
        
        @keyframes beacon-flash {
            0% { box-shadow: 0 0 0 0px rgba(37, 99, 235, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
            100% { box-shadow: 0 0 0 0px rgba(37, 99, 235, 0); }
        }

        /* For Google Maps Marker Styling */
        .bg-blue-600.strategic-flash {
            animation: google-beacon-flash 2.5s infinite ease-in-out;
        }

        @keyframes google-beacon-flash {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.1); filter: brightness(1.3); }
            100% { transform: scale(1); filter: brightness(1); }
        }
    `}} />
);

export default EnterpriseMap;
