import axios from "axios";

import { apiGet, apiPost } from "@/services/api/request";
import { buildPoolApiUrl } from "@/stores/use-config-store";
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

type TokenUsageResponse = {
    code?: boolean;
    success?: boolean;
    message?: string;
    msg?: string;
    data?: {
        name?: string;
        total_available?: number;
        total_granted?: number;
        total_used?: number;
        unlimited_quota?: boolean;
        expires_at?: number;
    };
};

export type ApiKeyStatus = {
    status: BalanceStatus;
    tier?: ImageKeyTier;
    name?: string;
    unlimited: boolean;
    totalAvailable: number | null;
    message?: string;
};

function tokenUsageToAuthUser(apiKeyStatus: ApiKeyStatus): AuthUser {
    const displayName = apiKeyStatus.name || "知梦用户";
    return {
        id: apiKeyStatus.tier || "pool",
        username: displayName,
        displayName,
        avatarUrl: "",
        role: "user",
        credits: 0,
        quota: 0,
        used: 0,
        unlimited: apiKeyStatus.unlimited,
        remaining: apiKeyStatus.totalAvailable,
        balanceStatus: apiKeyStatus.status,
        balanceTier: apiKeyStatus.tier,
        createdAt: "",
        updatedAt: "",
    };
}

function readPoolError(error: unknown) {
    if (axios.isAxiosError<{ detail?: { error?: string }; error?: { message?: string }; msg?: string; message?: string }>(error)) {
        const data = error.response?.data;
        return data?.detail?.error || data?.error?.message || data?.msg || data?.message || (error.response?.status ? `号池校验失败：${error.response.status}` : "号池连接失败");
    }
    return error instanceof Error ? error.message : "号池连接失败";
}

export async function login(payload: AuthPayload) {
    const apiKeys = normalizeImageApiKeys({ ...payload.apiKeys, "1k": payload.apiKeys?.["1k"] || payload.apiKey });
    const firstKey = firstAvailableImageKey(apiKeys);
    if (!firstKey) throw new Error("请至少输入一个知梦 API Key");
    const status = await fetchApiKeyStatus(firstKey.apiKey, firstKey.tier);
    const user = tokenUsageToAuthUser(status);
    return { token: firstKey.apiKey, user, apiKeys };
}

export async function adminLogin(payload: CanvasAuthPayload) {
    return apiPost<AuthSession>("/api/admin/login", payload);
}

export async function fetchCanvasCurrentUser(token?: string) {
    return apiGet<AuthUser>("/api/auth/me", undefined, token);
}

export async function fetchCurrentUser(token?: string) {
    const apiKey = String(token || "").trim();
    if (!apiKey) throw new Error("请先登录");
    try {
        return tokenUsageToAuthUser(await fetchApiKeyStatus(apiKey));
    } catch (error) {
        throw new Error(readPoolError(error));
    }
}

export async function fetchApiKeyStatus(apiKey: string, tier?: ImageKeyTier): Promise<ApiKeyStatus> {
    const token = apiKey.trim();
    if (!token) throw new Error("请先输入 API Key");
    try {
        const response = await axios.get<TokenUsageResponse>(buildPoolApiUrl("/api/usage/token/"), {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true,
        });
        const data = response.data;
        if (response.status < 200 || response.status >= 300 || data?.code !== true || !data.data) {
            throw new Error(data?.message || data?.msg || "API Key 无效");
        }
        const totalAvailable = typeof data.data.total_available === "number" ? data.data.total_available : null;
        const unlimited = Boolean(data.data.unlimited_quota);
        return {
            status: unlimited || Number(totalAvailable || 0) > 0 ? "available" : "unavailable",
            tier,
            name: data.data.name,
            unlimited,
            totalAvailable,
            message: data.message,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const data = error.response?.data as TokenUsageResponse | undefined;
            throw new Error(data?.message || data?.msg || "API Key 状态查询失败");
        }
        throw error;
    }
}
