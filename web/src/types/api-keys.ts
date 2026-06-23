export const IMAGE_KEY_TIERS = ["1k", "2k", "4k"] as const;

export type ImageKeyTier = (typeof IMAGE_KEY_TIERS)[number];

export type ImageApiKeys = Partial<Record<ImageKeyTier, string>>;

export type ImageTokenUsage = {
    expires_at: number;
    model_limits?: Record<string, unknown>;
    model_limits_enabled?: boolean;
    name: string;
    object: "token_usage";
    total_available: number;
    total_granted: number;
    total_used: number;
    unlimited_quota: boolean;
};

export type ImageTokenUsages = Partial<Record<ImageKeyTier, ImageTokenUsage>>;

export const IMAGE_KEY_TIER_LABELS: Record<ImageKeyTier, string> = {
    "1k": "1k",
    "2k": "2k",
    "4k": "4k",
};

export function normalizeImageApiKeys(keys: Partial<Record<ImageKeyTier, string>> | undefined): ImageApiKeys {
    const next: ImageApiKeys = {};
    for (const tier of IMAGE_KEY_TIERS) {
        const value = String(keys?.[tier] || "").trim();
        if (value) next[tier] = value;
    }
    return next;
}

export function firstAvailableImageKey(keys: ImageApiKeys) {
    for (const tier of IMAGE_KEY_TIERS) {
        const apiKey = keys[tier]?.trim();
        if (apiKey) return { tier, apiKey };
    }
    return null;
}

export function normalizeImageKeyTier(value: string | undefined): ImageKeyTier {
    return IMAGE_KEY_TIERS.includes(value as ImageKeyTier) ? (value as ImageKeyTier) : "1k";
}

export function formatImageTokenBalance(usage: ImageTokenUsage | undefined) {
    if (!usage) return "未检测";
    if (usage.unlimited_quota) return "无限额度";
    return `${formatQuota(usage.total_available)} / ${formatQuota(usage.total_granted)}`;
}

function formatQuota(value: number) {
    return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.floor(Number(value) || 0)));
}
