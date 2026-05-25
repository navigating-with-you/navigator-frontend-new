import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KindeProvider
            clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
            domain={import.meta.env.VITE_KINDE_DOMAIN}
            redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI}
            logoutUri={import.meta.env.VITE_KINDE_LOGOUT_REDIRECT_URI}
            useInsecureForRefreshToken={import.meta.env.VITE_KINDE_INSECURE_REFRESH}
        >
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </KindeProvider>
    </StrictMode>
);
