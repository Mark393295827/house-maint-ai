import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * CommunityPage - 社区页面
 * 
 * 展示维修经验分享、问答社区等内容。
 */
const CommunityPage = () => {
    const { isAuthenticated } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [activeTab, setActiveTab] = useState('recommend');

    // Fetch posts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await api.getPosts();
                setPosts(data.posts || []);
            } catch (err) {
                console.warn('Failed to fetch posts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    // Handle create post
    const handleCreatePost = async () => {
        if (!newPost.title.trim() || !newPost.content.trim()) return;

        try {
            const data = await api.createPost({
                title: newPost.title,
                content: newPost.content,
                tags: ['DIY'] // Default tag for now
            });

            // Add new post to list
            setPosts([data.post, ...posts]);

            // Reset form
            setNewPost({ title: '', content: '' });
            setIsCreating(false);
        } catch (err) {
            console.error('Failed to create post:', err);
            alert('发布失败，请重试');
        }
    };

    // Handle like post
    const handleLike = async (id) => {
        if (!isAuthenticated) return;

        try {
            await api.likePost(id);
            setPosts(posts.map(post =>
                post.id === id ? { ...post, likes: post.likes + 1 } : post
            ));
        } catch (err) {
            console.error('Failed to like post:', err);
        }
    };

    // Format relative time
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

        if (diff < 60) return '刚刚';
        if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px]">
            {/* Create Post Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-4 shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-text-main-light dark:text-text-main-dark">发布帖子</h3>
                        <input
                            type="text"
                            placeholder="标题"
                            className="w-full mb-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-surface-dark"
                            value={newPost.title}
                            onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                        />
                        <textarea
                            placeholder="分享你的经验..."
                            className="w-full h-32 mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-surface-dark resize-none"
                            value={newPost.content}
                            onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="flex-1 py-3 text-gray-500 font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreatePost}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold"
                            >
                                发布
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-surface-dark shadow-sm">
                <div className="flex items-center justify-between p-4 pt-6">
                    <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">
                        社区
                    </h1>
                    {isAuthenticated && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 text-action-primary hover:bg-action-primary/10 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined">edit_square</span>
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setActiveTab('recommend')}
                        className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'recommend' ? 'text-action-primary border-b-2 border-action-primary' : 'text-text-sub-light dark:text-text-sub-dark'}`}
                    >
                        推荐
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'following' ? 'text-action-primary border-b-2 border-action-primary' : 'text-text-sub-light dark:text-text-sub-dark'}`}
                    >
                        关注
                    </button>
                    <button
                        onClick={() => setActiveTab('qa')}
                        className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'qa' ? 'text-action-primary border-b-2 border-action-primary' : 'text-text-sub-light dark:text-text-sub-dark'}`}
                    >
                        问答
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-4 space-y-4 min-h-[50vh]">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner />
                    </div>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                        <article
                            key={post.id}
                            className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm"
                        >
                            {/* Author */}
                            <div className="flex items-center gap-3 mb-3">
                                <img
                                    src={post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                                    alt={post.author_name}
                                    className="w-10 h-10 rounded-full object-cover bg-gray-100"
                                />
                                <div>
                                    <h3 className="font-medium text-text-main-light dark:text-text-main-dark">
                                        {post.author_name || '匿名用户'}
                                    </h3>
                                    <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                        {formatTime(post.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <h2 className="font-bold text-text-main-light dark:text-text-main-dark mb-2">
                                {post.title}
                            </h2>
                            <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-3 line-clamp-3 whitespace-pre-line">
                                {post.content}
                            </p>

                            {/* Tags */}
                            <div className="flex gap-2 mb-3">
                                {post.tags && post.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark rounded-full"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">thumb_up</span>
                                    <span className="text-sm">{post.likes}</span>
                                </button>
                                <button className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                    <span className="text-sm">{post.comments || 0}</span>
                                </button>
                                <button className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark ml-auto hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">share</span>
                                </button>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">forum</span>
                        <p className="text-text-sub-light dark:text-text-sub-dark">暂无帖子，快来发布第一条吧！</p>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default CommunityPage;
