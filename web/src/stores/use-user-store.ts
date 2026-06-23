"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_TOKEN_KEY, adminLogin, fetchApiKeyStatus, fetchCanvasCurrentUser, login, type AuthPayload, type AuthUser, type BalanceStatus, type CanvasAuthPayload } from "@/services/api/auth";
import { useConfigStore } from "@/stores/use-config-store";
import { firstAvailableImageKey, normalizeImageApiKeys, normalizeImageKeyTier, type ImageApiKeys, type ImageKeyTier } from "@/types/api-keys";

type AuthMode = "pool" | "admin";

let balanceRefreshInFlightKey = "";

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
    refreshBalanceStatus: (tier?: ImageKeyTier) => Promise<BalanceStatus>;
    login: (payload: AuthPayload) => Promise<AuthUser>;
    adminLogin: (payload: CanvasAuthPayload) => Promise<AuthUser>;
};

function resolveTierKey(apiKeys: ImageApiKeys, tier?: ImageKeyTier) {
    const normalizedTier = normalizeImageKeyTier(tier);
    const selectedKey = apiKeys[normalizedTier]?.trim();
    if (selectedKey) return { tier: normalizedTier, apiKey: selectedKey };
    return firstAvailableImageKey(apiKeys);
}

function syncConfigApiKey(apiKeys: ImageApiKeys, fallbackToken: string) {
    const configStore = useConfigStore.getState();
    const selectedTier = normalizeImageKeyTier(configStore.config.imageTier);
    const selected = resolveTierKey(apiKeys, selectedTier);
    configStore.updateConfig("apiKey", selected?.apiKey || fallbackToken || "");
}

function ensureSelectedTier(apiKeys: ImageApiKeys) {
    const configStore = useConfigStore.getState();
    const selectedTier = normalizeImageKeyTier(configStore.config.imageTier);
    if (apiKeys[selectedTier]?.trim()) return;
    const first = firstAvailableImageKey(apiKeys);
    if (first) configStore.updateConfig("imageTier", first.tier);
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
                const fallbackUser = get().user || {
                    id: "pool",
                    username: "\u77e5\u68a6\u7528\u6237",
                    displayName: "\u77e5\u68a6\u7528\u6237",
                    avatarUrl: "",
                    role: "user" as const,
                    credits: 0,
                    quota: 0,
                    used: 0,
                    unlimited: false,
                    remaining: null,
                    balanceStatus: get().balanceStatus,
                    createdAt: "",
                    updatedAt: "",
                };
                set({ user: fallbackUser, apiKeys, balanceStatus: fallbackUser.balanceStatus || get().balanceStatus || "unknown", isReady: true, isLoading: false });
            },
            refreshBalanceStatus: async (tier) => {
                const authMode = get().authMode;
                if (authMode !== "pool") return get().balanceStatus;
                const apiKeys = normalizeImageApiKeys(get().apiKeys);
                const selected = resolveTierKey(apiKeys, tier || useConfigStore.getState().config.imageTier);
                if (!selected) {
                    set({ balanceStatus: "unknown", user: get().user ? { ...get().user!, balanceStatus: "unknown" } : null });
                    return "unknown";
                }
                const refreshKey = `${selected.tier}:${selected.apiKey}`;
                if (balanceRefreshInFlightKey === refreshKey) return get().balanceStatus;
                balanceRefreshInFlightKey = refreshKey;
                set({ balanceStatus: "checking", user: get().user ? { ...get().user!, balanceStatus: "checking", balanceTier: selected.tier } : null });
                try {
                    const status = await fetchApiKeyStatus(selected.apiKey, selected.tier);
                    const nextStatus = status.status;
                    set({
                        balanceStatus: nextStatus,
                        user: get().user
                            ? {
                                  ...get().user!,
                                  displayName: status.name || get().user!.displayName,
                                  username: status.name || get().user!.username,
                                  unlimited: status.unlimited,
                                  remaining: status.totalAvailable,
                                  balanceStatus: nextStatus,
                                  balanceTier: selected.tier,
                              }
                            : null,
                    });
                    return nextStatus;
                } catch {
                    set({ balanceStatus: "unavailable", user: get().user ? { ...get().user!, balanceStatus: "unavailable", balanceTier: selected.tier } : null });
                    return "unavailable";
                } finally {
                    if (balanceRefreshInFlightKey === refreshKey) balanceRefreshInFlightKey = "";
                }
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
