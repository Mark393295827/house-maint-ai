
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const QuickActions = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <section className="px-5">
            <h3 className="text-lg font-extrabold mb-3 px-1 font-display">{t('quickActions.title')}</h3>
            <div className="flex flex-col gap-3">
                {/* Primary CTA: Camera Scan — full-width gradient card */}
                <button
                    onClick={() => navigate('/diagnosis')}
                    className="relative overflow-hidden w-full rounded-2xl p-5 press-scale stagger-item group"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-extrabold text-lg font-display">{t('quickActions.scan')}</span>
                            <span className="text-white/70 text-sm">AI-powered instant diagnosis</span>
                        </div>
                        <span className="material-symbols-outlined text-white/60 ml-auto text-[24px]">arrow_forward</span>
                    </div>
                </button>

                {/* Secondary actions: glass pill row */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { icon: 'upload_file', label: t('quickActions.import'), path: '/diagnosis', gradient: 'from-violet-500 to-purple-500' },
                        { icon: 'calendar_month', label: t('quickActions.plan'), path: '/calendar', gradient: 'from-cyan-500 to-blue-500' },
                        { icon: 'inventory_2', label: t('quickActions.tools'), path: '/profile', gradient: 'from-amber-500 to-orange-500' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            className="flex flex-col items-center gap-2.5 p-3.5 rounded-2xl glass dark:glass-dark hover:shadow-md hover:shadow-primary/10 transition-all group stagger-item press-scale"
                            onClick={() => navigate(action.path)}
                        >
                            <div className={`size-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                                <span className="material-symbols-outlined text-white text-[22px]">{action.icon}</span>
                            </div>
                            <span className="text-xs font-semibold text-center">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default QuickActions;
