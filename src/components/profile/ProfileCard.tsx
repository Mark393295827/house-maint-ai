import React from 'react';
import { IMAGES } from '../../constants/images';
import { useLanguage } from '../../i18n/LanguageContext';
import { User } from '../../types';

interface ProfileCardProps {
    user: User | null;
    isEditing: boolean;
    editName: string;
    isSaving: boolean;
    onEditNameChange: (name: string) => void;
    onSave: () => void;
    onEditToggle: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
    user,
    isEditing,
    editName,
    isSaving,
    onEditNameChange,
    onSave,
    onEditToggle
}) => {
    const { t } = useLanguage();

    return (
        <div className="px-4 mb-6">
            <div className="flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="relative size-16">
                    <div
                        className="bg-center bg-no-repeat bg-cover w-full h-full rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                        style={{ backgroundImage: `url("${user?.avatar || IMAGES.USER_AVATAR}")` }}
                    />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-2 border-white dark:border-surface-dark rounded-full"></div>
                </div>
                <div className="flex-1">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => onEditNameChange(e.target.value)}
                                className="flex-1 px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder={t('profile.namePlaceholder')}
                            />
                            <button
                                onClick={onSave}
                                disabled={isSaving}
                                className="px-3 py-1 bg-primary text-white rounded-lg text-sm font-bold"
                            >
                                {isSaving ? '...' : t('profile.save')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                                {user?.name || t('profile.defaultUser')}
                            </h2>
                            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                                {user?.phone || t('profile.notLoggedIn')}
                            </p>
                            {/* Role Badge */}
                            {user?.role === 'worker' && (
                                <span className="inline-block px-2 py-0.5 mt-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                                    Worker
                                </span>
                            )}
                        </>
                    )}
                </div>
                {!isEditing && (
                    <button onClick={onEditToggle} className="text-primary font-semibold text-sm">
                        {t('profile.edit')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProfileCard;
