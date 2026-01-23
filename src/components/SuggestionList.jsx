import React from 'react';

const SuggestionList = () => {
    return (
        <section className="pl-5 pb-4">
            <div className="flex items-center justify-between pr-5 mb-3 px-1">
                <h3 className="text-lg font-bold">Suggested for You / 推荐</h3>
                <span className="text-sm text-text-sub-light dark:text-text-sub-dark">Fall / 秋季</span>
            </div>
            <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-4 pr-5 snap-x snap-mandatory">
                <div className="snap-start shrink-0 w-[280px] bg-white dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3 group cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="h-32 w-full rounded-xl bg-gray-100 overflow-hidden relative">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBiwLIygMWAPhIzPPnu8GLwKG-uzioqir-gGRJdJC1xpV28Uq6IhDltvOtQ_poh-sodAfpqHwGI6k7PxuTIgrAN5tJEuT6LZBxO38aAmAx9ZamDheX9mU0aMcOmNIcHtgWzdA4AxEyfbo0Zq4lQ85TzSjpwsfnRkDc1zclho4I_M2jYhcjbZPg_ccjzkO8U9mppUfLNpgyjY3tyzh34qTnNPJHdCPfW8RZql5m5rwDs4TrJuUrL2SZSOeNP0BRkf2bBCWWfD65bi4s")' }}
                            aria-label="Air conditioner vent with filter being replaced"
                        >
                        </div>
                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                            <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">15m</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-base mb-2">AC Filter Check / 空调滤网检查</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">Low Urgency</span>
                            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold">Easy</span>
                        </div>
                    </div>
                </div>

                <div className="snap-start shrink-0 w-[280px] bg-white dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3 group cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="h-32 w-full rounded-xl bg-gray-100 overflow-hidden relative">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBc-YQMOfLE2Hj7ORfSETa78AWEhWBQYT4q0CFn06inNZgJNazctpAXXkMz7088GZxyW3eKtMUudO7ZaJJ_8jw1OrkEAFupWTdZhiFlsuXGFioulsJRb4jyi6Xa0MWC8op8ZGBmKcTgXSoDpVxdF4IaqdINpUdGex7TWtnkjmWF-pFJVTVP-2jGvdYsG55Lel2rR_vyGPDZ55FdubpC2TjXM8ynnP0AWjuivDxzXNMBg_GUWI3C0NxMHvC_yF8j0mcV8bPRtVBIzhk")' }}
                            aria-label="Person cleaning leaves from roof gutter"
                        >
                        </div>
                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                            <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">1hr</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-base mb-2">Gutter Cleaning / 清理排水沟</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold">Med Urgency</span>
                            <span className="px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 text-xs font-semibold">Medium</span>
                        </div>
                    </div>
                </div>

                <div className="snap-start shrink-0 w-[280px] bg-white dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3 group cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="h-32 w-full rounded-xl bg-gray-100 overflow-hidden relative">
                        <div
                            className="bg-center bg-no-repeat bg-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB-Kg7zC9e8dlVnp_aHlQyU8uxDz4lu_8h4es6yx4J_CcOu83GgWPCGIIjoBJu1QjPpDbucz0z5kCGakJLn-V3OYvJOonm0H0UgaV3HqdlMRYGjryNBxSqKD1deNQFLbz5j9jQxF9LvgGEHxieBnoXcKIwB61oip1A19p5JB3xUMTY0v4sZ0DPuMBnRR8mdGIqzN0V_thEuokw4F1Ip48gkW8aGnA7uu-k2B6p1IfRBQL1iViwJjV7EtJDyXtu_CQS3B6eC0Rd_QYw")' }}
                            aria-label="Outdoor water spigot wrapped with insulation"
                        >
                        </div>
                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                            <span className="text-xs font-bold text-text-main-light dark:text-text-main-dark">30m</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-base mb-2">Winterize Pipes / 管道防冻</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold">High Urgency</span>
                            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold">Hard</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SuggestionList;
