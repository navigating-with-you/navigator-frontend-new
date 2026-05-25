export const config = {
    kindeClientId: window.env?.VITE_KINDE_CLIENT_ID || import.meta.env.VITE_KINDE_CLIENT_ID,
    kindeDomain: window.env?.VITE_KINDE_DOMAIN || import.meta.env.VITE_KINDE_DOMAIN,
    kindeRedirectUri: window.env?.VITE_KINDE_REDIRECT_URI || import.meta.env.VITE_KINDE_REDIRECT_URI,
    kindeLogoutRedirectUri: window.env?.VITE_KINDE_LOGOUT_REDIRECT_URI || import.meta.env.VITE_KINDE_LOGOUT_REDIRECT_URI,
    apiBaseUrl: window.env?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8432",
    wsUrl: window.env?.VITE_WS_URL || import.meta.env.VITE_WS_URL,
    kindeInsecureRefresh:
        window.env?.VITE_KINDE_INSECURE_REFRESH === "true" ||
        import.meta.env.VITE_KINDE_INSECURE_REFRESH === "true" ||
        import.meta.env.VITE_KINDE_INSECURE_REFRESH === true,
};
