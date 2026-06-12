import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getUserSettings, updateThemePreference } from "@/lib/api";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "system",
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { getToken, isAuthenticated } = useKindeAuth();
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem("navigator_theme") as Theme | null;
        if (stored === "dark" || stored === "light" || stored === "system") return stored;
        return "system"; // default to system theme
    });

    // Load theme after user sync completes (navigator_user_synced fires once
    // AuthInitializer has called syncUser and the backend knows the user).
    // Loading earlier races with syncUser and gets a 401 for new sessions.
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;

        const loadThemeFromBackend = async () => {
            try {
                const token = await getToken();
                if (token && !cancelled) {
                    const settings = await getUserSettings(token);
                    if (!cancelled) {
                        const backendTheme = (settings.preferences.theme as Theme) || "system";
                        setThemeState(backendTheme);
                    }
                }
            } catch {
                // Fall back to localStorage theme — no need to log, already stored locally
            }
        };

        const handleUserSynced = () => { if (!cancelled) loadThemeFromBackend(); };
        window.addEventListener("navigator_user_synced", handleUserSynced);

        return () => {
            cancelled = true;
            window.removeEventListener("navigator_user_synced", handleUserSynced);
        };
    }, [isAuthenticated]); // getToken is functionally stable

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove("light", "dark");
        
        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
        
        localStorage.setItem("navigator_theme", theme);
    }, [theme]);

    // Handle system theme preference changes dynamically
    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");
            const systemTheme = mediaQuery.matches ? "dark" : "light";
            root.classList.add(systemTheme);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    const toggleTheme = async () => {
        setThemeState((prev) => {
            const next = prev === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark"
                : prev === "light"
                ? "dark"
                : "light";
            
            // Save to backend
            (async () => {
                try {
                    const token = await getToken();
                    if (token) {
                        await updateThemePreference(next, token);
                    }
                } catch (error) {
                    console.error("Failed to save theme preference:", error);
                }
            })();
            
            return next;
        });
    };

    const setTheme = async (t: Theme) => {
        setThemeState(t);
        
        // Save to backend
        try {
            const token = await getToken();
            if (token) {
                await updateThemePreference(t, token);
            }
        } catch (error) {
            console.error("Failed to save theme preference:", error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
