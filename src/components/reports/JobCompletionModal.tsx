
import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../services/api';

interface JobCompletionModalProps {
    reportId: number;
    onClose: () => void;
    onComplete: () => void;
}

const JobCompletionModal: React.FC<JobCompletionModalProps> = ({ reportId, onClose, onComplete }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState({
        steps: '',
        parts: '',
        cost: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.completeReport(reportId, details);
            onComplete();
            onClose();
        } catch (err) {
            alert('Failed to complete job');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4 text-text-main-light dark:text-text-main-dark">
                    Complete Job
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Resolution Steps
                        </label>
                        <textarea
                            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            rows={3}
                            placeholder="What did you fix?"
                            value={details.steps}
                            onChange={e => setDetails({ ...details, steps: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Parts Used
                        </label>
                        <input
                            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="e.g. New Seal x1"
                            value={details.parts}
                            onChange={e => setDetails({ ...details, parts: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Final Cost ($)
                        </label>
                        <input
                            type="number"
                            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="0.00"
                            value={details.cost}
                            onChange={e => setDetails({ ...details, cost: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl font-bold bg-green-500 text-white"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Complete Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobCompletionModal;
