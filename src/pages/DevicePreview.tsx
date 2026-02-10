import React, { useState, useCallback, useRef, useEffect } from 'react';
import './DevicePreview.css';

/* ─── Device Presets ─── */
interface DevicePreset {
    id: string;
    name: string;
    shortName: string;
    width: number;
    height: number;
    variant: 'iphone' | 'se' | 'android' | 'tablet';
}

const DEVICES: DevicePreset[] = [
    { id: 'iphone15', name: 'iPhone 15 Pro', shortName: 'iPhone 15', width: 393, height: 852, variant: 'iphone' },
    { id: 'iphonese', name: 'iPhone SE', shortName: 'SE', width: 375, height: 667, variant: 'se' },
    { id: 'pixel7', name: 'Pixel 7', shortName: 'Pixel 7', width: 412, height: 915, variant: 'android' },
    { id: 'ipadmini', name: 'iPad Mini', shortName: 'iPad', width: 768, height: 1024, variant: 'tablet' },
];

const QUICK_ROUTES = ['/', '/login', '/diagnosis', '/community', '/welcome', '/calendar'];

/* ─── SVG Icons ─── */
const RotateIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
);

const ZoomInIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" />
    </svg>
);

const MoonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
);

const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    </svg>
);

/* ─── Main Component ─── */
const DevicePreview: React.FC = () => {
    const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICES[0]);
    const [isLandscape, setIsLandscape] = useState(false);
    const [zoom, setZoom] = useState(0.85);
    const [currentRoute, setCurrentRoute] = useState('/');
    const [urlInput, setUrlInput] = useState('/');
    const [darkMode, setDarkMode] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const iframeUrl = `${window.location.origin}${currentRoute}`;

    const screenWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
    const screenHeight = isLandscape ? selectedDevice.width : selectedDevice.height;

    const handleNavigate = useCallback((route: string) => {
        const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
        setCurrentRoute(normalizedRoute);
        setUrlInput(normalizedRoute);
    }, []);

    const handleUrlSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        handleNavigate(urlInput);
    }, [urlInput, handleNavigate]);

    const handleDeviceChange = useCallback((device: DevicePreset) => {
        setSelectedDevice(device);
    }, []);

    const handleZoom = useCallback((delta: number) => {
        setZoom(prev => Math.min(1.5, Math.max(0.3, Math.round((prev + delta) * 100) / 100)));
    }, []);

    const handleRefresh = useCallback(() => {
        if (iframeRef.current) {
            iframeRef.current.src = iframeUrl;
        }
    }, [iframeUrl]);

    // Toggle dark mode class on iframe
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const onLoad = () => {
            try {
                const doc = iframe.contentDocument;
                if (doc) {
                    doc.documentElement.classList.toggle('dark', darkMode);
                }
            } catch {
                // Cross-origin restriction — silently ignore
            }
        };

        iframe.addEventListener('load', onLoad);
        return () => iframe.removeEventListener('load', onLoad);
    }, [darkMode, currentRoute]);

    // Frame variant class
    const frameVariantClass =
        selectedDevice.variant === 'se' ? 'device-frame--se' :
            selectedDevice.variant === 'android' ? 'device-frame--android' :
                selectedDevice.variant === 'tablet' ? 'device-frame--tablet' : '';

    return (
        <div className="preview-workspace">
            {/* ─── Toolbar ─── */}
            <div className="preview-toolbar">
                <div className="preview-toolbar__logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 18H7V5h10v14zm-5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
                    </svg>
                    Device Preview
                </div>

                <div className="preview-toolbar__divider" />

                {/* Device Selector */}
                <div className="device-selector">
                    {DEVICES.map(device => (
                        <button
                            key={device.id}
                            className={`device-btn ${selectedDevice.id === device.id ? 'active' : ''}`}
                            onClick={() => handleDeviceChange(device)}
                        >
                            {device.shortName}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="toolbar-controls">
                    <button
                        className={`toolbar-icon-btn ${isLandscape ? 'active' : ''}`}
                        onClick={() => setIsLandscape(prev => !prev)}
                        title="Toggle orientation"
                    >
                        <RotateIcon />
                    </button>

                    <button
                        className="toolbar-icon-btn"
                        onClick={() => handleZoom(-0.1)}
                        title="Zoom out"
                    >
                        <ZoomOutIcon />
                    </button>

                    <span className="zoom-display">{Math.round(zoom * 100)}%</span>

                    <button
                        className="toolbar-icon-btn"
                        onClick={() => handleZoom(0.1)}
                        title="Zoom in"
                    >
                        <ZoomInIcon />
                    </button>

                    <div className="preview-toolbar__divider" />

                    <button
                        className={`toolbar-icon-btn ${darkMode ? 'active' : ''}`}
                        onClick={() => setDarkMode(prev => !prev)}
                        title="Toggle dark mode"
                    >
                        {darkMode ? <SunIcon /> : <MoonIcon />}
                    </button>

                    <button
                        className="toolbar-icon-btn"
                        onClick={handleRefresh}
                        title="Refresh"
                    >
                        <RefreshIcon />
                    </button>
                </div>
            </div>

            {/* ─── URL Bar ─── */}
            <div className="preview-url-bar">
                <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flex: 1, gap: '8px', alignItems: 'center' }}>
                    <div className="url-bar__input-wrapper">
                        <span className="url-bar__prefix">localhost:5173</span>
                        <input
                            className="url-bar__input"
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="/"
                        />
                    </div>
                    <button type="submit" className="url-bar__go-btn">GO</button>
                </form>

                <div className="url-bar__routes">
                    {QUICK_ROUTES.map(route => (
                        <button
                            key={route}
                            className={`route-chip ${currentRoute === route ? 'active' : ''}`}
                            onClick={() => handleNavigate(route)}
                        >
                            {route === '/' ? 'Home' : route.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Device Canvas ─── */}
            <div className="preview-canvas">
                <div
                    className="device-shell"
                    key={selectedDevice.id + (isLandscape ? '-l' : '-p')}
                    style={{ transform: `scale(${zoom})` }}
                >
                    <div className={`device-frame ${frameVariantClass}`}>
                        {/* Dynamic Island / Notch */}
                        <div className="device-frame__notch" />

                        {/* Screen */}
                        <div
                            className="device-screen"
                            style={{ width: screenWidth, height: screenHeight }}
                        >
                            <iframe
                                ref={iframeRef}
                                src={iframeUrl}
                                title="App Preview"
                                style={{ width: screenWidth, height: screenHeight }}
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                            />
                        </div>

                        {/* Home Bar */}
                        <div className="device-frame__home-bar" />
                    </div>

                    {/* Device Info */}
                    <div className="device-info">
                        {selectedDevice.name} — {screenWidth} × {screenHeight}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DevicePreview;
