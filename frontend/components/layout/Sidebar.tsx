"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    Home,
    Settings,
    Shield,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    LogOut,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
    { label: "Create New", href: "/dashboard/create", icon: <PlusCircle className="h-5 w-5" /> },
    { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-5 w-5" /> },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [userName, setUserName] = React.useState<string>("");
    const [userEmail, setUserEmail] = React.useState<string>("");
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user) {
                const fullName = user.user_metadata?.full_name;
                setUserName(fullName || "User");
                setUserEmail(user.email || "");
            }
            setIsLoading(false);
        };
        getUser();
    }, []);

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col",
                "bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo / Brand */}
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
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
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
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
            <div className="border-t border-sidebar-border p-3 shrink-0">
                <div
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 mb-2",
                        collapsed && "justify-center"
                    )}
                >
                    {isLoading ? (
                        <Skeleton className="h-8 w-8 rounded-full bg-teal-500/20" />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-sidebar-active flex items-center justify-center text-sidebar-active-foreground font-semibold text-sm shrink-0">
                            {getInitials(userName)}
                        </div>
                    )}
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            {isLoading ? (
                                <div className="space-y-1.5">
                                    <Skeleton className="h-3.5 w-24 bg-teal-500/10" />
                                    <Skeleton className="h-2.5 w-32 bg-teal-500/10" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm font-medium truncate">{userName}</p>
                                    <p className="text-xs text-sidebar-muted-foreground truncate">
                                        {userEmail}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-red-500 transition-colors w-full",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
