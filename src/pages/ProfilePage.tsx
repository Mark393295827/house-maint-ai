import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import api from '../services/api';
import type { Report } from '../types';
import JobCompletionModal from '../components/reports/JobCompletionModal';

// Sub-components
import ProfileCard from '../components/profile/ProfileCard';
import RecentReportsList from '../components/profile/RecentReportsList';
import SettingsSection from '../components/profile/SettingsSection';
import SupportSection from '../components/profile/SupportSection';

const ProfilePage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user, logout, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);

    // Initialize dark mode from localStorage or system preference using lazy initialization
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    // Sync dark mode class with state
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Fetch user's reports
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await api.getReports(null, 5);
                setReports(data.reports || []);
            } catch (err) {
                console.warn('Failed to fetch reports:', err);
            } finally {
                setLoadingReports(false);
            }
        };
        if (user) {
            fetchReports();
        }
    }, [user]);

    // Toggle dark mode function
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        setDarkMode(newMode);
    };

    // Handle edit profile
    const handleEditProfile = () => {
        setEditName(user?.name || '');
        setIsEditing(true);
    };

    // Handle save profile
    const handleSaveProfile = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            await updateUser({ name: editName.trim() });
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Job completion logic
    const [completingReportId, setCompletingReportId] = useState<number | null>(null);

    const handleCompleteJob = (reportId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setCompletingReportId(reportId);
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden transition-colors duration-300 page-enter">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6">
                <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">{t('profile.title')}</h1>
                <button className="p-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </div>

            <ProfileCard
                user={user}
                isEditing={isEditing}
                editName={editName}
                isSaving={isSaving}
                onEditNameChange={setEditName}
                onSave={handleSaveProfile}
                onEditToggle={handleEditProfile}
            />

            <RecentReportsList
                user={user}
                reports={reports}
                loading={loadingReports}
                onCompleteJob={handleCompleteJob}
            />

            <SettingsSection
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
            />

            <SupportSection />

            <div className="mt-8 mb-4 text-center">
                <button
                    onClick={handleLogout}
                    className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/10 px-6 py-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors w-[90%]"
                >
                    {t('profile.logout')}
                </button>
            </div>

            <BottomNav />

            {/* Job Completion Modal */}
            {completingReportId && (
                <JobCompletionModal
                    reportId={completingReportId}
                    onClose={() => setCompletingReportId(null)}
                    onComplete={() => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default ProfilePage;
