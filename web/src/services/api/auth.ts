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

    // 验证API Key是否有效
    await validateApiKey(firstKey.apiKey);

    return { token: firstKey.apiKey, user: createPoolUser(firstKey.tier), apiKeys };
}

async function validateApiKey(apiKey: string) {
    try {
        const axios = (await import("axios")).default;
        const baseUrl = "https://api.zmoapi.cn";
        const response = await axios.get(`${baseUrl}/v1/models`, {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            timeout: 10000,
            validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error("API Key 无效或已失效");
        }

        if (response.status >= 500) {
            throw new Error("API 服务暂时不可用，请稍后重试");
        }

        if (response.status !== 200) {
            throw new Error(`API 连接失败 (状态码: ${response.status})`);
        }

        // 检查返回数据格式
        if (!response.data || typeof response.data !== "object") {
            throw new Error("API 返回数据格式异常");
        }

        return true;
    } catch (error) {
        if (error instanceof Error && error.message.includes("API")) {
            throw error;
        }
        if ((error as any).code === "ECONNABORTED") {
            throw new Error("API 连接超时，请检查网络");
        }
        if ((error as any).code === "ENOTFOUND" || (error as any).code === "ECONNREFUSED") {
            throw new Error("无法连接到 API 服务器");
        }
        throw new Error("API Key 验证失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
}

export async function adminLogin(payload: CanvasAuthPayload) {
    return apiPost<AuthSession>("/api/admin/login", payload);
}

export async function fetchCanvasCurrentUser(token?: string) {
    return apiGet<AuthUser>("/api/auth/me", undefined, token);
}
