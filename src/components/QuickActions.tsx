
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const QuickActions = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const actions = [
        { icon: 'photo_camera', label: t('quickActions.scan'), path: '/diagnosis', isPrimary: true },
        { icon: 'upload_file', label: t('quickActions.import'), path: '/diagnosis', isPrimary: false },
        { icon: 'calendar_month', label: t('quickActions.plan'), path: '/calendar', isPrimary: false },
        { icon: 'inventory_2', label: t('quickActions.tools'), path: '/profile', isPrimary: false },
    ];

    return (
        <section className="px-5">
            <h3 className="text-lg font-bold mb-3 px-1">{t('quickActions.title')}</h3>
            <div className="grid grid-cols-4 gap-3">
                {actions.map((action, i) => (
                    <button
                        key={i}
                        className="flex flex-col items-center gap-2 group stagger-item press-scale"
                        onClick={() => navigate(action.path)}
                    >
                        <div className={`size-14 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95 ${action.isPrimary
                                ? 'bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm'
                            }`}>
                            <span className={`material-symbols-outlined text-[28px] ${action.isPrimary ? 'text-white' : 'text-primary'}`}>
                                {action.icon}
                            </span>
                        </div>
                        <span className="text-xs font-medium text-center">{action.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default QuickActions;
