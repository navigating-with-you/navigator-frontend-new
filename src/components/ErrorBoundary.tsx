import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
                    <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-450 rounded-full flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                            An unexpected application error occurred. We have logged this error and are working on fixing it.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-left border border-zinc-150 dark:border-zinc-800/80">
                                <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-bold">Error Details</p>
                                <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all whitespace-pre-wrap leading-normal max-h-32 overflow-y-auto">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer select-none"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Go to Homepage
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
