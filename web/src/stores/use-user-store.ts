"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_TOKEN_KEY, adminLogin, fetchCanvasCurrentUser, login, type AuthPayload, type AuthUser, type BalanceStatus, type CanvasAuthPayload } from "@/services/api/auth";
import { useConfigStore } from "@/stores/use-config-store";
import { firstAvailableImageKey, normalizeImageApiKeys, normalizeImageKeyTier, type ImageApiKeys } from "@/types/api-keys";

type AuthMode = "pool" | "admin";

type UserStore = {
    token: string;
    apiKeys: ImageApiKeys;
    authMode: AuthMode;
    user: AuthUser | null;
    balanceStatus: BalanceStatus;
    isReady: boolean;
    isLoading: boolean;
    setSession: (token: string, user: AuthUser, authMode?: AuthMode, apiKeys?: ImageApiKeys) => void;
    clearSession: () => void;
    hydrateUser: () => Promise<void>;
    login: (payload: AuthPayload) => Promise<AuthUser>;
    adminLogin: (payload: CanvasAuthPayload) => Promise<AuthUser>;
};

function resolveTierKey(apiKeys: ImageApiKeys) {
    const configStore = useConfigStore.getState();
    const selectedTier = normalizeImageKeyTier(configStore.config.imageTier);
    const selectedKey = apiKeys[selectedTier]?.trim();
    if (selectedKey) return { tier: selectedTier, apiKey: selectedKey };
    return firstAvailableImageKey(apiKeys);
}

function syncConfigApiKey(apiKeys: ImageApiKeys, fallbackToken: string) {
    const selected = resolveTierKey(apiKeys);
    useConfigStore.getState().updateConfig("apiKey", selected?.apiKey || fallbackToken || "");
}

function ensureSelectedTier(apiKeys: ImageApiKeys) {
    const configStore = useConfigStore.getState();
    const selectedTier = normalizeImageKeyTier(configStore.config.imageTier);
    if (apiKeys[selectedTier]?.trim()) return;
    const first = firstAvailableImageKey(apiKeys);
    if (first) configStore.updateConfig("imageTier", first.tier);
}

function createStoredPoolUser(existingUser: AuthUser | null, balanceStatus: BalanceStatus): AuthUser {
    if (existingUser) return { ...existingUser, unlimited: true, remaining: null, balanceStatus: existingUser.balanceStatus || balanceStatus || "unknown" };
    return {
        id: "pool",
        username: "知梦用户",
        displayName: "知梦用户",
        avatarUrl: "",
        role: "user",
        credits: 0,
        quota: 0,
        used: 0,
        unlimited: true,
        remaining: null,
        balanceStatus: balanceStatus || "unknown",
        createdAt: "",
        updatedAt: "",
    };
}

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            token: "",
            apiKeys: {},
            authMode: "pool",
            user: null,
            balanceStatus: "unknown",
            isReady: false,
            isLoading: false,
            setSession: (token, user, authMode = "pool", apiKeys = {}) => {
                const normalizedKeys = authMode === "pool" ? normalizeImageApiKeys({ ...apiKeys, "1k": apiKeys["1k"] || token }) : {};
                ensureSelectedTier(normalizedKeys);
                syncConfigApiKey(normalizedKeys, authMode === "pool" ? token : "");
                set({ token, apiKeys: normalizedKeys, user, authMode, balanceStatus: user.balanceStatus || "unknown", isReady: true });
            },
            clearSession: () => {
                useConfigStore.getState().updateConfig("apiKey", "");
                set({ token: "", apiKeys: {}, authMode: "pool", user: null, balanceStatus: "unknown", isReady: true });
            },
            hydrateUser: async () => {
                const token = get().token;
                const authMode = get().authMode;
                const apiKeys = normalizeImageApiKeys(get().apiKeys);
                if (!token) {
                    set({ user: null, balanceStatus: "unknown", isReady: true, isLoading: false });
                    return;
                }
                if (authMode === "admin") {
                    set({ isLoading: true });
                    try {
                        const user = await fetchCanvasCurrentUser(token);
                        set({ user, apiKeys: {}, balanceStatus: "unknown", isReady: true, isLoading: false });
                    } catch {
                        set({ token: "", apiKeys: {}, authMode: "pool", user: null, balanceStatus: "unknown", isReady: true, isLoading: false });
                    }
                    return;
                }
                ensureSelectedTier(apiKeys);
                syncConfigApiKey(apiKeys, token);
                const fallbackUser = createStoredPoolUser(get().user, get().balanceStatus);
                set({ user: fallbackUser, apiKeys, balanceStatus: fallbackUser.balanceStatus || "unknown", isReady: true, isLoading: false });
            },
            login: async (payload) => {
                set({ isLoading: true });
                try {
                    const session = await login(payload);
                    const apiKeys = normalizeImageApiKeys(session.apiKeys);
                    ensureSelectedTier(apiKeys);
                    syncConfigApiKey(apiKeys, session.token);
                    set({ token: session.token, apiKeys, authMode: "pool", user: session.user, balanceStatus: session.user.balanceStatus || "unknown", isReady: true, isLoading: false });
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
                    set({ token: session.token, apiKeys: {}, authMode: "admin", user: session.user, balanceStatus: "unknown", isReady: true, isLoading: false });
                    return session.user;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },
        }),
        {
            name: AUTH_TOKEN_KEY,
            partialize: (state) => ({ token: state.token, apiKeys: state.apiKeys, authMode: state.authMode, user: state.user, balanceStatus: state.balanceStatus }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isReady = false;
                    if (!state.apiKeys || !Object.keys(state.apiKeys).length) {
                        state.apiKeys = state.token ? { "1k": state.token } : {};
                    }
                }
            },
        },
    ),
);
