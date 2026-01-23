import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-sans text-text-main-light dark:text-text-main-dark overflow-x-hidden">
            <div className="flex items-center justify-center pt-8 pb-4 px-4">
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-center uppercase tracking-wider opacity-80">House Maint AI</h2>
            </div>
            <div className="flex-1 flex flex-col items-center w-full max-w-md mx-auto px-6 overflow-y-auto">
                <div className="w-full mt-4 mb-8">
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCIOe-qL3CxVNeGvHujtL4Ck_MMto7Ozj3VmffOMD_ifZFq4FL54GFgY3SSFdS-kU2KkKxOXBC1BDWtbMrwWcaPlAZAcuPruBHeYCs68FwkMZudqKYdb37Et03TmZeIwB_9MRPFr8Cqn3qBLAwZ88aw_tK_kGf7hBDvaT4Hu87SEqr-MBlhwePmWDrWzCTHNx_45Ko6-dKebpyVzJ0TsXu2-pgABT3qN36e1hR5Qv98s_1bt7xY9kKkvLPlmsYAkb2ohbrrn2_8gw8")' }}
                            aria-label="Person holding a smartphone scanning a bathroom faucet"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        <div className="absolute bottom-4 right-4 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-xl flex items-center gap-2 animate-pulse">
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                            <div className="flex flex-col leading-none gap-0.5">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Issue Detected</span>
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">检测到问题</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-text-main-light dark:text-text-main-dark">
                        Welcome to House Maint AI
                        <span className="block text-xl md:text-2xl text-primary font-bold mt-1">欢迎使用 House Maint AI</span>
                    </h1>
                </div>
                <div className="w-full flex flex-col gap-4 mb-8">
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">auto_fix_high</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">AI Repair Recognition</h3>
                            <p className="text-xs font-medium text-primary mb-1">AI 维修识别</p>
                            <p className="text-sm opacity-70">Identify issues instantly with your camera. <span className="opacity-80">/ 拍照即刻识别问题</span></p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">build</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">Multiple Fix Strategies</h3>
                            <p className="text-xs font-medium text-primary mb-1">多种维修方案</p>
                            <p className="text-sm opacity-70">DIY guides or Pro recommendations. <span className="opacity-80">/ DIY 指南或专业建议</span></p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 min-h-14 p-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary mt-1">
                            <span className="material-symbols-outlined text-[24px]">checklist</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold leading-tight">Maintenance Checklists</h3>
                            <p className="text-xs font-medium text-primary mb-1">房屋维护清单</p>
                            <p className="text-sm opacity-70">Keep your home in top shape. <span className="opacity-80">/ 保持房屋最佳状态</span></p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-md mx-auto p-6 pt-0 mt-auto">
                <div className="flex justify-center gap-2 mb-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                </div>
                <Link
                    to="/"
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg h-14 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    Get Started / 立即开始
                    <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <div className="h-4"></div>
            </div>
        </div>
    );
};

export default WelcomePage;
