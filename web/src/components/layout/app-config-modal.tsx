"use client";

import { App, Button, Form, Input, Modal } from "antd";
import Link from "next/link";

import { ModelPicker } from "@/components/model-picker";
import { FIXED_IMAGE_MODEL, useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

export function AppConfigModal() {
    const { message } = App.useApp();
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const isConfigOpen = useConfigStore((state) => state.isConfigOpen);
    const shouldPromptContinue = useConfigStore((state) => state.shouldPromptContinue);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const clearPromptContinue = useConfigStore((state) => state.clearPromptContinue);
    const user = useUserStore((state) => state.user);
    const modelConfig = { ...config, model: FIXED_IMAGE_MODEL, imageModel: FIXED_IMAGE_MODEL, textModel: FIXED_IMAGE_MODEL, models: [FIXED_IMAGE_MODEL] };

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
                <Form layout="vertical" requiredMark={false}>
                    <div className="mb-4 rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-800">
                        <div className="font-medium">当前账号</div>
                        <div className="mt-1 text-xs text-stone-500">{user ? `${user.displayName || user.username} · 额度 ${user.unlimited ? "无限" : user.remaining ?? user.credits}` : "请先登录号池 Key"}</div>
                        {!user ? (
                            <Link href="/login" className="mt-2 inline-flex text-xs font-medium text-stone-950 underline-offset-4 hover:underline dark:text-stone-100" onClick={() => setConfigDialogOpen(false)}>
                                去登录
                            </Link>
                        ) : null}
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
