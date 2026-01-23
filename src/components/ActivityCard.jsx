import React from 'react';

const ActivityCard = () => {
    return (
        <section className="px-5">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-bold">Continue Activity / 继续活动</h3>
                <a className="text-sm font-semibold text-primary" href="#">View All</a>
            </div>
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="size-16 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCD_b1ebU7AxZratOuRlpPC3leWIsvv_MSwcK0J7GRpFDXpSF9BIVgj-oSX7owf0LBGok5DFnwuO6AqwXYmcqVHRzTp66S8ce3zjPr1yl7pJwY0sARzjCAxoDCP3bO5ty5MrUugUVtBV2URA8lUEy6Md2kmONPh-fSo67cYITwrlwTMSpONh7HEmPAVI98nZlVnm0Q9fzrrqrkgy6_uAkgmljzKeUb00hLeyXyrnBMurW4Jjd0aPqcS6dOMey8-mxaAw9FscOlx7WA")' }}
                            aria-label="Close up of a leaking pipe under a kitchen sink"
                        >
                        </div>
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                        <h4 className="font-bold text-text-main-light dark:text-text-main-dark truncate">Leaking pipe under sink / 水槽漏水</h4>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1">Step 2 of 4 • Analyzing damage</p>
                    </div>
                    <div className="flex items-center">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[24px]">play_arrow</span>
                        </div>
                    </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "50%" }}></div>
                </div>
            </div>
        </section>
    );
};

export default ActivityCard;
