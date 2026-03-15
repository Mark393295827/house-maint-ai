import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons not loading correctly in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different statuses
const createCustomIcon = (color: string, shadowColor: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div style="
                width: 20px; 
                height: 20px; 
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <!-- Outer Dual Pulse Wave -->
                <div style="
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    background: ${shadowColor};
                    border-radius: 50%;
                    animation: v2026-pulse 2s infinite ease-out;
                    filter: blur(4px);
                "></div>
                <div style="
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    border: 1px solid ${shadowColor};
                    border-radius: 50%;
                    animation: v2026-pulse 2s infinite ease-out 0.5s;
                    opacity: 0;
                "></div>
                <!-- Marker Body -->
                <div style="
                    width: 14px; 
                    height: 14px; 
                    background: ${color}; 
                    border-radius: 50%; 
                    border: 2px solid white; 
                    box-shadow: 0 0 15px ${shadowColor};
                    position: relative;
                    z-index: 2;
                ">
                    <div style="
                        position: absolute;
                        top: 2px;
                        left: 2px;
                        width: 4px;
                        height: 4px;
                        background: white;
                        border-radius: 50%;
                        opacity: 0.6;
                    "></div>
                </div>
            </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

const repairingIcon = createCustomIcon('linear-gradient(135deg, #007aff, #00c6ff)', 'rgba(0, 122, 255, 0.4)');
const idleIcon = createCustomIcon('linear-gradient(135deg, #8e8e93, #c7c7cc)', 'rgba(142, 142, 147, 0.3)');

export interface WorkerLocation {
    id: string;
    name: string;
    status: 'repairing' | 'idle';
    location: [number, number]; // [lat, lng]
    currentTask: string;
    avatar?: string;
}

// Sanya, Hainan center coordinates
const CENTER: [number, number] = [18.2528, 109.5119];

const mockWorkers: WorkerLocation[] = [
    {
        id: 'w1',
        name: '张师傅 (Zhang)',
        status: 'repairing',
        location: [18.2558, 109.5149],
        currentTask: '管道漏水修复 - 海滨别墅A区 (Plumbing Leak Repair)',
    },
    {
        id: 'w2',
        name: '李师傅 (Li)',
        status: 'idle',
        location: [18.2488, 109.5089],
        currentTask: '待命 - 最近完成: 空调清洗 (Idle)',
    },
    {
        id: 'w3',
        name: '王师傅 (Wang)',
        status: 'repairing',
        location: [18.2588, 109.5029],
        currentTask: '电路查勘 - 阳光小区3栋 (Electrical Inspection)',
    },
];

const WorkerMap: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerLocation[]>([]);
    useEffect(() => {
        // Simulate fetching real-time data
        setWorkers(mockWorkers);
        
        // In a real app, this would poll or use WebSockets
        const interval = setInterval(() => {
            // slightly jiggle locations for realism
            setWorkers(prev => prev.map(w => ({
                ...w,
                location: [
                    w.location[0] + (Math.random() * 0.0004 - 0.0002),
                    w.location[1] + (Math.random() * 0.0004 - 0.0002)
                ]
            })));
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden relative" style={{ zIndex: 1 }}>
            <MapContainer 
                center={CENTER} 
                zoom={14} 
                style={{ height: '100%', width: '100%', backgroundColor: '#f7f8fa' }}
                zoomControl={false}
            >
                {/* Latest Google Maps v2024 Style Simulation */}
                <TileLayer
                    key="gmaps-latest"
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                {workers.map(worker => (
                    <Marker 
                        key={worker.id} 
                        position={worker.location}
                        icon={worker.status === 'repairing' ? repairingIcon : idleIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1 min-w-[180px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${worker.status === 'repairing' ? 'bg-[#2563eb] animate-pulse' : 'bg-slate-400'}`} />
                                    <h4 className="font-bold text-slate-800 m-0">{worker.name}</h4>
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-mono">
                                    Status: <span className={`font-bold ${worker.status === 'repairing' ? 'text-blue-600' : 'text-slate-500'}`}>{worker.status}</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-snug m-0 border-t border-slate-100 pt-2">
                                    {worker.currentTask}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            {/* Custom overlay styles for Apple FinTech */}
            <style dangerouslySetInnerHTML={{__html: `
                .leaflet-container {
                    font-family: inherit;
                    background: #f1f3f4 !important;
                }
                .leaflet-tile-container {
                    /* v2026 "Cooler" Palette: Shifting water and greenery to futuristic tones */
                    filter: saturate(0.85) brightness(1.02) contrast(1.08) hue-rotate(-12deg) sepia(0.05);
                }
                .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(40px) saturate(220%);
                    -webkit-backdrop-filter: blur(40px) saturate(220%);
                    border: 1px solid #000000;
                    border-radius: 24px;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
                    padding: 0;
                }
                @keyframes v2026-pulse {
                    0% { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                .leaflet-popup-content h4 {
                    font-weight: 950 !important;
                    color: #000000 !important;
                    letter-spacing: -0.04em;
                    text-transform: uppercase;
                }
                .leaflet-popup-content p {
                    font-weight: 700 !important;
                    color: #000000 !important;
                    opacity: 0.8;
                }
                .leaflet-popup-content {
                    margin: 0;
                    padding: 0;
                    width: auto !important;
                }
                .leaflet-popup-tip {
                    background: #000000;
                    opacity: 0.1;
                }
                .leaflet-control-zoom {
                    border: 1px solid #000000 !important;
                    margin: 24px !important;
                    border-radius: 16px !important;
                    overflow: hidden;
                }
                .leaflet-control-zoom-in, .leaflet-control-zoom-out {
                    background-color: white !important;
                    color: #000000 !important;
                    border: none !important;
                    width: 44px !important;
                    height: 44px !important;
                    line-height: 44px !important;
                    font-weight: 950 !important;
                    transition: all 0.3s ease;
                }
                .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
                    background-color: #000000 !important;
                    color: white !important;
                }
            `}} />
        </div>
    );
};

export default WorkerMap;
