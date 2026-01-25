
import { IMAGES } from '../constants/images';

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
                        style={{ backgroundImage: `url("${IMAGES.USER_AVATAR}")` }}
                        aria-label="User profile portrait smiling"
                    >
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
