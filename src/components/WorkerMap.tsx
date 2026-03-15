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
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div style="
                background-color: ${color}; 
                width: 14px; 
                height: 14px; 
                border-radius: 50%; 
                border: 2px solid white; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.15), 0 0 15px ${color}66;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    right: -4px;
                    bottom: -4px;
                    border-radius: 50%;
                    background: ${color};
                    opacity: 0.15;
                "></div>
            </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

const repairingIcon = createCustomIcon('#2563eb'); // Deep Blue (Modern markers)
const idleIcon = createCustomIcon('#64748b'); // Slate/Grey for idle

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
                {/* Modern Grayscale Tiles */}
                <TileLayer
                    key="modern-light"
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    className="map-grayscale-filter"
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
            
            {/* Custom overlay styles for Modern Light Tech */}
            <style dangerouslySetInnerHTML={{__html: `
                .map-grayscale-filter {
                    filter: grayscale(100%) brightness(1.05) contrast(0.9) opacity(0.85);
                }
                .leaflet-container {
                    font-family: inherit;
                    background: #f7f8fa !important;
                }
                .leaflet-popup-content-wrapper {
                    background: #ffffff;
                    border: 0.5px solid rgba(226, 232, 240, 0.8);
                    border-radius: 12px;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 0;
                    padding: 0;
                    width: auto !important;
                }
                .leaflet-popup-tip {
                    background: #ffffff;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
                }
                .leaflet-bar {
                    border: none !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
                    border-radius: 8px !important;
                    overflow: hidden;
                }
                .leaflet-bar a {
                    background-color: #ffffff !important;
                    color: #64748b !important;
                    border-bottom: 0.5px solid #f1f5f9 !important;
                }
            `}} />
        </div>
    );
};

export default WorkerMap;
