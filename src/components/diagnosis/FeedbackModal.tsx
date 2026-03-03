import React, { useState } from 'react';
import Analytics from '../../services/analytics';

interface FeedbackModalProps {
    caseId: string;
    locale: string;
    onClose: () => void;
}

const STARS = [1, 2, 3, 4, 5];

const TAGS_ZH = ['准确', '快速', '专业', '价格合理', '沟通好', '需改进'];
const TAGS_EN = ['Accurate', 'Fast', 'Professional', 'Fair Price', 'Good Comms', 'Needs Work'];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ caseId, locale, onClose }) => {
    const isZh = locale === 'zh';
    const tags = isZh ? TAGS_ZH : TAGS_EN;

    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [demandAccuracy, setDemandAccuracy] = useState<number | null>(null);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSubmit = () => {
        const feedback = {
            caseId,
            rating,
            demandAccuracy,
            tags: selectedTags,
            comment: comment.trim() || undefined,
        };

        // Track in Mixpanel
        Analytics.track('feedback_submitted', feedback);

        // Save to localStorage for dashboard
        const existing = JSON.parse(localStorage.getItem('inquiry_feedback') || '[]');
        existing.push({ ...feedback, timestamp: new Date().toISOString() });
        localStorage.setItem('inquiry_feedback', JSON.stringify(existing));

        setSubmitted(true);
        setTimeout(onClose, 1500);
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-[#1a1d2e] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-400 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <h2 className="text-white font-bold text-lg mb-1">{isZh ? '感谢反馈！' : 'Thanks for your feedback!'}</h2>
                    <p className="text-white/50 text-sm">{isZh ? '您的意见将帮助我们持续改进' : 'Your input helps us improve'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-[#1a1d2e] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full animate-fade-in-up max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-bold text-lg">{isZh ? '服务评价' : 'Service Feedback'}</h2>
                    <button onClick={onClose} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20">
                        <span className="material-symbols-outlined text-white/60 text-lg">close</span>
                    </button>
                </div>

                {/* Star Rating */}
                <div className="mb-5">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{isZh ? '整体满意度' : 'Overall Satisfaction'}</p>
                    <div className="flex gap-2 justify-center">
                        {STARS.map(s => (
                            <button key={s} onClick={() => setRating(s)}
                                className={`text-4xl transition-all active:scale-110 ${s <= rating ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-white/15'}`}>
                                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: `'FILL' ${s <= rating ? 1 : 0}` }}>star</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Demand Accuracy */}
                <div className="mb-5">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{isZh ? '需求清单准确度' : 'Demand List Accuracy'}</p>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setDemandAccuracy(n)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${n === demandAccuracy ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-1 px-1">
                        <span className="text-[10px] text-white/20">{isZh ? '不准确' : 'Inaccurate'}</span>
                        <span className="text-[10px] text-white/20">{isZh ? '非常准确' : 'Very Accurate'}</span>
                    </div>
                </div>

                {/* Tags */}
                <div className="mb-5">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{isZh ? '标签 (可多选)' : 'Tags (select all that apply)'}</p>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTags.includes(tag) ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Comment */}
                <div className="mb-6">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{isZh ? '补充说明 (可选)' : 'Additional Comments (optional)'}</p>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                        placeholder={isZh ? '有什么建议或改进意见...' : 'Any suggestions or improvements...'}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-violet-500/40 resize-none" />
                </div>

                {/* Submit */}
                <button onClick={handleSubmit} disabled={rating === 0}
                    className="w-full bg-violet-600 disabled:bg-white/10 hover:bg-violet-700 text-white disabled:text-white/30 font-bold text-base rounded-2xl py-3.5 transition-all active:scale-[0.98] shadow-lg shadow-violet-600/20 disabled:shadow-none">
                    {isZh ? '提交评价' : 'Submit Feedback'}
                </button>
            </div>
        </div>
    );
};

export default FeedbackModal;
