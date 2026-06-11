import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UserProfile {
    id: string;
    kinde_user_id?: string;
    email: string;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
    organization_name?: string | null;
    role?: {
        id: string;
        name: string;
        description?: string | null;
    } | null;
    [key: string]: unknown;
}

interface UserContextValue {
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile | null) => void;
    updateUserProfile: (partial: Partial<UserProfile>) => void;
    clearUserProfile: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
    const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);

    const setUserProfile = useCallback((profile: UserProfile | null) => {
        setUserProfileState(profile);
    }, []);

    const updateUserProfile = useCallback((partial: Partial<UserProfile>) => {
        setUserProfileState(prev => prev ? { ...prev, ...partial } : null);
    }, []);

    const clearUserProfile = useCallback(() => {
        setUserProfileState(null);
    }, []);

    return (
        <UserContext.Provider value={{ userProfile, setUserProfile, updateUserProfile, clearUserProfile }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserProfile(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error("useUserProfile must be used within a UserProvider");
    }
    return ctx;
}
