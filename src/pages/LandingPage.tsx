import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
    const { login, register, isLoading } = useKindeAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-white">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b border-zinc-200">
                <div className="flex items-center">
                    <img 
                        src="/navigator-logo.svg" 
                        alt="Navigator" 
                        className="h-7 w-auto object-contain block" 
                    />
                </div>
                <Button
                    variant="ghost"
                    onClick={() => login()}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                    Sign in
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 items-center justify-center px-6">
                <div className="max-w-md text-center space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                        Knowledge management for teams
                    </h1>
                    
                    <p className="text-lg text-zinc-600">
                        Centralize documentation, manage employees, and keep your team aligned.
                    </p>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            onClick={() => register()}
                            className="h-11 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm"
                        >
                            Get started
                        </Button>
                        <Button
                            onClick={() => login()}
                            className="h-11 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg font-medium shadow-sm"
                        >
                            Sign in
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="px-8 py-6 border-t border-zinc-200">
                <p className="text-sm text-zinc-500 text-center">
                    © 2026 Navigator
                </p>
            </footer>
        </div>
    );
}
