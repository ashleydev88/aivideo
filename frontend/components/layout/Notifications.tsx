"use client";

import * as React from "react";
import { Bell, CheckCircle, FileText, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NotificationItem {
    id: string;
    type: "topics" | "structure" | "completed" | "error";
    title: string;
    time: string;
    link: string;
}

export function Notifications() {
    const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const supabase = createClient();
    const router = useRouter();

    React.useEffect(() => {
        setMounted(true);
        const fetchNotifications = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            try {
                const { data: courses, error } = await supabase
                    .from("courses")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Error fetching courses from DB:", error);
                    return;
                }

                if (!courses) return;

                const newNotifications: NotificationItem[] = [];

                courses.forEach((course: any) => {
                    if (course.metadata?.failure_notice) {
                        newNotifications.push({
                            id: course.id,
                            type: "error",
                            title: `Generation Failed: ${course.name || 'Untitled'}`,
                            time: course.metadata.failed_at ? new Date(course.metadata.failed_at * 1000).toLocaleDateString() : new Date().toLocaleDateString(),
                            link: `/dashboard/structure/${course.id}`, // Assuming revert to structure
                        });
                    }

                    if (course.status === "reviewing_topics") {
                        newNotifications.push({
                            id: course.id,
                            type: "topics",
                            title: `Topics ready for: ${course.name}`,
                            time: new Date(course.created_at).toLocaleDateString(),
                            link: `/dashboard/plan/${course.id}`,
                        });
                    } else if (course.status === "reviewing_structure") {
                        newNotifications.push({
                            id: course.id,
                            type: "structure",
                            title: `Structure ready for: ${course.name}`,
                            time: new Date(course.created_at).toLocaleDateString(),
                            link: `/dashboard/structure/${course.id}`,
                        });
                    } else if (course.status === "completed") {
                        // Check if already viewed
                        const isViewed = course.metadata?.viewed_result === true;
                        if (!isViewed) {
                            newNotifications.push({
                                id: course.id,
                                type: "completed",
                                title: `Video ready: ${course.name}`,
                                time: new Date(course.created_at).toLocaleDateString(),
                                link: `/dashboard/player?id=${course.id}`,
                            });
                        }
                    }
                });

                setNotifications(newNotifications);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };

        fetchNotifications();

        // Optional: Poll for updates
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    const handleNotificationClick = (link: string) => {
        setOpen(false);
        router.push(link);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                            {notifications.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Notifications</h4>
                    {notifications.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {notifications.length} new
                        </span>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                            <Bell className="mb-2 h-8 w-8 opacity-20" />
                            <p>No new notifications</p>
                            <p className="text-xs">
                                Check "Recent Projects" for history
                            </p>
                        </div>
                    ) : (
                        <div className="grid">
                            {notifications.map((notification) => (
                                <button
                                    key={`${notification.id}-${notification.type}`}
                                    className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 last:border-0"
                                    onClick={() => handleNotificationClick(notification.link)}
                                >
                                    <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                                        {notification.type === "topics" && <FileText className="h-4 w-4" />}
                                        {notification.type === "structure" && <FileText className="h-4 w-4" />}
                                        {notification.type === "completed" && <Video className="h-4 w-4" />}
                                        {notification.type === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium leading-none">
                                            {notification.title}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {notification.time}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
