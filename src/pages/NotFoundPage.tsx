import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const NotFoundPage = () => {
    const { t } = useLanguage();

    return (
        <main className="min-h-screen bg-background-light px-6 py-16 text-text-main-light dark:bg-background-dark dark:text-text-main-dark">
            <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p>
                <h1 className="mb-3 text-3xl font-black tracking-tight">
                    {t('notFound.title')}
                </h1>
                <p className="mb-8 text-text-sub-light dark:text-text-sub-dark">
                    {t('notFound.message')}
                </p>
                <Link
                    to="/"
                    className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg transition-transform active:scale-95"
                >
                    {t('notFound.backHome')}
                </Link>
            </div>
        </main>
    );
};

export default NotFoundPage;
