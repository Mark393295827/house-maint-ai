/**
 * Mock Workers Data
 * 
 * 用于 WorkerMatchPage 的模拟工人数据
 */
export const mockWorkers = [
    {
        id: 1,
        name: "Wang Shifu",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        distance: 1.2,
        rating: 4.8,
        skills: ["plumbing", "electrical"],
        technicalScore: 95,
        distanceScore: 88
    },
    {
        id: 2,
        name: "Li Shifu",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg",
        distance: 3.5,
        rating: 4.5,
        skills: ["plumbing"],
        technicalScore: 85,
        distanceScore: 65
    },
    {
        id: 3,
        name: "Zhang Shifu",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg",
        distance: 0.8,
        rating: 4.2,
        skills: ["electrical"],
        technicalScore: 75,
        distanceScore: 92
    }
];

/**
 * Mock Report Data
 * 
 * 用于匹配计算的模拟报修数据
 */
export const mockReport = {
    requiredSkills: ["plumbing"]
};

/**
 * Mock Community Posts Data
 * 
 * 用于 CommunityPage 的模拟帖子数据
 */
export const mockCommunityPosts = [
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

export default {
    mockWorkers,
    mockReport,
    mockCommunityPosts,
};
