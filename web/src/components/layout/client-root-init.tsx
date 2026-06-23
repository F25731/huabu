"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

export function ClientRootInit({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login" || pathname === "/zhimengapi/login";
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // 加载公共设置
        void useConfigStore.getState().loadPublicSettings();

        // 非登录页面时恢复用户状态
        if (!isLoginPage) {
            void useUserStore.getState().hydrateUser();
        }
    }, [isLoginPage]);

    return <>{children}</>;
}
