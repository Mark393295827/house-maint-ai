import React from 'react';

const SearchBar = () => {
    return (
        <div className="px-5 py-3">
            <div className="flex w-full items-center rounded-xl bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800 h-12 transition-all focus-within:ring-2 focus-within:ring-primary/20">
                <div className="pl-4 pr-2 text-primary">
                    <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                    className="flex-1 bg-transparent border-none text-base text-text-main-light dark:text-text-main-dark placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 focus:ring-0 focus:outline-none h-full"
                    placeholder="Search for issues / 搜索维修问题"
                    type="text"
                />
                <button className="pr-4 pl-2 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[24px]">mic</span>
                </button>
            </div>
        </div>
    );
};

export default SearchBar;
