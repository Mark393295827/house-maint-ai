import { useEffect, useRef } from 'react';

class Burst {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    opacity: number;
    active: boolean;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 150 + Math.random() * 150; // Large dazzling burst
        this.opacity = 1.0;
        this.active = true;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.15;
        this.opacity -= 0.02; // Slow fade away
        if (this.opacity <= 0) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active || this.opacity <= 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.opacity);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(0.1, `rgba(240, 240, 245, ${this.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
    }
}

function triggerLogoBurstRipple() {
    const brandMark = document.querySelector('.gravity-brand-mark');
    if (!brandMark) return;

    const rect = brandMark.getBoundingClientRect();
    
    // Create multiple expanding rings for a "burst" effect!
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const ripple = document.createElement('div');
            ripple.style.position = 'fixed';
            ripple.style.left = `${rect.left + rect.width / 2}px`;
            ripple.style.top = `${rect.top + rect.height / 2}px`;
            ripple.style.width = `${rect.width}px`;
            ripple.style.height = `${rect.height}px`;
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.borderRadius = '50%';
            ripple.style.border = `${2.0 + i}px solid ${i === 1 ? '#FFFFFF' : '#4285F4'}`;
            ripple.style.pointerEvents = 'none';
            ripple.style.zIndex = '9999';
            ripple.style.transition = `transform ${0.8 + i * 0.2}s cubic-bezier(0.1, 0.8, 0.3, 1), opacity ${0.8 + i * 0.2}s ease-out`;
            ripple.style.opacity = '0.85';
            
            document.body.appendChild(ripple);
            
            void ripple.offsetWidth;
            ripple.style.transform = `translate(-50%, -50%) scale(${4.0 + i * 1.5})`;
            ripple.style.opacity = '0';
            
            setTimeout(() => {
                ripple.remove();
            }, 1200);
        }, i * 100);
    }
    
    // Strong scale pulse on target brand mark
    const brandMarkEl = brandMark as HTMLElement;
    brandMarkEl.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    brandMarkEl.style.transform = 'scale(1.4)';
    
    setTimeout(() => {
        brandMarkEl.style.transform = 'none';
    }, 200);
}

function triggerLogoRipple() {
    const brandMark = document.querySelector('.gravity-brand-mark');
    if (!brandMark) return;
    
    // Throttle ripples to avoid lag
    const now = Date.now();
    if ((window as any)._lastRippleTime && now - (window as any)._lastRippleTime < 40) {
        return;
    }
    (window as any)._lastRippleTime = now;

    const rect = brandMark.getBoundingClientRect();
    
    // Create ripple ring
    const ripple = document.createElement('div');
    ripple.style.position = 'fixed';
    ripple.style.left = `${rect.left + rect.width / 2}px`;
    ripple.style.top = `${rect.top + rect.height / 2}px`;
    ripple.style.width = `${rect.width}px`;
    ripple.style.height = `${rect.height}px`;
    ripple.style.transform = 'translate(-50%, -50%) scale(1)';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '2.5px solid #4285F4';
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '9999';
    ripple.style.transition = 'transform 0.8s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.8s ease-out';
    ripple.style.opacity = '0.7';
    
    document.body.appendChild(ripple);
    
    // Trigger transition
    void ripple.offsetWidth;
    ripple.style.transform = 'translate(-50%, -50%) scale(3.5)';
    ripple.style.opacity = '0';
    
    // Scale pulse on target brand mark
    const brandMarkEl = brandMark as HTMLElement;
    brandMarkEl.style.transition = 'transform 0.1s cubic-bezier(0.1, 0.8, 0.3, 1)';
    brandMarkEl.style.transform = 'scale(1.22)';
    
    clearTimeout((window as any)._logoPulseTimeout);
    (window as any)._logoPulseTimeout = setTimeout(() => {
        brandMarkEl.style.transform = 'none';
    }, 100);
    
    setTimeout(() => {
        ripple.remove();
    }, 850);
}

let memoizedHouseWhite: { x: number, y: number }[] = [];
let memoizedHouseBlue: { x: number, y: number }[] = [];

let memoizedWrenchWhite: { x: number, y: number }[] = [];
let memoizedWrenchBlue: { x: number, y: number }[] = [];

let memoizedWorkerWhite: { x: number, y: number }[] = [];
let memoizedWorkerBlue: { x: number, y: number }[] = [];

let lastMemoizedWhite = 0;
let lastMemoizedBlue = 0;

function getLogoPoints(whiteCount: number, blueCount: number, shape: 'house' | 'wrench' | 'worker') {
    if (lastMemoizedWhite !== whiteCount || lastMemoizedBlue !== blueCount) {
        memoizedHouseWhite = [];
        memoizedHouseBlue = [];
        memoizedWrenchWhite = [];
        memoizedWrenchBlue = [];
        memoizedWorkerWhite = [];
        memoizedWorkerBlue = [];
        lastMemoizedWhite = whiteCount;
        lastMemoizedBlue = blueCount;
    }

    if (shape === 'house' && memoizedHouseWhite.length > 0) {
        return { whitePoints: memoizedHouseWhite, bluePoints: memoizedHouseBlue };
    }
    if (shape === 'wrench' && memoizedWrenchWhite.length > 0) {
        return { whitePoints: memoizedWrenchWhite, bluePoints: memoizedWrenchBlue };
    }
    if (shape === 'worker' && memoizedWorkerWhite.length > 0) {
        return { whitePoints: memoizedWorkerWhite, bluePoints: memoizedWorkerBlue };
    }

    const allBlueGrid: { x: number, y: number }[] = [];

    const cos45 = Math.cos(0.785);
    const sin45 = Math.sin(0.785);

    const R = 45; // Icon bounding radius inside the 55px inner ring radius
    const step = 0.9;

    // 1. Generate blue icon points based on current shape (scaled to fit cleanly inside R <= 45px)
    if (shape === 'house') {
        // Blue House Icon (matching top-left brand mark, max radius 42px)
        for (let x = -R; x <= R; x += step) {
            for (let y = -R; y <= R; y += step) {
                let isHouse = false;
                // Roof: y between -28 and -6
                if (y >= -28 && y < -6) {
                    const progress = (y - (-28)) / 22;
                    const wHalf = 28 * progress;
                    if (x >= -wHalf && x <= wHalf) isHouse = true;
                }
                // Chimney on the right slope: x in [12, 20], y in [-24, -6]
                if (x >= 12 && x <= 20 && y >= -24 && y <= -6) {
                    isHouse = true;
                }
                // House Body: y between -6 and 28
                if (y >= -6 && y <= 28) {
                    if (x >= -26 && x <= 26) {
                        // Exclude door cutout: x in [-8, 8], y in [8, 28]
                        if (!(x >= -8 && x <= 8 && y >= 8 && y <= 28)) {
                            isHouse = true;
                        }
                    }
                }
                if (isHouse) {
                    allBlueGrid.push({ x, y });
                }
            }
        }
    } else if (shape === 'wrench') {
        // Blue Wrench Icon inside the ring (tilted 45 degrees, max radius 44px)
        for (let x = -R; x <= R; x += step) {
            for (let y = -R; y <= R; y += step) {
                if (x * x + y * y <= R * R) {
                    const rx = x * cos45 - y * sin45;
                    const ry = x * sin45 + y * cos45;
                    let isWrench = false;

                    // Handle shaft
                    if (ry >= -14 && ry <= 18 && Math.abs(rx) <= 6) {
                        isWrench = true;
                    }
                    // Bottom box-end ring
                    const dBottom2 = rx * rx + (ry - 26) * (ry - 26);
                    if (dBottom2 <= 12 * 12 && dBottom2 >= 5 * 5) {
                        isWrench = true;
                    }
                    // Top C-jaw head
                    const dHead2 = rx * rx + (ry + 26) * (ry + 26);
                    if (dHead2 <= 16 * 16) {
                        const jx = rx * Math.cos(0.52) - (ry + 26) * Math.sin(0.52);
                        const jy = rx * Math.sin(0.52) + (ry + 26) * Math.cos(0.52);
                        if (!(jx >= -5 && jx <= 5 && jy <= 5)) {
                            isWrench = true;
                        }
                    }
                    if (isWrench) {
                        allBlueGrid.push({ x, y });
                    }
                }
            }
        }
    } else if (shape === 'worker') {
        // Blue Cartoon Engineer Icon inside the ring (max radius 44px)
        for (let x = -R; x <= R; x += step) {
            for (let y = -R; y <= R; y += step) {
                if (x * x + y * y <= R * R) {
                    let isWorker = false;
                    
                    // Helmet dome
                    const dHat2 = x * x + (y + 12) * (y + 12);
                    if (dHat2 <= 18 * 18 && y <= -12) {
                        isWorker = true;
                    }
                    // Helmet brim
                    if (x >= -22 && x <= 22 && y >= -12 && y <= -8) {
                        isWorker = true;
                    }
                    // Face
                    const dFace2 = x * x + (y + 1) * (y + 1);
                    if (dFace2 <= 13 * 13 && y >= -8 && y <= 9) {
                        isWorker = true;
                    }
                    // Torso shoulders
                    if (y >= 9 && y <= 28) {
                        const wHalf = 13 + (y - 9) * 0.75;
                        if (x >= -wHalf && x <= wHalf) {
                            isWorker = true;
                        }
                    }
                    // Chest wrench
                    const wx = x - 14;
                    const wy = y - 12;
                    const wrx = wx * cos45 - wy * sin45;
                    const wry = wx * sin45 + wy * cos45;
                    if (wrx >= -3 && wrx <= 3 && wry >= -10 && wry <= 10) isWorker = true;
                    const dWBot2 = wrx * wrx + (wry - 14) * (wry - 14);
                    if (dWBot2 <= 5 * 5 && dWBot2 >= 2 * 2) isWorker = true;
                    const dWHead2 = wrx * wrx + (wry + 14) * (wry + 14);
                    if (dWHead2 <= 8 * 8) {
                        const jx = wrx * Math.cos(0.52) - (wry + 14) * Math.sin(0.52);
                        const jy = wrx * Math.sin(0.52) + (wry + 14) * Math.cos(0.52);
                        if (!(jx >= -3 && jx <= 3 && jy <= 2)) isWorker = true;
                    }

                    if (isWorker) {
                        allBlueGrid.push({ x, y });
                    }
                }
            }
        }
    }

    // 2. Generate exactly whiteCount 360-degree polar white ring points
    // Polar sampling guarantees a 100% complete, unbroken 360° circular white ring with zero gaps or crescent truncation
    const whitePoints: { x: number, y: number }[] = [];
    const safeWhiteCount = Math.max(1, whiteCount);
    for (let i = 0; i < safeWhiteCount; i++) {
        const angle = (i / safeWhiteCount) * Math.PI * 2;
        // Layers between 55px and 68px radius
        const layer = i % 6;
        const r = 55 + (layer / 5) * 13;
        whitePoints.push({
            x: r * Math.cos(angle),
            y: r * Math.sin(angle)
        });
    }

    // 3. Generate exactly blueCount blue icon target points evenly sampled from allBlueGrid
    const bluePoints: { x: number, y: number }[] = [];
    const safeBlueCount = Math.max(1, blueCount);
    if (allBlueGrid.length > 0) {
        for (let i = 0; i < safeBlueCount; i++) {
            const idx = Math.floor((i / safeBlueCount) * allBlueGrid.length);
            bluePoints.push(allBlueGrid[idx]);
        }
    } else {
        for (let i = 0; i < safeBlueCount; i++) {
            bluePoints.push({ x: 0, y: 0 });
        }
    }

    if (shape === 'house') {
        memoizedHouseWhite = whitePoints;
        memoizedHouseBlue = bluePoints;
    } else if (shape === 'wrench') {
        memoizedWrenchWhite = whitePoints;
        memoizedWrenchBlue = bluePoints;
    } else if (shape === 'worker') {
        memoizedWorkerWhite = whitePoints;
        memoizedWorkerBlue = bluePoints;
    }

    return { whitePoints, bluePoints };
}

class Firefly {
    x: number;
    y: number;
    vx: number;
    vy: number;
    targetVx: number;
    targetVy: number;
    radius: number;
    baseOpacity: number;
    opacity: number;
    phase: number;
    pulseSpeed: number;
    pulseAmplitude: number;
    active: boolean;
    orbitDirection: number;
    baseColor: string;
    lastIdle: boolean;
    currentRatio: number;
    displayColor: string;
    color: string;
    state: 'normal' | 'drawn' | 'absorbed' | 'emerging';
    emergeAge: number;
    groupIndex: number;
    particleIndex: number;
    orbitRadiusRatio: number;
    orbitAngle: number;
    orbitSpeed: number;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_width: number, _height: number) {
        // Initialize contained within upper-left logo position
        const brandMark = document.querySelector('.gravity-brand-mark');
        let tx = 40;
        let ty = 32;
        if (brandMark) {
            const rect = brandMark.getBoundingClientRect();
            tx = rect.left + rect.width / 2;
            ty = rect.top + rect.height / 2;
        }
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 15;
        this.x = tx + Math.cos(angle) * dist;
        this.y = ty + Math.sin(angle) * dist;
        
        // Start static (0 velocity)
        this.vx = 0;
        this.vy = 0;
        this.targetVx = 0;
        this.targetVy = 0;
        
        this.radius = 0.3 + Math.random() * 0.35; // Fine-grained streaks for high-fidelity logo
        this.baseOpacity = Math.random() * 0.4 + 0.2;
        this.opacity = this.baseOpacity;
        this.phase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.01 + Math.random() * 0.03;
        this.pulseAmplitude = Math.random() * 0.3 + 0.1;
        this.active = true;
        this.orbitDirection = Math.random() > 0.5 ? 1 : -1; // Some clockwise, some counter
        
        const isWhite = Math.random() < 0.62; // Increased proportion of blue particles to 38%
        this.baseColor = isWhite ? '#FFFFFF' : '#4285F4';
        this.color = this.baseColor;
        this.lastIdle = false;
        this.currentRatio = this.baseColor === '#FFFFFF' ? 1.0 : 0.0;
        this.displayColor = this.baseColor;
        this.state = 'normal';
        this.emergeAge = 0;
        this.groupIndex = Math.floor(Math.random() * 1000);
        this.particleIndex = 0;
        this.orbitRadiusRatio = 0.86 + Math.random() * 0.14; // Narrower ring layout for tight particle distance
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitSpeed = (0.0008 + Math.random() * 0.0018) * this.orbitDirection;
    }

    update(width: number, height: number, mouseX: number, mouseY: number, mouseVx: number, mouseVy: number, isIdle: boolean, _explosions: StarExplosion[], whiteCount: number, blueCount: number, shape: 'house' | 'wrench' | 'worker', nextShape: 'house' | 'wrench' | 'worker' = shape, morphProgress: number = 0) {
        this.phase += this.pulseSpeed;
        let glowBoost = 0;

        // Smoothly interpolate color ratio to avoid sudden color pops, snappier when logo forms
        const targetRatio = (this.color === '#FFFFFF') ? 1.0 : 0.0;
        const colorSpeed = isIdle ? 0.35 : 0.12;
        this.currentRatio += (targetRatio - this.currentRatio) * colorSpeed;
        
        // Calculate blended color string
        const r = Math.round(66 + (255 - 66) * this.currentRatio);
        const g = Math.round(133 + (255 - 133) * this.currentRatio);
        const b = Math.round(244 + (255 - 244) * this.currentRatio);
        this.displayColor = `rgb(${r}, ${g}, ${b})`;

        if (this.state === 'drawn') {
            this.color = this.baseColor; // Keep their natural color during drift
            
            const brandMark = document.querySelector('.gravity-brand-mark');
            let tx = 40;
            let ty = 32;
            if (brandMark) {
                const rect = brandMark.getBoundingClientRect();
                tx = rect.left + rect.width / 2;
                ty = rect.top + rect.height / 2;
            }
            
            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 12) {
                this.state = 'absorbed';
                this.vx = 0;
                this.vy = 0;
                triggerLogoRipple();
                return;
            }
            
            // Strong pull to logo
            const pullStrength = 0.35 + Math.random() * 0.15;
            this.vx += (dx / dist) * pullStrength;
            this.vy += (dy / dist) * pullStrength;
            
            // Apply drag to steer directly
            this.vx *= 0.92;
            this.vy *= 0.92;
            
            this.x += this.vx;
            this.y += this.vy;
            
            // Fade out as they get close to the logo
            this.opacity = Math.min(1.0, dist / 80);

        } else if (this.state === 'absorbed') {
            // Keep completely static and hidden when absorbed
            this.vx = 0;
            this.vy = 0;
            this.opacity = 0;

        } else if (this.state === 'emerging') {
            this.emergeAge++;
            
            // Fade in quickly during burst
            this.opacity = Math.min(this.baseOpacity, this.opacity + 0.035);
            
            if (this.emergeAge < 45) {
                // Scatter phase: Decelerate the initial burst velocity
                this.targetVx = this.vx * 0.95;
                this.targetVy = this.vy * 0.95;
                
                // Slow down
                this.vx += (this.targetVx - this.vx) * 0.1;
                this.vy += (this.targetVy - this.vy) * 0.1;
            } else {
                // Swarm phase: Pull heavily towards the mouse cursor
                if (mouseX !== -1000) {
                    const dx = mouseX - this.x;
                    const dy = mouseY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.1) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        
                        // Pull faster and faster towards cursor
                        this.targetVx = nx * 9.5;
                        this.targetVy = ny * 9.5;
                    }
                } else {
                    this.targetVx = -0.15;
                    this.targetVy = -0.05;
                }
                
                // High acceleration rate for tight swarming response
                this.vx += (this.targetVx - this.vx) * 0.16;
                this.vy += (this.targetVy - this.vy) * 0.16;
            }
            
            this.x += this.vx;
            this.y += this.vy;
            
            // Check if arrived at cursor or if done swarming
            const distToMouse = mouseX !== -1000 ? Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2) : 999;
            if (this.emergeAge >= 45 && (distToMouse < 25 || mouseX === -1000 || this.emergeAge > 150)) {
                this.state = 'normal';
            }

        } else {
            // Normal State
            const wasIdle = this.lastIdle;
            const currentIdle = isIdle && mouseX !== -1000;
            this.lastIdle = currentIdle;

            if (wasIdle && !currentIdle) {
                // Smooth outward dispersion push away from the old logo center when mouse is moved
                const dx = this.x - mouseX;
                const dy = this.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const pushForce = Math.min(4.0, (150 - dist) * 0.06);
                    if (pushForce > 0) {
                        this.vx += (dx / dist) * pushForce;
                        this.vy += (dy / dist) * pushForce;
                    }
                }
            }

            if (currentIdle) {
                const shapeA = getLogoPoints(whiteCount, blueCount, shape);
                const shapeB = getLogoPoints(whiteCount, blueCount, nextShape);
                
                let offsetX = 0;
                let offsetY = 0;
                let targetColor = this.baseColor;

                if (this.baseColor === '#FFFFFF') {
                    const ptA = shapeA.whitePoints[this.particleIndex % shapeA.whitePoints.length] || { x: 0, y: 0 };
                    const ptB = shapeB.whitePoints[this.particleIndex % shapeB.whitePoints.length] || { x: 0, y: 0 };
                    offsetX = ptA.x * (1 - morphProgress) + ptB.x * morphProgress;
                    offsetY = ptA.y * (1 - morphProgress) + ptB.y * morphProgress;
                    targetColor = '#FFFFFF';
                } else {
                    const ptA = shapeA.bluePoints[this.particleIndex % shapeA.bluePoints.length] || { x: 0, y: 0 };
                    const ptB = shapeB.bluePoints[this.particleIndex % shapeB.bluePoints.length] || { x: 0, y: 0 };
                    offsetX = ptA.x * (1 - morphProgress) + ptB.x * morphProgress;
                    offsetY = ptA.y * (1 - morphProgress) + ptB.y * morphProgress;
                    targetColor = '#4285F4';
                }

                // Breathing scale and hover animation for the logo
                const time = Date.now() * 0.002;
                const logoScale = 1.0 + Math.sin(time) * 0.04;
                const hoverY = Math.cos(time * 0.8) * 3;

                const targetX = mouseX + offsetX * logoScale;
                const targetY = mouseY + offsetY * logoScale + hoverY;
                this.color = targetColor;

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.1) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    if (dist > 100) {
                        // Pull toward target position, faster to meet user request
                        const tx = -ny * this.orbitDirection;
                        const ty = nx * this.orbitDirection;
                        this.targetVx = (nx * 9.5) + (tx * 0.4);
                        this.targetVy = (ny * 9.5) + (ty * 0.4);
                    } else {
                        // Settle onto target offset with a tighter spring force for faster swarming
                        this.targetVx = nx * dist * 0.35;
                        this.targetVy = ny * dist * 0.35;
                    }
                }

                glowBoost = 0.55;
            } else {
                // Restore default random brand color when moving
                this.color = this.baseColor;

                // Perfect circular nebula cloud orbiting physics
                this.orbitAngle += this.orbitSpeed;
                
                // Continuous slow floating motion of the entire ring center
                const time = Date.now() * 0.0005;
                const cx = width / 2 + Math.sin(time) * 50; // Gentle float horizontal
                const cy = height / 2 + Math.cos(time * 0.7) * 30; // Gentle float vertical
                
                // R = sqrt(width * height / pi) so the circular nebula area equals the screen area exactly
                const R_nebula = Math.sqrt((width * height) / Math.PI);
                const r = R_nebula * this.orbitRadiusRatio;

                const targetX = cx + r * Math.cos(this.orbitAngle);
                const targetY = cy + r * Math.sin(this.orbitAngle);

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.1) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Settle into their orbit position smoothly
                    const speedFactor = Math.min(2.5, dist * 0.025);
                    this.targetVx = nx * speedFactor;
                    this.targetVy = ny * speedFactor;
                } else {
                    this.targetVx = 0;
                    this.targetVy = 0;
                }

                // Add small wave fluctuation for natural ambient feeling
                this.targetVx += Math.sin(this.phase) * 0.15;
                this.targetVy += Math.cos(this.phase * 0.7) * 0.15;

                // Repel effect from pointer trajectory
                const mDx = this.x - mouseX;
                const mDy = this.y - mouseY;
                const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
                const repelRadius = 200;
                
                if (mDist < repelRadius && mouseX !== -1000) {
                    const force = (repelRadius - mDist) / repelRadius;
                    // Gentle push
                    this.targetVx += (mDx / (mDist || 1)) * force * 1.5;
                    this.targetVy += (mDy / (mDist || 1)) * force * 1.5;
                    // Follow mouse speed
                    this.targetVx += mouseVx * force * 0.15;
                    this.targetVy += mouseVy * force * 0.15;
                    
                    glowBoost = force * 0.35;
                }
            }

            // Smoothly accelerate towards target velocity (faster swarming when gathering logo)
            const accelRate = currentIdle ? 0.22 : 0.05;
            this.vx += (this.targetVx - this.vx) * accelRate;
            this.vy += (this.targetVy - this.vy) * accelRate;
            
            // Apply friction to limit max speed
            this.vx *= 0.95;
            this.vy *= 0.95;

            // Bounce off walls smoothly
            if (this.x < 0 || this.x > width) this.targetVx *= -1;
            if (this.y < 0 || this.y > height) this.targetVy *= -1;
            
            this.x = Math.max(0, Math.min(width, this.x));
            this.y = Math.max(0, Math.min(height, this.y));

            this.x += this.vx;
            this.y += this.vy;

            // Calculate final opacity
            this.opacity = Math.max(0, this.baseOpacity + Math.sin(this.phase) * this.pulseAmplitude + glowBoost);
        }
    }

    triggerDrawToLogo(clickX: number, clickY: number) {
        this.state = 'drawn';
        this.opacity = 1.0;
        
        // Disperse away from click position
        const dx = this.x - clickX;
        const dy = this.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const pushForce = Math.min(6.0, (250 - dist) * 0.08);
            if (pushForce > 0) {
                this.vx += (dx / dist) * pushForce;
                this.vy += (dy / dist) * pushForce;
            }
        }
    }

    triggerEmerge() {
        this.state = 'emerging';
        this.emergeAge = 0;
        
        // Get top-left logo position
        const brandMark = document.querySelector('.gravity-brand-mark');
        let tx = 40;
        let ty = 32;
        if (brandMark) {
            const rect = brandMark.getBoundingClientRect();
            tx = rect.left + rect.width / 2;
            ty = rect.top + rect.height / 2;
        }
        
        // Disperse emerge position slightly around the logo
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 25; // 5px to 30px offset
        this.x = tx + Math.cos(angle) * dist;
        this.y = ty + Math.sin(angle) * dist;
        
        // Radiate outward with higher velocity (more dispersed initial drift)
        const speed = 4.0 + Math.random() * 6.0; // Strong burst speed matching explosion
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.targetVx = this.vx;
        this.targetVy = this.vy;
        
        this.opacity = 0; // Fade in slowly
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.state === 'absorbed') return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Boost opacity dynamically based on current white ratio
        const alphaMultiplier = 0.90 + this.currentRatio * 0.10; // High contrast
        const glowAlphaMultiplier = 0.55 + this.currentRatio * 0.20; // Crisp glow
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const length = Math.max(this.radius * 2.0, Math.min(22, speed * 2.8));
        const angle = speed > 0.05 ? Math.atan2(this.vy, this.vx) : 0;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Crisp central dot for background nebula particles
        ctx.fillStyle = this.displayColor;
        ctx.globalAlpha = Math.min(1.0, Math.max(0, this.opacity * alphaMultiplier));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.2, this.radius * 1.5), 0, Math.PI * 2);
        ctx.fill();

        // Base solid capsule core matching the image dash/streak style
        ctx.strokeStyle = this.displayColor;
        ctx.lineWidth = Math.max(1.8, this.radius * 2.2);
        ctx.lineCap = 'round';
        ctx.globalAlpha = Math.min(1.0, Math.max(0, this.opacity * alphaMultiplier));
        
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        
        // Soft glow capsule
        ctx.lineWidth = this.radius * 5.0;
        ctx.globalAlpha = Math.max(0, this.opacity * glowAlphaMultiplier);
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        
        ctx.restore();
    }
}

class StarParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
    active: boolean;
    life: number;
    maxLife: number;
    color: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        
        // Burst speed matching return speed of fireflies to logo
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 4.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Dust particles, matching firefly size for consistency
        this.radius = 0.3 + Math.random() * 0.35;
        this.opacity = 1.0;
        this.active = true;
        this.life = 0;
        // Longer life to ensure they can travel to the top-left logo
        this.maxLife = 150 + Math.random() * 100; // 2.5 to 4.1 seconds
        
        const colors = ['#4285F4', '#FFFFFF'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.life++;
        
        if (this.life < 30) {
            // Phase 1: Normal explosive burst
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.96;
            this.vy *= 0.96;
            this.opacity = 1.0;
        } else {
            // Phase 2: Attracted to top-left logo
            const brandMark = document.querySelector('.gravity-brand-mark');
            let tx = 40;
            let ty = 32;
            if (brandMark) {
                const rect = brandMark.getBoundingClientRect();
                tx = rect.left + rect.width / 2;
                ty = rect.top + rect.height / 2;
            }
            
            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 12) {
                this.active = false;
                triggerLogoRipple();
                (window as any)._absorbedBurstCount = ((window as any)._absorbedBurstCount || 0) + 1;
                return;
            }
            
            // Match Firefly top-left logo pull speed
            const pullStrength = 0.35 + Math.random() * 0.15;
            this.vx += (dx / dist) * pullStrength;
            this.vy += (dy / dist) * pullStrength;
            
            // Match Firefly top-left logo drag
            this.vx *= 0.92;
            this.vy *= 0.92;
            
            this.x += this.vx;
            this.y += this.vy;
            
            // Fade out as they get close to the logo
            this.opacity = Math.min(1.0, dist / 80);
        }
        
        if (this.life >= this.maxLife) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const length = Math.max(this.radius * 2.0, Math.min(22, speed * 2.8)); // Perfect circle when slow/static
        const angle = speed > 0.05 ? Math.atan2(this.vy, this.vx) : 0;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Base solid capsule core matching the image dash/streak style
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 2.0;
        ctx.lineCap = 'round';
        ctx.globalAlpha = Math.min(1.0, Math.max(0, this.opacity * 0.75));
        
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        
        // Glow (soft line with larger width)
        ctx.lineWidth = this.radius * 6.0;
        ctx.globalAlpha = Math.max(0, this.opacity * 0.4);
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        
        ctx.restore();
    }
}

class StarExplosion {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    opacity: number;
    phase: 'forming' | 'bursting';
    age: number;
    formationTime: number; // Frames it takes to form the core
    particles: StarParticle[];
    active: boolean;

    constructor(x: number, y: number, immediateBurst = false) {
        this.x = x;
        this.y = y;
        this.maxRadius = 120 + Math.random() * 80; // 120-200px dense core (twice as large)
        this.radius = this.maxRadius;
        this.opacity = immediateBurst ? 1 : 0;
        this.phase = immediateBurst ? 'bursting' : 'forming';
        this.age = 0;
        this.formationTime = 45; // ~0.75 seconds to form
        this.particles = [];
        this.active = true;

        if (immediateBurst) {
            const particleCount = 30 + Math.floor(Math.random() * 20);
            for (let i = 0; i < particleCount; i++) {
                this.particles.push(new StarParticle(this.x, this.y));
            }
        }
    }

    update() {
        if (this.phase === 'forming') {
            this.age++;
            const progress = this.age / this.formationTime;
            
            // Start large, gradually shrink and condense
            this.radius = this.maxRadius * Math.pow(1 - progress, 2); // Shrinks quadratically
            this.opacity = Math.pow(progress, 0.5); // Fades in quickly as it gathers light
            
            if (this.age >= this.formationTime) {
                // Detonate
                this.phase = 'bursting';
                const particleCount = 30 + Math.floor(Math.random() * 20);
                for (let i = 0; i < particleCount; i++) {
                    this.particles.push(new StarParticle(this.x, this.y));
                }
            }
        } else if (this.phase === 'bursting') {
            let anyActive = false;
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.active) anyActive = true;
                else this.particles.splice(i, 1);
            }
            if (!anyActive && this.particles.length === 0) {
                this.active = false;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        if (this.phase === 'forming') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            ctx.globalAlpha = Math.min(1, this.opacity);
            
            // Brilliant golden core
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing blue-white corona
            const pulse = 1 + Math.sin(this.age * 0.5) * 0.1;
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5 * pulse);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.95})`);
            gradient.addColorStop(0.4, `rgba(66, 133, 244, ${this.opacity * 0.8})`); // Blue
            gradient.addColorStop(0.8, `rgba(138, 180, 248, ${this.opacity * 0.4})`); // Soft light blue
            gradient.addColorStop(1, 'rgba(66, 133, 244, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5 * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else if (this.phase === 'bursting') {
            for (const p of this.particles) {
                p.draw(ctx);
            }
        }
    }
}

export const MeteorShower = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let fireflies: Firefly[] = [];
        let explosions: StarExplosion[] = [];
        let bursts: Burst[] = [];

        const particleCount = Math.floor((width * height) / 750); // Halved particle count (50% density)
        for(let i = 0; i < particleCount; i++) {
            fireflies.push(new Firefly(width, height));
        }

        let mouseX = -1000;
        let mouseY = -1000;
        let mouseVx = 0;
        let mouseVy = 0;
        
        let framesSinceLastMove = 0;
        const IDLE_THRESHOLD = 300; // 5 seconds at 60fps

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            const targetCount = Math.floor((width * height) / 750);
            if (fireflies.length < targetCount) {
                for (let i = fireflies.length; i < targetCount; i++) {
                    fireflies.push(new Firefly(width, height));
                }
            }
        };

        let lastClickTime = 0;
        let drawingState: 'normal' | 'drawing' | 'emerging' = 'normal';

        const handlePointerDown = (e: PointerEvent) => {
            framesSinceLastMove = 0; // reset idle
            explosions.push(new StarExplosion(e.clientX, e.clientY));
            
            // Trigger fireflies to disperse and draw to top-left logo
            lastClickTime = Date.now();
            drawingState = 'drawing';
            fireflies.forEach(f => f.triggerDrawToLogo(e.clientX, e.clientY));
        };
        
        let hasEmergedOnHover = false;

        const handleMouseMove = (e: MouseEvent) => {
            if (mouseX !== -1000) {
                mouseVx = (e.clientX - mouseX) * 0.5; // Wind strength multiplier
                mouseVy = (e.clientY - mouseY) * 0.5;
            }
            mouseX = e.clientX;
            mouseY = e.clientY;
            framesSinceLastMove = 0;
            
            // Trigger particles to burst out from upper-left logo on mouse hover
            if (!hasEmergedOnHover) {
                hasEmergedOnHover = true;
                triggerLogoBurstRipple();
                fireflies.forEach(f => {
                    if (f.state === 'absorbed') {
                        f.triggerEmerge();
                    }
                });
            }
            
            // Replenish any fireflies that disappeared during swarm
            const targetCount = Math.floor((width * height) / 750);
            while (fireflies.length < targetCount) {
                const extra = new Firefly(width, height);
                extra.triggerEmerge();
                fireflies.push(extra);
            }
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
            mouseVx = 0;
            mouseVy = 0;
        };

        let currentShape: 'house' | 'wrench' | 'worker' = 'house';
        let nextShape: 'house' | 'wrench' | 'worker' = 'wrench';
        let shapeTimer = 0;
        let morphProgress = 0;
        const HOLD_FRAMES = 150; // Hold shape for ~2.5s
        const MORPH_FRAMES = 60;  // Smoothly morph transition over ~1.0s

        window.addEventListener('resize', handleResize);
        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        const loop = () => {
            ctx.clearRect(0, 0, width, height);
            
            framesSinceLastMove++;
            const isIdle = framesSinceLastMove > IDLE_THRESHOLD;
            const currentIdle = isIdle && mouseX !== -1000;
            
            if (currentIdle) {
                shapeTimer++;
                if (shapeTimer < HOLD_FRAMES) {
                    morphProgress = 0;
                } else if (shapeTimer < HOLD_FRAMES + MORPH_FRAMES) {
                    const rawProgress = (shapeTimer - HOLD_FRAMES) / MORPH_FRAMES;
                    // Smooth cubic easing (smoothstep)
                    morphProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
                } else {
                    shapeTimer = 0;
                    morphProgress = 0;
                    currentShape = nextShape;
                    if (currentShape === 'house') nextShape = 'wrench';
                    else if (currentShape === 'wrench') nextShape = 'worker';
                    else nextShape = 'house';
                }
            } else {
                currentShape = 'house';
                nextShape = 'wrench';
                shapeTimer = 0;
                morphProgress = 0;
            }
            
            mouseVx *= 0.85;
            mouseVy *= 0.85;

            // Handle firefly draw and emerge states
            const now = Date.now();
            if (drawingState === 'drawing') {
                if (now - lastClickTime >= 10000) {
                    drawingState = 'emerging';
                    
                    // Trigger the logo itself to do a shockwave burst visual effect
                    triggerLogoBurstRipple();
                    
                    // Trigger regular absorbed fireflies to emerge
                    fireflies.forEach(f => {
                        if (f.state === 'absorbed') {
                            f.triggerEmerge();
                        }
                    });

                    // Spawn extra fireflies matching the absorbed burst count
                    const extraCount = (window as any)._absorbedBurstCount || 0;
                    const maxAllowed = Math.floor((width * height) / 750) * 2; // Safeguard limit
                    
                    if (fireflies.length < maxAllowed) {
                        const spawnLimit = Math.min(extraCount, maxAllowed - fireflies.length);
                        for (let i = 0; i < spawnLimit; i++) {
                            const extra = new Firefly(width, height);
                            extra.triggerEmerge();
                            fireflies.push(extra);
                        }
                    }
                    
                    // Reset counter
                    (window as any)._absorbedBurstCount = 0;
                }
            } else if (drawingState === 'emerging') {
                const allNormal = fireflies.every(f => f.state === 'normal' || f.state === 'absorbed');
                if (allNormal) {
                    drawingState = 'normal';
                }
            }

            // Update and draw bursts
            for (let i = bursts.length - 1; i >= 0; i--) {
                const b = bursts[i];
                b.update();
                if (b.active) {
                    b.draw(ctx);
                } else {
                    bursts.splice(i, 1);
                }
            }

            // Index white and blue particles sequentially for 1:1 gapless target mapping
            let whiteCount = 0;
            let blueCount = 0;
            for (let i = 0; i < fireflies.length; i++) {
                if (fireflies[i].baseColor === '#FFFFFF') whiteCount++;
                else blueCount++;
            }
            let wIdx = 0;
            let bIdx = 0;
            for (let i = 0; i < fireflies.length; i++) {
                if (fireflies[i].baseColor === '#FFFFFF') {
                    fireflies[i].particleIndex = wIdx++;
                } else {
                    fireflies[i].particleIndex = bIdx++;
                }
            }

            // Update and draw fireflies
            for (let i = fireflies.length - 1; i >= 0; i--) {
                const f = fireflies[i];
                f.update(width, height, mouseX, mouseY, mouseVx, mouseVy, isIdle, explosions, whiteCount, blueCount, currentShape, nextShape, morphProgress);
                if (f.active) {
                    f.draw(ctx);
                } else {
                    fireflies.splice(i, 1);
                }
            }

            // Update and draw explosions
            for (let i = explosions.length - 1; i >= 0; i--) {
                const ex = explosions[i];
                ex.update();
                if (ex.active) {
                    ex.draw(ctx);
                } else {
                    explosions.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="gravity-meteor-canvas"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
};

export default MeteorShower;
