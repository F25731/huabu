import { apiGet, apiPost } from "@/services/api/request";
import { firstAvailableImageKey, normalizeImageApiKeys, type ImageApiKeys, type ImageKeyTier } from "@/types/api-keys";

export const AUTH_TOKEN_KEY = "infinite-canvas-auth-token-v1";

export type UserRole = "guest" | "user" | "admin";
export type BalanceStatus = "unknown" | "checking" | "available" | "unavailable";

export type AuthUser = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    role: UserRole;
    credits: number;
    quota: number;
    used: number;
    unlimited: boolean;
    remaining: number | null;
    balanceStatus?: BalanceStatus;
    balanceTier?: ImageKeyTier;
    createdAt: string;
    updatedAt: string;
};

export type AuthSession = {
    token: string;
    user: AuthUser;
    apiKeys?: ImageApiKeys;
};

export type AuthPayload = {
    apiKey?: string;
    apiKeys?: ImageApiKeys;
};

export type CanvasAuthPayload = {
    username: string;
    password: string;
};

function createPoolUser(tier: ImageKeyTier): AuthUser {
    const displayName = "知梦用户";
    return {
        id: tier,
        username: displayName,
        displayName,
        avatarUrl: "",
        role: "user",
        credits: 0,
        quota: 0,
        used: 0,
        unlimited: true,
        remaining: null,
        balanceStatus: "unknown",
        balanceTier: tier,
        createdAt: "",
        updatedAt: "",
    };
}

export async function login(payload: AuthPayload) {
    const apiKeys = normalizeImageApiKeys({ ...payload.apiKeys, "1k": payload.apiKeys?.["1k"] || payload.apiKey });
    const firstKey = firstAvailableImageKey(apiKeys);
    if (!firstKey) throw new Error("请至少输入一个知梦 API Key");
    return { token: firstKey.apiKey, user: createPoolUser(firstKey.tier), apiKeys };
}

export async function adminLogin(payload: CanvasAuthPayload) {
    return apiPost<AuthSession>("/api/admin/login", payload);
}

export async function fetchCanvasCurrentUser(token?: string) {
    return apiGet<AuthUser>("/api/auth/me", undefined, token);
}
