"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    Home,
    FileText,
    Settings,
    Users,
    Shield,
    BarChart3,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: <Home className="h-5 w-5" /> },
    { label: "Documents", href: "/documents", icon: <FileText className="h-5 w-5" /> },
    { label: "Compliance", href: "/compliance", icon: <Shield className="h-5 w-5" /> },
    { label: "Reports", href: "/reports", icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Users", href: "/users", icon: <Users className="h-5 w-5" /> },
    { label: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
    activeHref?: string;
}

export function Sidebar({ collapsed = false, onToggle, activeHref = "/" }: SidebarProps) {
    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300",
                "bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo / Brand */}
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-sidebar-active" />
                        <span className="text-lg font-semibold tracking-tight">
                            Comply<span className="text-sidebar-active">Pro</span>
                        </span>
                    </div>
                )}
                {collapsed && (
                    <Shield className="h-6 w-6 text-sidebar-active mx-auto" />
                )}
                <button
                    onClick={onToggle}
                    className={cn(
                        "p-1.5 rounded-[var(--radius)] hover:bg-sidebar-muted transition-colors",
                        collapsed && "mx-auto"
                    )}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => {
                    const isActive = activeHref === item.href;
                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-all duration-200",
                                "text-sm font-medium",
                                isActive
                                    ? "bg-slate-800 text-teal-500"
                                    : "text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground",
                                collapsed && "justify-center px-2"
                            )}
                        >
                            {item.icon}
                            {!collapsed && <span>{item.label}</span>}
                        </a>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-3">
                <div
                    className={cn(
                        "flex items-center gap-3 px-3 py-2",
                        collapsed && "justify-center"
                    )}
                >
                    <div className="h-8 w-8 rounded-full bg-sidebar-active flex items-center justify-center text-sidebar-active-foreground font-semibold text-sm">
                        JD
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">John Doe</p>
                            <p className="text-xs text-sidebar-muted-foreground truncate">
                                Admin
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
