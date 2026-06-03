import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "light",
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem("navigator_theme") as Theme | null;
        if (stored === "dark" || stored === "light") return stored;
        return "light"; // default to light theme
    });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        localStorage.setItem("navigator_theme", theme);
    }, [theme]);

    const toggleTheme = () =>
        setThemeState((prev) => (prev === "light" ? "dark" : "light"));

    const setTheme = (t: Theme) => setThemeState(t);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
