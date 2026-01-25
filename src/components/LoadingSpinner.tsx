

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center h-screen w-full bg-background-light dark:bg-background-dark" role="status" aria-label="Loading">
            <div className="relative size-12">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
