export const IMAGE_KEY_TIERS = ["1k", "2k", "4k"] as const;

export type ImageKeyTier = (typeof IMAGE_KEY_TIERS)[number];

export type ImageApiKeys = Partial<Record<ImageKeyTier, string>>;

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
