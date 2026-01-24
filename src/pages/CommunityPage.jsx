import React from 'react';
import BottomNav from '../components/BottomNav';

/**
 * CommunityPage - 社区页面
 * 
 * 展示维修经验分享、问答社区等内容。
 */
const CommunityPage = () => {
    // Mock community posts
    const posts = [
        {
            id: 1,
            author: '王师傅',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            title: '如何快速解决水龙头漏水',
            content: '分享一个简单的修理技巧，只需要一个扳手和新垫圈...',
            likes: 128,
            comments: 24,
            time: '2小时前',
            tags: ['水管', 'DIY'],
        },
        {
            id: 2,
            author: '李女士',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            title: '空调不制冷？可能是这些原因',
            content: '夏天空调突然不凉了，先别急着叫维修，检查这几点...',
            likes: 256,
            comments: 45,
            time: '5小时前',
            tags: ['空调', '故障诊断'],
        },
        {
            id: 3,
            author: '张工程师',
            avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
            title: '电路跳闸的正确处理方法',
            content: '家里经常跳闸？这篇文章教你安全地排查问题...',
            likes: 89,
            comments: 12,
            time: '昨天',
            tags: ['电路', '安全'],
        },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-surface-dark shadow-sm">
                <div className="flex items-center justify-between p-4 pt-6">
                    <h1 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">
                        社区
                    </h1>
                    <button className="p-2 text-action-primary">
                        <span className="material-symbols-outlined">edit_square</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button className="flex-1 py-3 text-action-primary border-b-2 border-action-primary font-medium">
                        推荐
                    </button>
                    <button className="flex-1 py-3 text-text-sub-light dark:text-text-sub-dark">
                        关注
                    </button>
                    <button className="flex-1 py-3 text-text-sub-light dark:text-text-sub-dark">
                        问答
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-4 space-y-4">
                {posts.map((post) => (
                    <article
                        key={post.id}
                        className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm"
                    >
                        {/* Author */}
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={post.avatar}
                                alt={post.author}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                                <h3 className="font-medium text-text-main-light dark:text-text-main-dark">
                                    {post.author}
                                </h3>
                                <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                    {post.time}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <h2 className="font-bold text-text-main-light dark:text-text-main-dark mb-2">
                            {post.title}
                        </h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-3 line-clamp-2">
                            {post.content}
                        </p>

                        {/* Tags */}
                        <div className="flex gap-2 mb-3">
                            {post.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark rounded-full"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                                <span className="material-symbols-outlined text-lg">thumb_up</span>
                                <span className="text-sm">{post.likes}</span>
                            </button>
                            <button className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                                <span className="material-symbols-outlined text-lg">chat_bubble</span>
                                <span className="text-sm">{post.comments}</span>
                            </button>
                            <button className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark ml-auto">
                                <span className="material-symbols-outlined text-lg">share</span>
                            </button>
                        </div>
                    </article>
                ))}
            </main>

            <BottomNav />
        </div>
    );
};

export default CommunityPage;
