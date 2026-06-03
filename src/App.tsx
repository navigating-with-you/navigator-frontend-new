import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PermissionRoute from "@/components/auth/PermissionRoute";
import AuthInitializer from "@/components/auth/AuthInitializer";
import { Toaster } from "@/components/ui/sonner";
import { useTokenExpiration } from "@/hooks/useTokenExpiration";
import { PERMISSIONS } from "@/utils/rbacConfig";
import type { JSX } from "react";

// ✅ CODE SPLITTING: Lazy load all route pages
// Each page is loaded only when user navigates to it
const DashboardPage = lazy(() => import("@/pages/PlaceholderPage").then(m => ({ default: () => m.default({ title: "Dashboard" }) })));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const KnowledgeBasePage = lazy(() => import("@/pages/KnowledgeBasePage"));
const IntegrationPage = lazy(() => import("@/pages/Integration"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const BillingPage = lazy(() => import("@/pages/PlaceholderPage").then(m => ({ default: () => m.default({ title: "Billing" }) })));
const ChatPage = lazy(() => import("@/pages/NewChatPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const InviteAcceptancePage = lazy(() => import("@/pages/InviteAcceptancePage"));

/**
 * Loading fallback component shown while chunks are being loaded
 */
function PageLoader(): JSX.Element {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <p className="text-sm text-gray-600">Loading...</p>
            </div>
        </div>
    );
}

function AppRoutes(): JSX.Element {
    const { isAuthenticated } = useKindeAuth();

    // ✅ TOKEN EXPIRATION: Monitor and refresh token
    useTokenExpiration();

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/"
                element={
                    isAuthenticated ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <LandingPage />
                    )
                }
            />

            {/* Public Invite Acceptance (no auth required) */}
            <Route
                path="/invite/accept"
                element={
                    <Suspense fallback={<PageLoader />}>
                        <InviteAcceptancePage />
                    </Suspense>
                }
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <DashboardPage />
                            </Suspense>
                        }
                    />

                    <Route
                        path="/employees"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.EMPLOYEE_VIEW}>
                                    <EmployeesPage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/teams"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.GROUP_VIEW}>
                                    <CategoryPage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/knowledge-base"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.FOLDER_VIEW}>
                                    <KnowledgeBasePage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/integration"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.INTEGRATION_VIEW}>
                                    <IntegrationPage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/subscription"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.BILLING_VIEW}>
                                    <SubscriptionPage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/billing"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <PermissionRoute permission={PERMISSIONS.BILLING_VIEW}>
                                    <BillingPage />
                                </PermissionRoute>
                            </Suspense>
                        }
                    />

                    <Route
                        path="/chat"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ChatPage />
                            </Suspense>
                        }
                    />

                    <Route
                        path="/chat/:id"
                        element={
                            <Suspense fallback={<PageLoader />}>
                                <ChatPage />
                            </Suspense>
                        }
                    />

                    <Route
                        path="/chatnew"
                        element={<Navigate to="/chat" replace />}
                    />

                    <Route
                        path="/chatsearch"
                        element={<Navigate to="/chat" replace />}
                    />
                </Route>
            </Route>

            {/* Fallback */}
            <Route
                path="*"
                element={
                    <Suspense fallback={<PageLoader />}>
                        <NotFoundPage />
                    </Suspense>
                }
            />
        </Routes>
    );
}

function App(): JSX.Element {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthInitializer />
                <AppRoutes />
            </BrowserRouter>

            <Toaster position="bottom-right" />
        </div>
    );
}

export default App;