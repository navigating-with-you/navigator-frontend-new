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
    const { getToken } = useKindeAuth();
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem("navigator_theme") as Theme | null;
        if (stored === "dark" || stored === "light" || stored === "system") return stored;
        return "system"; // default to system theme
    });

    // Load theme from backend on mount
    useEffect(() => {
        const loadThemeFromBackend = async () => {
            try {
                const token = await getToken();
                if (token) {
                    const settings = await getUserSettings(token);
                    const backendTheme = (settings.preferences.theme as Theme) || "system";
                    setThemeState(backendTheme);
                }
            } catch (error) {
                console.error("Failed to load theme from backend:", error);
                // Fall back to localStorage
            }
        };

        loadThemeFromBackend();
    }, [getToken]);

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
