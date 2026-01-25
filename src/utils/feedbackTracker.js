import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class FeedbackTracker {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.diagnosisStartTime = null;
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('house_maint_session_id');
        if (!sessionId) {
            sessionId = uuidv4();
            localStorage.setItem('house_maint_session_id', sessionId);
        }
        return sessionId;
    }

    async trackEvent(eventType, data = {}) {
        try {
            const payload = {
                session_id: this.sessionId,
                event_type: eventType,
                data
            };

            // Non-blocking beacon or fetch
            if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`${API_URL}/feedback`, blob);
            } else {
                fetch(`${API_URL}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).catch(err => console.warn('Feedback tracking failed', err));
            }
        } catch (e) {
            console.warn('Error constructing feedback payload', e);
        }
    }

    startDiagnosisSession(diagnosisId) {
        this.diagnosisStartTime = Date.now();
        this.trackEvent('view', { diagnosisId, timestamp: new Date().toISOString() });
    }

    endDiagnosisSession(diagnosisId, outcome = 'abandoned') {
        if (!this.diagnosisStartTime) return;

        const duration = Date.now() - this.diagnosisStartTime;
        this.trackEvent('session_end', {
            diagnosisId,
            outcome,
            duration_ms: duration,
            timestamp: new Date().toISOString()
        });
        this.diagnosisStartTime = null;
    }
}

export const feedbackTracker = new FeedbackTracker();
