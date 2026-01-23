import React from 'react';

const QuickActions = () => {
    return (
        <section className="px-5">
            <h3 className="text-lg font-bold mb-3 px-1">Quick Actions / 快速操作</h3>
            <div className="grid grid-cols-4 gap-3">
                <button className="flex flex-col items-center gap-2 group">
                    <div className="size-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-active:scale-95">
                        <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                    </div>
                    <span className="text-xs font-medium text-center">Scan / 扫描</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                    <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm transition-transform group-active:scale-95">
                        <span className="material-symbols-outlined text-primary text-[28px]">upload_file</span>
                    </div>
                    <span className="text-xs font-medium text-center">Import / 导入</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                    <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm transition-transform group-active:scale-95">
                        <span className="material-symbols-outlined text-primary text-[28px]">calendar_month</span>
                    </div>
                    <span className="text-xs font-medium text-center">Plan / 计划</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                    <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm transition-transform group-active:scale-95">
                        <span className="material-symbols-outlined text-primary text-[28px]">inventory_2</span>
                    </div>
                    <span className="text-xs font-medium text-center">Tools / 工具</span>
                </button>
            </div>
        </section>
    );
};

export default QuickActions;
