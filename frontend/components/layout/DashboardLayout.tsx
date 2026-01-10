"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeHref?: string;
    pageTitle?: string;
}

export function DashboardLayout({
    children,
    activeHref = "/",
    pageTitle = "Dashboard",
}: DashboardLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                activeHref={activeHref}
            />

            {/* Topbar */}
            <Topbar sidebarCollapsed={sidebarCollapsed} title={pageTitle} />

            {/* Main Content */}
            <main
                className={cn(
                    "pt-16 min-h-screen transition-all duration-300",
                    sidebarCollapsed ? "pl-16" : "pl-64"
                )}
            >
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
