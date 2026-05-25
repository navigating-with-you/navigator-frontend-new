import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { config } from "./config.ts";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KindeProvider
            clientId={config.kindeClientId}
            domain={config.kindeDomain}
            redirectUri={config.kindeRedirectUri}
            logoutUri={config.kindeLogoutRedirectUri}
            useInsecureForRefreshToken={config.kindeInsecureRefresh}
        >
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </KindeProvider>
    </StrictMode>
);
