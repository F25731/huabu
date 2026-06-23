"use client";

import { useEffect } from "react";
import { App, Button, Form, Input, Modal } from "antd";
import Link from "next/link";

import { ModelPicker } from "@/components/model-picker";
import { FIXED_IMAGE_MODEL, useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import { formatImageTokenBalance, imageTokenBalancePercent, IMAGE_KEY_TIERS, IMAGE_KEY_TIER_LABELS, isImageTokenUnlimited, type ImageApiKeys, type ImageTokenUsage } from "@/types/api-keys";

type ApiKeyFormValues = {
    apiKey1k?: string;
    apiKey2k?: string;
    apiKey4k?: string;
};

export function AppConfigModal() {
    const { message } = App.useApp();
    const [form] = Form.useForm<ApiKeyFormValues>();
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const isConfigOpen = useConfigStore((state) => state.isConfigOpen);
    const shouldPromptContinue = useConfigStore((state) => state.shouldPromptContinue);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const clearPromptContinue = useConfigStore((state) => state.clearPromptContinue);
    const user = useUserStore((state) => state.user);
    const apiKeys = useUserStore((state) => state.apiKeys);
    const apiKeyUsages = useUserStore((state) => state.apiKeyUsages);
    const login = useUserStore((state) => state.login);
    const isLoading = useUserStore((state) => state.isLoading);
    const refreshApiKeyUsages = useUserStore((state) => state.refreshApiKeyUsages);
    const modelConfig = { ...config, model: FIXED_IMAGE_MODEL, imageModel: FIXED_IMAGE_MODEL, textModel: FIXED_IMAGE_MODEL, models: [FIXED_IMAGE_MODEL] };

    useEffect(() => {
        if (!isConfigOpen) return;
        form.setFieldsValue({
            apiKey1k: apiKeys["1k"] || "",
            apiKey2k: apiKeys["2k"] || "",
            apiKey4k: apiKeys["4k"] || "",
        });
    }, [apiKeys, form, isConfigOpen]);

    const saveApiKeys = async () => {
        const values = form.getFieldsValue();
        const nextApiKeys: ImageApiKeys = {
            "1k": values.apiKey1k?.trim() || "",
            "2k": values.apiKey2k?.trim() || "",
            "4k": values.apiKey4k?.trim() || "",
        };
        if (!nextApiKeys["1k"] && !nextApiKeys["2k"] && !nextApiKeys["4k"]) {
            message.warning("请至少填写一个知梦 API Key");
            return;
        }
        try {
            await login({ apiKeys: nextApiKeys });
            message.success("API Key 已保存");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "API Key 检测失败");
        }
    };

    const refreshBalance = async () => {
        try {
            await refreshApiKeyUsages();
            message.success("余额已刷新");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "余额刷新失败");
        }
    };

    const finishConfig = () => {
        setConfigDialogOpen(false);
        updateConfig("model", FIXED_IMAGE_MODEL);
        updateConfig("imageModel", FIXED_IMAGE_MODEL);
        updateConfig("textModel", FIXED_IMAGE_MODEL);
        updateConfig("models", [FIXED_IMAGE_MODEL]);
        if (config.channelMode !== "local") updateConfig("channelMode", "local");
        message.success(shouldPromptContinue ? "配置已保存，请继续刚才的请求" : "配置已保存");
        clearPromptContinue();
    };

    return (
        <Modal
            title={
                <div>
                    <div className="text-lg font-semibold">配置</div>
                    <div className="mt-1 text-xs font-normal text-stone-500">生图固定走知梦 API 号池</div>
                </div>
            }
            open={isConfigOpen}
            width={760}
            centered
            onCancel={() => setConfigDialogOpen(false)}
            footer={
                <Button type="primary" onClick={finishConfig}>
                    完成
                </Button>
            }
        >
            <div className="pt-1">
                <Form form={form} layout="vertical" requiredMark={false}>
                    <div className="mb-4 rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-800">
                        <div className="font-medium">当前账号</div>
                        <div className="mt-1 text-xs text-stone-500">{user ? `${user.displayName || user.username}` : "请先登录知梦 Key"}</div>
                        {!user ? (
                            <Link href="/login" className="mt-2 inline-flex text-xs font-medium text-stone-950 underline-offset-4 hover:underline dark:text-stone-100" onClick={() => setConfigDialogOpen(false)}>
                                去登录
                            </Link>
                        ) : null}
                    </div>
                    <div className="mb-4 rounded-lg border border-stone-200 px-3 py-3 dark:border-stone-800">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium">知梦 API Key</div>
                                <div className="mt-1 text-xs text-stone-500">保存时会通过当前站点模型接口检测 Key；余额可单独刷新。</div>
                            </div>
                            <Button size="small" onClick={refreshBalance} disabled={!Object.keys(apiKeys).length}>
                                刷新余额
                            </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            {IMAGE_KEY_TIERS.map((tier) => (
                                <div key={tier} className="min-w-0">
                                    <Form.Item name={`apiKey${tier}` as keyof ApiKeyFormValues} label={`${IMAGE_KEY_TIER_LABELS[tier]} API Key`} className="mb-0" style={{ marginBottom: 0 }}>
                                        <Input.Password autoComplete="off" placeholder="sk-..." />
                                    </Form.Item>
                                    <div className="mt-4">
                                        <TokenBalanceProgress usage={apiKeyUsages[tier]} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5">
                            <Button type="default" loading={isLoading} onClick={saveApiKeys}>
                                保存 Key
                            </Button>
                        </div>
                    </div>
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-800">
                        <div className="min-w-0">
                            <div className="text-sm font-medium">生图模型</div>
                            <div className="mt-1 text-xs text-stone-500">固定使用 {FIXED_IMAGE_MODEL}</div>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label="默认生图模型" className="mb-4">
                            <ModelPicker config={modelConfig} value={FIXED_IMAGE_MODEL} onChange={() => undefined} fullWidth />
                        </Form.Item>
                        <Form.Item label="默认文本模型" className="mb-4">
                            <ModelPicker config={modelConfig} value={FIXED_IMAGE_MODEL} onChange={() => undefined} fullWidth />
                        </Form.Item>
                    </div>
                    <Form.Item label="系统提示词" className="mb-0">
                        <Input.TextArea rows={3} value={config.systemPrompt} placeholder="例如：你是一位擅长电影感写实摄影的视觉导演。" onChange={(event) => updateConfig("systemPrompt", event.target.value)} />
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
}

function TokenBalanceProgress({ usage }: { usage?: ImageTokenUsage }) {
    const percent = imageTokenBalancePercent(usage);
    const balanceText = formatImageTokenBalance(usage);
    const unlimited = isImageTokenUnlimited(usage);
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                <span>余额</span>
                <span className="truncate font-medium text-stone-600 dark:text-stone-300">{balanceText}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <div className={unlimited ? "h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" : "h-full rounded-full bg-emerald-500"} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
