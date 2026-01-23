import React from 'react';
import { Link } from 'react-router-dom';

const DiagnosisPage = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-sans overflow-hidden h-screen w-full relative">
            {/* Camera Background */}
            <div className="absolute inset-0 w-full h-full z-0">
                <div
                    className="w-full h-full bg-cover bg-center bg-no-repeat relative"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDJ74Xos8GgVwd7L4_oeO79bvI9B_-R_02TYaOOsxLkbuLpeX6XRk4r0V-XizaUIKzS7Vc0UZMHkhphWx9k4EYkA7r4JHEICrcTOcnVoluDC5WZyVk4tMxAz2fb1nYlQyx6lOed1A_SnYWYLH9CFwzyoyTNl-ehNw9QddNseXfmsdvuWEg11ZalFn2EqB3aF5dE9m0tjsVeScWNsT4Hc6VnlSLNWESjZAr6HUBwMW5Zg5kJEE4lZEcmqC8rCznxzjRf0zJ6Eg6cZP0')" }}
                    aria-label="Close up of a textured wall with a small crack"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
                </div>
            </div>

            {/* Detection Overlays */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-[30%] left-[20%] w-[180px] h-[120px] border-2 border-primary rounded-lg animate-pulse flex flex-col items-start justify-end p-2 bg-primary/10">
                    <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm mb-auto ml-auto transform translate-x-3 -translate-y-3">
                        85% Match / 匹配
                    </div>
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                        <span className="material-symbols-outlined text-primary text-[16px]">warning</span>
                        <span className="text-xs font-bold text-gray-900">Wall Crack / 墙体裂缝</span>
                    </div>
                </div>
                <div className="absolute bottom-[40%] right-[15%] w-[80px] h-[80px] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
            </div>

            {/* UI Controls */}
            <div className="relative z-20 flex flex-col h-full justify-between p-4 pb-8">
                <div className="flex flex-col gap-4 pt-8">
                    <div className="flex justify-between items-center px-2">
                        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                            <span className="material-symbols-outlined">flash_off</span>
                        </button>
                        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:bg-primary transition-colors">
                            <span className="material-symbols-outlined">grid_4x4</span>
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg max-w-[95%]">
                            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">lightbulb</span>
                            <p className="text-gray-900 text-sm font-medium truncate">Ensure good lighting / 请确保光线充足</p>
                            <button className="ml-1 text-gray-400 hover:text-gray-600 flex items-center shrink-0">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Bottom Controls */}
                <div className="flex flex-col gap-6 items-center w-full">
                    <div className="bg-black/30 backdrop-blur-md rounded-full p-1 flex relative">
                        <button className="px-3 py-1.5 rounded-full text-xs font-bold text-white/70 hover:text-white transition-colors whitespace-nowrap">
                            Import / 导入
                        </button>
                        <button className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-md whitespace-nowrap">
                            Photo / 拍照
                        </button>
                        <button className="px-3 py-1.5 rounded-full text-xs font-bold text-white/70 hover:text-white transition-colors whitespace-nowrap">
                            Batch / 批量
                        </button>
                    </div>
                    <div className="flex items-center justify-between w-full px-8 max-w-sm">
                        <button className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden border-2 border-white/20 active:scale-95 transition-transform">
                            <div
                                className="w-full h-full bg-cover bg-center"
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDVXmmcIle65K4rR0RY6Q-48sJhUZIyp1lfndxSo9XM2FSWcWOhjh3V9hmHEUSg9cjN57OHRdaNc3lpM1-P5gSedvMtPUZGtMRAGX_E35eZO97JAgl3aAWhOKd2TMg5SCR61gDOfeMKB9YGlAYVgq6yYl9xROmRB-xLAjkqVsu0bnd-EgmG0NqrAMlwI8iS5rj3mrCIiRWjWG6-Esp6D7SJ718Z6FYd3cv9hA0n6ljgwbYDRlzEKy-HQHO5C7A_YWdGxDgQb7cplaM')" }}
                                aria-label="Thumbnail of previous repair photo"
                            ></div>
                        </button>
                        <Link to="/repair/1" className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white active:scale-95 transition-all duration-150">
                            <div className="w-16 h-16 bg-primary rounded-full group-hover:scale-90 transition-transform duration-200"></div>
                        </Link>
                        <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors">
                            <span className="material-symbols-outlined">tune</span>
                        </button>
                    </div>
                    <div className="h-2"></div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosisPage;
