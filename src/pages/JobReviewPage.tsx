import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, submitReview } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

const STARS = [1, 2, 3, 4, 5] as const;

const JobReviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Review form state
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [diagnosisCorrect, setDiagnosisCorrect] = useState<boolean | null>(null);
    const [firstTimeFix, setFirstTimeFix] = useState<boolean | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await getReport(id);
                setReport(data.report);
            } catch {
                setError('Failed to load job details');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleSubmit = async () => {
        if (!id || rating === 0) return;
        setSubmitting(true);
        setError(null);
        try {
            await submitReview({
                booking_id: Number(id),
                rating,
                comment: comment.trim() || undefined,
            });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || '提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    if (!report) return <div className="p-4 text-center">工单不存在</div>;

    if (submitted) {
        return (
            <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-2">感谢您的评价!</h2>
                    <p className="text-text-sub-light dark:text-text-sub-dark mb-8">
                        您的反馈帮助我们持续改进服务质量
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20"
                    >
                        返回首页
                    </button>
                </main>
                <BottomNav />
            </div>
        );
    }

    const activeRating = hoverRating || rating;

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6 bg-white dark:bg-surface-dark shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-main-light dark:text-text-main-dark">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-text-main-light dark:text-text-main-dark">
                    验收评价
                </h1>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 p-4 space-y-4">
                {/* Job Summary */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        <span className="text-sm font-bold text-green-600">已完工</span>
                    </div>
                    <h2 className="text-lg font-bold mb-1">{report.title}</h2>
                    <p className="text-sm text-text-sub-light dark:text-text-sub-dark">{report.description}</p>
                </div>

                {/* Star Rating */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                    <h3 className="font-bold mb-4 text-lg">服务满意度</h3>
                    <div className="flex justify-center gap-2 mb-3">
                        {STARS.map(star => (
                            <button
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                className="text-4xl transition-transform hover:scale-110 active:scale-95"
                            >
                                {star <= activeRating ? '⭐' : '☆'}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500">
                        {activeRating === 0 && '请点击星星评分'}
                        {activeRating === 1 && '非常不满意'}
                        {activeRating === 2 && '不满意'}
                        {activeRating === 3 && '一般'}
                        {activeRating === 4 && '满意'}
                        {activeRating === 5 && '非常满意'}
                    </p>
                </div>

                {/* Quality Flags */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                    <h3 className="font-bold">质量指标</h3>

                    <div className="flex items-center justify-between">
                        <span className="text-sm">AI 诊断是否准确?</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDiagnosisCorrect(true)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${diagnosisCorrect === true ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-gray-100 text-gray-500'}`}
                            >
                                ✓ 准确
                            </button>
                            <button
                                onClick={() => setDiagnosisCorrect(false)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${diagnosisCorrect === false ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : 'bg-gray-100 text-gray-500'}`}
                            >
                                ✗ 不准确
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm">是否一次修好?</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFirstTimeFix(true)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${firstTimeFix === true ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-gray-100 text-gray-500'}`}
                            >
                                ✓ 是
                            </button>
                            <button
                                onClick={() => setFirstTimeFix(false)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${firstTimeFix === false ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : 'bg-gray-100 text-gray-500'}`}
                            >
                                ✗ 否
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comment */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold mb-2">补充说明 <span className="text-gray-400 text-xs font-normal">(选填)</span></h3>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="您对本次维修服务有什么建议或补充?"
                        className="w-full h-24 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none"
                        maxLength={500}
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                    {submitting ? <LoadingSpinner /> : (
                        <>
                            <span className="material-symbols-outlined">send</span>
                            提交评价
                        </>
                    )}
                </button>
            </main>
            <BottomNav />
        </div>
    );
};

export default JobReviewPage;
