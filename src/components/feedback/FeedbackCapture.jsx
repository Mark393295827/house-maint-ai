import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';
import { feedbackTracker } from '../../utils/feedbackTracker';

const FeedbackCapture = ({ diagnosisId, onFeedbackSubmit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(null); // 'positive' | 'negative'
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleRating = (value) => {
        setRating(value);
        setIsOpen(true);

        // Track the explicit rating event immediately
        feedbackTracker.trackEvent('rating_explicit', {
            diagnosisId,
            rating: value,
            timestamp: new Date().toISOString()
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await feedbackTracker.trackEvent('rating_comment', {
                diagnosisId,
                rating,
                comment,
                timestamp: new Date().toISOString()
            });

            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                if (onFeedbackSubmit) onFeedbackSubmit();
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center animate-fade-in">
                <p className="text-green-400 text-sm font-medium">感谢您的反馈！</p>
            </div>
        );
    }

    return (
        <div className="mt-6 border-t border-white/5 pt-4">
            {!isOpen ? (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">诊断结果准确吗？</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleRating('positive')}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-green-400"
                            aria-label="Helpful"
                        >
                            <ThumbsUp size={18} />
                        </button>
                        <button
                            onClick={() => handleRating('negative')}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-red-400"
                            aria-label="Not helpful"
                        >
                            <ThumbsDown size={18} />
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${rating === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                            {rating === 'positive' ? '太棒了！' : '很抱歉。'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="请告诉我们就如何改进..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 min-h-[80px]"
                    />

                    <button
                        type="submit"
                        disabled={isSubmitting || !comment.trim()}
                        className="mt-2 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '提交中...' : <><Send size={14} /> 提交反馈</>}
                    </button>
                </form>
            )}
        </div>
    );
};

export default FeedbackCapture;
