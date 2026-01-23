import React from 'react';

const Header = () => {
    return (
        <header className="sticky top-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-safe-top">
            <div className="flex items-center justify-between px-5 pt-6 pb-2">
                <div className="flex flex-col">
                    <span className="text-text-sub-light dark:text-text-sub-dark text-sm font-medium">San Francisco, CA</span>
                    <h2 className="text-text-main-light dark:text-text-main-dark text-xl font-bold leading-tight">Good morning, Alex</h2>
                </div>
                <div className="size-10 rounded-full overflow-hidden border border-primary/20">
                    <div
                        className="bg-center bg-no-repeat bg-cover w-full h-full"
                        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC7MOXduoIXa9G2nCZpkFv5C2HYpQtjN90J2xA4ip6i4Qo5pWYW35IgPoBZz2vHwM6FTRPDgP9CPtviaQgL6H4a20cl7OJrXuvRMqZiA9zlGe4L-42kzJ09UTJAg3-vyEZ5CDBQvi2yK8q0kRM9sJ_3W5rTgVYnxpv1imSYbAncBFVDe0qXUGbB4dfesfPgTeTAoeSVZzKM_qlDdISxvP4A8R4pQ2pwp7htttmiKIgQ8INJelJvn27t5qYuaNSTUlTpTr7GZ4Q0fUc")' }}
                        aria-label="User profile portrait smiling"
                    >
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
