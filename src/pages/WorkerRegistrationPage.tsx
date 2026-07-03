import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { registerWorker } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SKILL_OPTIONS = [
    'plumbing', 'electrical', 'hvac', 'painting', 'carpentry',
    'roofing', 'flooring', 'appliance', 'landscaping', 'general',
];

const SKILL_LABELS: Record<string, string> = {
    plumbing: '水工/管道', electrical: '电工/电路', hvac: '空调/暖通',
    painting: '墙面/油漆', carpentry: '木工/家具', roofing: '屋顶维修',
    flooring: '地板铺设', appliance: '家电维修', landscaping: '绿化/园艺',
    general: '通用维修',
};

const WorkerRegistrationPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        skills: [] as string[],
        hourlyRate: '',
        serviceArea: '',
        bio: '',
        experience: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const toggleSkill = (skill: string) => {
        setForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill],
        }));
    };

    const [submitError, setSubmitError] = useState('');

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError('');
        try {
            await registerWorker({
                skills: form.skills,
            });
            await refreshUser();
            navigate('/worker/dashboard');
        } catch (err: any) {
            setSubmitError(err.message || '注册失败，请稍后重试');
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                            {t('workerPortal.register.title')}
                        </h1>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {t('workerPortal.register.step')} {step}/3
                        </p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            <main className="flex-1 px-6 py-6">
                {submitError && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {submitError}
                    </div>
                )}
                {/* Step 1: Skills */}
                {step === 1 && (
                    <div className="page-enter">
                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-1">
                            {t('workerPortal.register.skillsTitle')}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-4">
                            {t('workerPortal.register.skillsDesc')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.map((skill) => (
                                <button
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${form.skills.includes(skill)
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-text-main-dark'
                                        }`}
                                >
                                    {SKILL_LABELS[skill] || skill.charAt(0).toUpperCase() + skill.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Rate & Area */}
                {step === 2 && (
                    <div className="page-enter flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1 block">
                                {t('workerPortal.register.rate')}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub-light dark:text-text-sub-dark">¥</span>
                                <input
                                    type="number"
                                    value={form.hourlyRate}
                                    onChange={e => setForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                                    placeholder="50"
                                    className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-8 py-3 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-sub-light dark:text-text-sub-dark">/小时</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1 block">
                                {t('workerPortal.register.area')}
                            </label>
                            <input
                                type="text"
                                value={form.serviceArea}
                                onChange={e => setForm(prev => ({ ...prev, serviceArea: e.target.value }))}
                                placeholder={t('workerPortal.register.areaPlaceholder')}
                                className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-text-main-light dark:text-text-main-dark mb-1 block">
                                {t('workerPortal.register.experience')}
                            </label>
                            <input
                                type="text"
                                value={form.experience}
                                onChange={e => setForm(prev => ({ ...prev, experience: e.target.value }))}
                                placeholder={t('workerPortal.register.experiencePlaceholder')}
                                className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Bio */}
                {step === 3 && (
                    <div className="page-enter">
                        <h2 className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-1">
                            {t('workerPortal.register.bioTitle')}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-4">
                            {t('workerPortal.register.bioDesc')}
                        </p>
                        <textarea
                            value={form.bio}
                            onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder={t('workerPortal.register.bioPlaceholder')}
                            rows={5}
                            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                    </div>
                )}
            </main>

            {/* Footer Button */}
            <div className="sticky bottom-0 px-6 py-4 bg-background-light dark:bg-background-dark border-t border-gray-100 dark:border-gray-800">
                {step < 3 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={step === 1 && form.skills.length === 0}
                        className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform disabled:opacity-40"
                    >
                        {t('workerPortal.register.next')}
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            t('workerPortal.register.submit')
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WorkerRegistrationPage;
