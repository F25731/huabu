import axios from "axios";

import { apiGet, apiPost } from "@/services/api/request";
import { buildPoolApiUrl } from "@/stores/use-config-store";

export const AUTH_TOKEN_KEY = "infinite-canvas-auth-token-v1";

export type UserRole = "guest" | "user" | "admin";

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
    createdAt: string;
    updatedAt: string;
};

export type AuthSession = {
    token: string;
    user: AuthUser;
};

export type AuthPayload = {
    apiKey: string;
};

export type CanvasAuthPayload = {
    username: string;
    password: string;
};

type PoolIdentity = {
    id: string;
    name?: string;
    role: "admin" | "user";
    quota: number;
    used: number;
    unlimited: boolean;
    remaining: number | null;
};

type PoolMeResponse = {
    identity: PoolIdentity;
};

function toAuthUser(identity: PoolIdentity): AuthUser {
    const displayName = String(identity.name || (identity.role === "admin" ? "管理员" : "号池用户"));
    const credits = identity.unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, Number(identity.remaining ?? identity.quota - identity.used) || 0);
    return {
        id: identity.id || "admin",
        username: displayName,
        displayName,
        avatarUrl: "",
        role: identity.role,
        credits,
        quota: Number(identity.quota) || 0,
        used: Number(identity.used) || 0,
        unlimited: Boolean(identity.unlimited),
        remaining: identity.remaining,
        createdAt: "",
        updatedAt: "",
    };
}

function readPoolError(error: unknown) {
    if (axios.isAxiosError<{ detail?: { error?: string }; error?: { message?: string }; msg?: string }>(error)) {
        const data = error.response?.data;
        return data?.detail?.error || data?.error?.message || data?.msg || (error.response?.status ? `号池校验失败：${error.response.status}` : "号池连接失败");
    }
    return error instanceof Error ? error.message : "号池连接失败";
}

export async function login(payload: AuthPayload) {
    const token = payload.apiKey.trim();
    if (!token) throw new Error("请输入号池 Key");
    const user = await fetchCurrentUser(token);
    return { token, user };
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
        const response = await axios.get<PoolMeResponse>(buildPoolApiUrl("/api/auth/me"), {
            headers: { Authorization: `Bearer ${apiKey}` },
            validateStatus: () => true,
        });
        if (response.status < 200 || response.status >= 300 || !response.data?.identity) {
            const payload = response.data as unknown as { detail?: { error?: string }; error?: { message?: string }; msg?: string };
            throw new Error(payload?.detail?.error || payload?.error?.message || payload?.msg || "号池 Key 无效");
        }
        return toAuthUser(response.data.identity);
    } catch (error) {
        throw new Error(readPoolError(error));
    }
}
