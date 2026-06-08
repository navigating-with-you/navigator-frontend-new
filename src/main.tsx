import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { config } from "./config.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KindeProvider
            clientId={config.kindeClientId}
            domain={config.kindeDomain}
            redirectUri={config.kindeRedirectUri}
            logoutUri={config.kindeLogoutRedirectUri}
            useInsecureForRefreshToken={config.kindeInsecureRefresh}
            audience={config.kindeAudience}
        >
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ErrorBoundary>
                        <App />
                    </ErrorBoundary>
                </ThemeProvider>
            </QueryClientProvider>
        </KindeProvider>
    </StrictMode>
);

