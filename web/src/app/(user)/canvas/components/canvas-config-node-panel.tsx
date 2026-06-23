"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Edit3, Eye, Image as ImageIcon, LoaderCircle, Play } from "lucide-react";
import { App, Button, Empty, Input, Modal } from "antd";

import { ModelPicker } from "@/components/model-picker";
import { FIXED_IMAGE_MODEL, defaultConfig, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import type { NodeGenerationInput } from "./canvas-node-generation";
import type { CanvasNodeData, CanvasNodeMetadata } from "../types";

type CanvasConfigNodePanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    inputSummary: { textCount: number; imageCount: number };
    inputs: NodeGenerationInput[];
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onTextInputChange: (nodeId: string, content: string) => void;
    onGenerate: (nodeId: string) => void;
};

export function CanvasConfigNodePanel({ node, isRunning, inputSummary, inputs, onConfigChange, onTextInputChange, onGenerate }: CanvasConfigNodePanelProps) {
    const { message } = App.useApp();
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = "image";
    const config = buildNodeConfig(globalConfig, node, mode);
    const chipStyle = { background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text };
    const textInputs = inputs.filter((input) => input.type === "text");
    const imageInputs = inputs.filter((input) => input.type === "image");
    const prompt = node.metadata?.prompt || "";
    const promptCount = inputSummary.textCount + (prompt.trim() ? 1 : 0);
    const canGenerate = Boolean(prompt.trim() || inputSummary.textCount);

    const moveInput = (input: NodeGenerationInput, offset: number) => {
        const sameTypeInputs = inputs.filter((item) => item.type === input.type);
        const sameTypeIndex = sameTypeInputs.findIndex((item) => item.nodeId === input.nodeId);
        const targetInput = sameTypeInputs[sameTypeIndex + offset];
        if (!targetInput) return;
        const index = inputs.findIndex((item) => item.nodeId === input.nodeId);
        const targetIndex = inputs.findIndex((item) => item.nodeId === targetInput.nodeId);
        const next = [...inputs];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        onConfigChange(node.id, { inputOrder: next.map((input) => input.nodeId) });
        message.success("???????");
    };
    const startTextEdit = (input: NodeGenerationInput) => {
        setEditingTextId(input.nodeId);
        setEditingText(input.text || "");
    };
    const saveTextEdit = () => {
        if (!editingTextId) return;
        onTextInputChange(editingTextId, editingText);
        setEditingText("");
        setEditingTextId(null);
        message.success("宸蹭繚瀛樻枃鏈彁绀鸿瘝");
    };

    return (
        <div className="flex h-full w-full cursor-move flex-col px-3 pb-3 pt-7 text-sm" style={{ color: theme.node.text }} onWheel={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="shrink-0 text-sm font-semibold">鐢熸垚閰嶇疆</div>
                <div className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs" style={chipStyle}>
                    <ImageIcon className="size-3.5" />
                    鐢熷浘
                </div>
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5" onMouseDown={(event) => event.stopPropagation()}>
                <InputChip label="???" value={`${promptCount} ?`} style={chipStyle} />
                <InputChip label="???" value={`${inputSummary.imageCount} ?`} style={chipStyle} />
                <button type="button" className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px]" style={chipStyle} onClick={() => setPreviewOpen(true)}>
                    <Eye className="size-3.5" />
                    棰勮
                </button>
            </div>

            <div className="mb-2 cursor-default" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <Input.TextArea
                    className="thin-scrollbar !h-[76px] !resize-none !rounded-lg !text-xs !leading-5"
                    value={prompt}
                    disabled={isRunning}
                    placeholder={inputSummary.imageCount ? "杈撳叆缁熶竴鏀瑰浘瑕佹眰锛屾瘮濡傦細鎶婅繖鍑犲紶鍥惧仛鎴?寮犱富鍥撅紝1寮犲浼犲浘" : "杈撳叆鐢熸垚瑕佹眰"}
                    onChange={(event) => onConfigChange(node.id, { prompt: event.target.value })}
                    onPressEnter={(event) => {
                        if (event.shiftKey || event.ctrlKey || event.metaKey) return;
                        event.preventDefault();
                        if (canGenerate && !isRunning) onGenerate(node.id);
                    }}
                />
            </div>

            <div className="mb-2 grid min-w-0 cursor-default grid-cols-[minmax(0,1fr)_148px] items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
                <ModelPicker className="canvas-compact-control h-10" config={config} value={FIXED_IMAGE_MODEL} onChange={() => undefined} onMissingConfig={() => openConfigDialog(true)} fullWidth />
                {mode === "image" ? (
                    <CanvasImageSettingsPopover config={config} placement="topRight" autoAdjustOverflow={false} buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2" onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })} />
                ) : null}
            </div>

            <Button
                type="primary"
                className="mt-auto !h-9 !w-full !cursor-pointer !rounded-lg"
                disabled={isRunning || !canGenerate}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onGenerate(node.id)}
            >
                <span className="inline-flex items-center gap-1.5">
                    {isRunning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                    <span>????</span>
                </span>
            </Button>
            <Modal
                title="杈撳叆棰勮"
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={null}
                centered
                width={860}
                mask={{ closable: true }}
                keyboard
                destroyOnHidden
                modalRender={(modal) => (
                    <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                        {modal}
                    </div>
                )}
            >
                <div onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onWheelCapture={(event) => event.stopPropagation()}>
                    {inputs.length ? (
                        <div className="flex h-[min(66vh,580px)] flex-col gap-3 overflow-hidden">
                            <div className="shrink-0">
                                <PreviewSection title="?????" count={imageInputs.length} empty="???????">
                                    <div className="thin-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                                        {imageInputs.map((input, index) => (
                                            <ImageSortCard key={input.nodeId} input={input} imageIndex={index} imageTotal={imageInputs.length} inputs={inputs} theme={theme} onMove={moveInput} />
                                        ))}
                                    </div>
                                </PreviewSection>
                            </div>
                            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
                                <div className="thin-scrollbar min-h-0 overflow-y-auto pr-1.5">
                                    <PreviewSection title="?????" count={textInputs.length} empty="???????">
                                        <div className="space-y-1.5">
                                            {textInputs.map((input, index) => (
                                                <TextSortCard key={input.nodeId} input={input} textIndex={index} textTotal={textInputs.length} inputs={inputs} theme={theme} onMove={moveInput} onEdit={startTextEdit} />
                                            ))}
                                        </div>
                                    </PreviewSection>
                                </div>
                                <div className="flex min-h-0 flex-col rounded-xl border p-2.5" style={{ background: theme.node.fill, borderColor: theme.node.stroke }}>
                                    {editingTextId ? (
                                        <>
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-sm font-semibold">???????</div>
                                                <Button size="small" type="text" onClick={() => setEditingTextId(null)}>
                                                    鏀惰捣
                                                </Button>
                                            </div>
                                            <Input.TextArea className="thin-scrollbar !flex-1 !resize-none !text-xs !leading-5" value={editingText} onChange={(event) => setEditingText(event.target.value)} />
                                            <div className="mt-2 flex justify-end gap-2">
                                                <Button size="small" onClick={() => setEditingTextId(null)}>
                                                    鍙栨秷
                                                </Button>
                                                <Button size="small" type="primary" onClick={saveTextEdit}>
                                                    淇濆瓨
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex h-full flex-col justify-center rounded-xl border border-dashed px-4 text-center text-xs leading-5 opacity-45" style={{ borderColor: theme.node.stroke }}>
                                            <Edit3 className="mx-auto mb-2 size-5" />
                                            閫夋嫨涓€鏉℃枃鏈悗鍦ㄨ繖閲岀紪杈?                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="鏆傛棤鎻愮ず璇嶆垨鍙傝€冨浘" className="py-8" />
                    )}
                </div>
            </Modal>
        </div>
    );
}

function PreviewSection({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
    return (
        <section>
            <div className="sticky top-0 z-10 mb-1 flex items-center justify-between px-0.5 py-0.5 backdrop-blur-sm">
                <div className="text-xs font-semibold">{title}</div>
                <div className="text-[11px] opacity-50">{count} ?</div>
            </div>
            {count ? children : <div className="rounded-xl border border-dashed px-3 py-5 text-center text-xs opacity-45">{empty}</div>}
        </section>
    );
}

function TextSortCard({
    input,
    textIndex,
    textTotal,
    inputs,
    theme,
    onMove,
    onEdit,
}: {
    input: NodeGenerationInput;
    textIndex: number;
    textTotal: number;
    inputs: NodeGenerationInput[];
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    onMove: (input: NodeGenerationInput, offset: number) => void;
    onEdit: (input: NodeGenerationInput) => void;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-1.5 rounded-md border px-2 py-1" style={{ background: `${theme.node.fill}99`, borderColor: theme.node.stroke }}>
            <div className="min-w-0">
                <div className="truncate text-[10px] font-medium opacity-50">鏂囨湰 {textIndex + 1}</div>
                <div className="line-clamp-1 whitespace-pre-wrap break-words text-[11px] leading-4 opacity-80">{input.text}</div>
            </div>
            <div className="flex justify-end gap-1">
                <Button size="small" className="!h-6 !w-6 !min-w-6 !p-0" icon={<Edit3 className="size-3" />} onClick={() => onEdit(input)} />
                <VerticalOrderButtons index={textIndex} total={textTotal} onMove={(offset) => onMove(input, offset)} />
            </div>
        </div>
    );
}

function ImageSortCard({
    input,
    imageIndex,
    imageTotal,
    inputs,
    theme,
    onMove,
}: {
    input: NodeGenerationInput;
    imageIndex: number;
    imageTotal: number;
    inputs: NodeGenerationInput[];
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    onMove: (input: NodeGenerationInput, offset: number) => void;
}) {
    if (!input.image) return null;
    return (
        <div className="w-24 shrink-0 overflow-hidden rounded-lg border" style={{ background: theme.node.fill, borderColor: theme.node.stroke }}>
            <div className="relative">
                <img src={input.image.dataUrl} alt={input.title} className="aspect-square w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[9px] font-medium text-white">{imageIndex + 1}</span>
                <HorizontalOrderButtons index={imageIndex} total={imageTotal} onMove={(offset) => onMove(input, offset)} />
            </div>
        </div>
    );
}

function VerticalOrderButtons({ index, total, onMove }: { index: number; total: number; onMove: (offset: number) => void }) {
    return (
        <>
            <Button size="small" className="!h-6 !w-6 !min-w-6 !p-0" icon={<ArrowUp className="size-3" />} disabled={index <= 0} onClick={() => onMove(-1)} />
            <Button size="small" className="!h-6 !w-6 !min-w-6 !p-0" icon={<ArrowDown className="size-3" />} disabled={index >= total - 1} onClick={() => onMove(1)} />
        </>
    );
}

function HorizontalOrderButtons({ index, total, onMove }: { index: number; total: number; onMove: (offset: number) => void }) {
    return (
        <div className="absolute inset-x-1 bottom-1 flex justify-between">
            <Button size="small" className="!h-6 !w-6 !min-w-6 !rounded-full !bg-white/85 !p-0 !shadow-sm" icon={<ArrowLeft className="size-3" />} disabled={index <= 0} onClick={() => onMove(-1)} />
            <Button size="small" className="!h-6 !w-6 !min-w-6 !rounded-full !bg-white/85 !p-0 !shadow-sm" icon={<ArrowRight className="size-3" />} disabled={index >= total - 1} onClick={() => onMove(1)} />
        </div>
    );
}

function InputChip({ label, value, style }: { label: string; value: string; style: CSSProperties }) {
    return (
        <div className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px]" style={style}>
            <span>{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode): AiConfig {
    const defaultModel = mode === "image" ? globalConfig.imageModel : mode === "video" ? globalConfig.videoModel : globalConfig.textModel;
    return {
        ...globalConfig,
        model: node.metadata?.model || defaultModel || globalConfig.model || defaultConfig.model,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        imageTier: node?.metadata?.imageTier || globalConfig.imageTier || defaultConfig.imageTier,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        count: String(node.metadata?.count || globalConfig.count || defaultConfig.count),
    };
}



