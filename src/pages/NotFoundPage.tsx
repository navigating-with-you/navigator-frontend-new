import { useNavigate } from "react-router-dom";
import type { JSX } from "react";

export default function NotFoundPage(): JSX.Element {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-white dark:bg-zinc-950">
            <div className="flex flex-col items-center max-w-md w-full">
                {/* 404 SVG Icon */}
                <div className="w-48 h-48 mb-8 flex items-center justify-center animate-fade-in">
                    <img 
                        src="/404.svg" 
                        alt="Page Not Found" 
                        className="w-full h-full object-contain dark:opacity-90 select-none pointer-events-none" 
                    />
                </div>

                {/* Heading */}
                <h1 className="text-[28px] font-bold text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight">
                    Oops, Page was not found!
                </h1>

                {/* Description */}
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm">
                    The page doesn't exist. If you think there is something off, please contact us
                </p>

                {/* Back to Dashboard Button */}
                <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer select-none active:scale-[0.98]"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
