import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PermissionRoute from "@/components/auth/PermissionRoute";
import AuthInitializer from "@/components/auth/AuthInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { useTokenExpiration } from "@/hooks/useTokenExpiration";
import { PERMISSIONS } from "@/utils/rbacConfig";
import { UserProvider } from "@/contexts/UserContext";
import { TourProvider } from "@/contexts/TourContext";
import type { JSX } from "react";

// ✅ CODE SPLITTING: Lazy load all route pages
// Each page is loaded only when user navigates to it
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const KnowledgeBasePage = lazy(() => import("@/pages/KnowledgeBasePage"));
const IntegrationPage = lazy(() => import("@/pages/Integration"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const ChatPage = lazy(() => import("@/pages/NewChatPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const InviteAcceptancePage = lazy(() => import("@/pages/InviteAcceptancePage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("@/pages/TermsOfServicePage"));
const DataUsagePolicyPage = lazy(() => import("@/pages/DataUsagePolicyPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ChangelogPage = lazy(() => import("@/pages/ChangelogPage"));

/**
 * Loading fallback component shown while chunks are being loaded
 */
function PageLoader(): JSX.Element {
    return (
        <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}

/** Combines ErrorBoundary + Suspense for each lazy route */
function PageBoundary({ children }: { children: JSX.Element }): JSX.Element {
    return (
        <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
                {children}
            </Suspense>
        </ErrorBoundary>
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
                        <Navigate to="/chat" replace />
                    ) : (
                        <LandingPage />
                    )
                }
            />

            {/* Public Invite Acceptance (no auth required) */}
            <Route
                path="/invite/accept"
                element={
                    <PageBoundary>
                        <InviteAcceptancePage />
                    </PageBoundary>
                }
            />

            {/* Public Legal Pages */}
            <Route
                path="/privacy-policy"
                element={
                    <PageBoundary>
                        <PrivacyPolicyPage />
                    </PageBoundary>
                }
            />
            <Route
                path="/terms"
                element={
                    <PageBoundary>
                        <TermsOfServicePage />
                    </PageBoundary>
                }
            />
            <Route
                path="/data-usage-policy"
                element={
                    <PageBoundary>
                        <DataUsagePolicyPage />
                    </PageBoundary>
                }
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.EMPLOYEE_VIEW} redirectTo="/">
                                    <DashboardPage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/employees"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.EMPLOYEE_VIEW} redirectTo="/chat">
                                    <EmployeesPage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/teams"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.GROUP_VIEW} redirectTo="/chat">
                                    <CategoryPage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/knowledge-base"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.FOLDER_VIEW} redirectTo="/chat">
                                    <KnowledgeBasePage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/integration"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.INTEGRATION_VIEW} redirectTo="/chat">
                                    <IntegrationPage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/subscription"
                        element={
                            <PageBoundary>
                                <PermissionRoute permission={PERMISSIONS.BILLING_VIEW} redirectTo="/chat">
                                    <SubscriptionPage />
                                </PermissionRoute>
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/chat"
                        element={
                            <PageBoundary>
                                <ChatPage />
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/chat/:id"
                        element={
                            <PageBoundary>
                                <ChatPage />
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/about"
                        element={
                            <PageBoundary>
                                <AboutPage />
                            </PageBoundary>
                        }
                    />

                    <Route
                        path="/changelog"
                        element={
                            <PageBoundary>
                                <ChangelogPage />
                            </PageBoundary>
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
                    <PageBoundary>
                        <NotFoundPage />
                    </PageBoundary>
                }
            />
        </Routes>
    );
}

function App(): JSX.Element {
    return (
        <div className="App">
            <BrowserRouter>
                <UserProvider>
                    <TourProvider>
                        <AuthInitializer />
                        <AppRoutes />
                    </TourProvider>
                </UserProvider>
            </BrowserRouter>

            <Toaster position="bottom-right" />
        </div>
    );
}

export default App;