"use client";

import { KeyRound } from "lucide-react";
import { App, Button, Form, Input } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useUserStore } from "@/stores/use-user-store";

type LoginFormValues = {
    apiKey: string;
};

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const { message } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const login = useUserStore((state) => state.login);
    const isLoading = useUserStore((state) => state.isLoading);
    const redirect = searchParams.get("redirect") || "/";

    const submit = async (values: LoginFormValues) => {
        try {
            await login({ apiKey: values.apiKey });
            message.success("登录成功");
            router.replace(redirect.startsWith("/") ? redirect : "/");
            router.refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "登录失败");
        }
    };

    return (
        <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-6 py-10 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)]">
            <section className="w-full max-w-[420px]">
                <div className="mb-7 text-center">
                    <span
                        className="mx-auto mb-4 block size-12 bg-stone-950 dark:bg-stone-100"
                        style={{
                            mask: "url(/logo.svg) center / contain no-repeat",
                            WebkitMask: "url(/logo.svg) center / contain no-repeat",
                        }}
                        aria-label="知梦画布"
                    />
                    <h1 className="text-3xl font-semibold tracking-normal text-stone-950 dark:text-stone-100">号池 Key 登录</h1>
                    <p className="mt-3 text-base leading-7 text-stone-500 dark:text-stone-400">输入你的知梦 API 号池 Key，额度和权限全部以号池为准。</p>
                </div>

                <Form<LoginFormValues> layout="vertical" size="large" requiredMark={false} onFinish={submit}>
                    <Form.Item name="apiKey" label={<span className="font-medium text-stone-800 dark:text-stone-200">号池 Key</span>} rules={[{ required: true, message: "请输入号池 Key" }]}>
                        <Input.Password prefix={<KeyRound className="size-4 text-stone-400" />} autoComplete="off" placeholder="sk-..." />
                    </Form.Item>
                    <Button block type="primary" htmlType="submit" loading={isLoading}>
                        登录
                    </Button>
                </Form>
            </section>
        </main>
    );
}
