import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate, Outlet } from "react-router-dom";
import type { JSX } from "react";

export default function ProtectedRoute(): JSX.Element {
    const { isAuthenticated, isLoading } = useKindeAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
