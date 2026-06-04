"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_TOKEN_KEY, adminLogin, fetchCanvasCurrentUser, fetchCurrentUser, login, type AuthPayload, type AuthUser, type CanvasAuthPayload } from "@/services/api/auth";
import { useConfigStore } from "@/stores/use-config-store";

type AuthMode = "pool" | "admin";

type UserStore = {
    token: string;
    authMode: AuthMode;
    user: AuthUser | null;
    isReady: boolean;
    isLoading: boolean;
    setSession: (token: string, user: AuthUser, authMode?: AuthMode) => void;
    clearSession: () => void;
    hydrateUser: () => Promise<void>;
    login: (payload: AuthPayload) => Promise<AuthUser>;
    adminLogin: (payload: CanvasAuthPayload) => Promise<AuthUser>;
};

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            token: "",
            authMode: "pool",
            user: null,
            isReady: false,
            isLoading: false,
            setSession: (token, user, authMode = "pool") => {
                useConfigStore.getState().updateConfig("apiKey", authMode === "pool" ? token : "");
                set({ token, user, authMode, isReady: true });
            },
            clearSession: () => {
                useConfigStore.getState().updateConfig("apiKey", "");
                set({ token: "", authMode: "pool", user: null, isReady: true });
            },
            hydrateUser: async () => {
                const token = get().token;
                const authMode = get().authMode;
                if (!token) {
                    set({ user: null, isReady: true });
                    return;
                }
                set({ isLoading: true });
                try {
                    const user = authMode === "admin" ? await fetchCanvasCurrentUser(token) : await fetchCurrentUser(token);
                    if (user.role === "guest") {
                        set({ token: "", authMode: "pool", user: null, isReady: true, isLoading: false });
                        return;
                    }
                    useConfigStore.getState().updateConfig("apiKey", authMode === "pool" ? token : "");
                    set({ user, isReady: true, isLoading: false });
                } catch {
                    const fallbackUser = get().user;
                    if (authMode === "pool" && fallbackUser) {
                        useConfigStore.getState().updateConfig("apiKey", token);
                        set({ user: fallbackUser, isReady: true, isLoading: false });
                        return;
                    }
                    set({ token: "", authMode: "pool", user: null, isReady: true, isLoading: false });
                }
            },
            login: async (payload) => {
                set({ isLoading: true });
                try {
                    const session = await login(payload);
                    useConfigStore.getState().updateConfig("apiKey", session.token);
                    set({ token: session.token, authMode: "pool", user: session.user, isReady: true, isLoading: false });
                    return session.user;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },
            adminLogin: async (payload) => {
                set({ isLoading: true });
                try {
                    const session = await adminLogin(payload);
                    useConfigStore.getState().updateConfig("apiKey", "");
                    set({ token: session.token, authMode: "admin", user: session.user, isReady: true, isLoading: false });
                    return session.user;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },
        }),
        {
            name: AUTH_TOKEN_KEY,
            partialize: (state) => ({ token: state.token, authMode: state.authMode, user: state.user }),
            onRehydrateStorage: () => (state) => {
                if (state) state.isReady = false;
            },
        },
    ),
);
