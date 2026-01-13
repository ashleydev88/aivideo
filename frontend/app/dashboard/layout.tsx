"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CourseGenerationProvider } from "@/lib/CourseGenerationContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    return (
        <CourseGenerationProvider>
            <div className="min-h-screen bg-background">
                {/* Sidebar */}
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                {/* Topbar */}
                <Topbar sidebarCollapsed={sidebarCollapsed} title="Dashboard" />

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
        </CourseGenerationProvider>
    );
}
