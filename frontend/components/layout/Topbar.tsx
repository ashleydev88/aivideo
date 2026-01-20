"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Notifications } from "./Notifications";

interface TopbarProps {
    sidebarCollapsed?: boolean;
    title?: string;
}

export function Topbar({ sidebarCollapsed = false, title = "Dashboard" }: TopbarProps) {
    return (
        <header
            className={cn(
                "fixed top-0 right-0 z-30 h-16 transition-all duration-300",
                "bg-background border-b border-border",
                "flex items-center justify-between px-6",
                sidebarCollapsed ? "left-16" : "left-64"
            )}
        >
            {/* Left: Title & Search */}
            <div className="flex items-center gap-6">
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="w-64 pl-9 h-9"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Notifications />
                <Button variant="ghost" size="icon">
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="h-6 w-px bg-border mx-2" />
                <Button variant="secondary" size="sm">
                    Upgrade
                </Button>
            </div>
        </header>
    );
}
