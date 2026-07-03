import React, { useState } from 'react';
import Analytics from '../../services/analytics';
import OperatingLoopProgress from './OperatingLoopProgress';

interface FeedbackModalProps {
    caseId: string;
    locale: string;
    onClose: () => void;
}

const STARS = [1, 2, 3, 4, 5];

const TAGS_ZH = ['建议准确', '响应迅速', '流程专业', '价格透明', '系统好用', '界面美观'];
const TAGS_EN = ['Accurate', 'Fast', 'Professional', 'Transparent', 'Easy Use', 'Beautiful UI'];

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

        Analytics.track('feedback_submitted', feedback);

        const existing = JSON.parse(localStorage.getItem('inquiry_feedback') || '[]');
        existing.push({ ...feedback, timestamp: new Date().toISOString() });
        localStorage.setItem('inquiry_feedback', JSON.stringify(existing));

        setSubmitted(true);
        setTimeout(onClose, 2000);
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-[200] bg-[#f5f5f7]/80 backdrop-blur-xl flex items-center justify-center p-6 page-enter">
                <div className="bg-white apple-glass rounded-[32px] p-10 max-w-sm w-full text-center shadow-2xl shadow-black/5 ring-1 ring-black/5 border border-white/40">
                    <div className="w-16 h-16 mx-auto mb-6 bg-[#28cd41]/10 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#28cd41] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <h2 className="text-[#1d1d1f] font-black text-2xl tracking-tighter mb-2">{isZh ? '感谢您的反馈' : 'Feedback Received'}</h2>
                    <p className="text-[14px] font-bold text-[#86868b] leading-tight">{isZh ? '您的意见对我们非常重要' : 'Your input fuels our innovation.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center pt-10">
            <div className="bg-[#f5f5f7] apple-glass border border-white/40 rounded-t-[32px] sm:rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar selection:bg-[#0071e3]/10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-[#1d1d1f] font-black text-xl tracking-tight">{isZh ? '诊断体验评价' : 'Experience Rating'}</h2>
                        <p className="text-[11px] font-black text-[#86868b] uppercase tracking-widest mt-0.5">{isZh ? '帮助我们改进算法' : 'Help us tune the engine'}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 bg-white border border-black/5 rounded-full flex items-center justify-center hover:bg-[#f5f5f7] transition-all press-scale">
                        <span className="material-symbols-outlined text-[#1d1d1f] text-[18px]">close</span>
                    </button>
                </div>

                <OperatingLoopProgress locale={locale} activeStageId="verification" compact className="mx-0 mb-6" />

                <div className="mb-8 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm">
                        <div className="mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#28cd41]">fact_check</span>
                            <h3 className="text-[13px] font-black tracking-tight">{isZh ? '验收回访已排队' : 'Repair verification queued'}</h3>
                        </div>
                        <p className="text-[12px] font-bold leading-relaxed text-[#86868b]">
                            {isZh ? '师傅完工后，系统会收集照片并向租客确认是否修好。' : 'After completion, the system collects repair photos and asks the tenant to confirm the fix.'}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm">
                        <div className="mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#0071e3]">analytics</span>
                            <h3 className="text-[13px] font-black tracking-tight">{isZh ? '业主报表已准备' : 'Owner reporting prepared'}</h3>
                        </div>
                        <p className="text-[12px] font-bold leading-relaxed text-[#86868b]">
                            {isZh ? '费用、响应时间、分流状态和师傅质量会进入业主可读报表。' : 'Cost, response time, deflection status, and worker quality will flow into the owner report.'}
                        </p>
                    </div>
                </div>

                {/* Star Rating (Apple Precision) */}
                <div className="mb-8 p-6 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
                    <p className="text-[#86868b] text-[10px] font-black uppercase tracking-widest text-center mb-4">{isZh ? '您的满意度' : 'YOUR SATISFACTION'}</p>
                    <div className="flex gap-2 justify-center">
                        {STARS.map(s => (
                            <button key={s} onClick={() => setRating(s)}
                                className={`transition-all active:scale-125 ${s <= rating ? 'text-[#ff9500]' : 'text-[#d2d2d7] hover:text-[#86868b]'}`}>
                                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: `'FILL' ${s <= rating ? 1 : 0}` }}>star</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Demand Accuracy (Selector) */}
                <div className="mb-8">
                    <p className="text-[#86868b] text-[10px] font-black uppercase tracking-widest mb-3 ml-1">{isZh ? '需求匹配准确度' : 'MATCH ACCURACY'}</p>
                    <div className="bg-white p-1 rounded-2xl ring-1 ring-black/5 shadow-sm flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setDemandAccuracy(n)}
                                className={`flex-1 py-3 rounded-xl text-[13px] font-black transition-all ${n === demandAccuracy ? 'bg-[#1d1d1f] text-white shadow-xl' : 'text-[#86868b] hover:bg-[#f5f5f7]'}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags (Apple Pill Collection) */}
                <div className="mb-8">
                    <p className="text-[#86868b] text-[10px] font-black uppercase tracking-widest mb-3 ml-1">{isZh ? '多选标签' : 'TAGS'}</p>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag)}
                                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${selectedTags.includes(tag) ? 'bg-[#1d1d1f] text-white border-transparent' : 'bg-white text-[#1d1d1f] border-black/5 hover:bg-[#f5f5f7]'}`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Comment (Clean Design) */}
                <div className="mb-8">
                    <p className="text-[#86868b] text-[10px] font-black uppercase tracking-widest mb-3 ml-1">{isZh ? '更多建议' : 'SUGGESTIONS'}</p>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                        placeholder={isZh ? '输入您的意见或反馈...' : 'Tell us what we can do better...'}
                        rows={3}
                        className="w-full bg-white border border-black/5 rounded-2xl px-5 py-4 text-[#1d1d1f] text-[14px] font-medium placeholder-[#86868b]/30 focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 transition-all resize-none shadow-sm" />
                </div>

                {/* Primary Button */}
                <button onClick={handleSubmit} disabled={rating === 0}
                    className="w-full h-14 bg-[#0071e3] disabled:opacity-30 text-white rounded-[20px] text-[14px] font-black uppercase tracking-widest shadow-2xl shadow-[#0071e3]/30 transition-all press-scale flex items-center justify-center gap-2">
                    {isZh ? '提交评价' : 'Publish Feedback'}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default FeedbackModal;
