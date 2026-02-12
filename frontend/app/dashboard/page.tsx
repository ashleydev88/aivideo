"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Video,
    Plus,
    Download,
    Play,
    Calendar,
    Clock,
    MoreHorizontal,
    Loader2,
    Trash2,
    PlayCircle,
    AlertCircle,
    Edit,
} from "lucide-react";
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useCourseGeneration } from "@/lib/CourseGenerationContext";


interface Project {
    id: string;
    created_at: string;
    status: string;
    name: string;
    metadata?: {
        duration?: number;
        topics?: unknown[];
        failure_notice?: string;
        last_error?: string;
        actual_duration?: number;
        [key: string]: unknown;
    };
    video_url?: string;
    progress?: number;
    progress_phase?: string;
}

interface Profile {
    id: string;
    email: string;
    subscription_level: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const { activeGeneration, clearGeneration } = useCourseGeneration();
    const [queuePositions, setQueuePositions] = useState<Record<string, number | null>>({});
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Rename state
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [courseToRename, setCourseToRename] = useState<Project | null>(null);
    const [newName, setNewName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    // Check if a project is currently being generated


    // Unified fetch function
    const fetchProjects = useCallback(async () => {
        if (!user) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            // Fetch profile and projects
            const [coursesRes, profileRes] = await Promise.all([
                supabase
                    .from("courses")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .order("created_at", { ascending: false }),
                supabase.from("profiles").select("*").eq("id", session.user.id).single(),
            ]);

            if (coursesRes.error) {
                console.error("Error fetching courses:", coursesRes.error);
            } else {
                setProjects(coursesRes.data || []);
                setAccessToken(session.access_token);
            }

            if (profileRes.data) {
                setProfile(profileRes.data);
            }
        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [user, supabase, router]);

    // Initial fetch on mount or user change
    useEffect(() => {
        if (!user) {
            // Get initial user if not set
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    setUser(session.user);
                } else {
                    setLoading(false); // Stop loading if no session properly
                    router.push("/login");
                }
            });
        }
    }, [supabase, router]); // Run once to get user

    // Trigger fetch when user is available
    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, fetchProjects]);

    // Realtime Subscription & Autolink
    useEffect(() => {
        if (!user) return;

        console.log("🔌 Setting up usage subscription for user:", user.id);

        const channel = supabase
            .channel('dashboard-courses')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'courses'
                    // removed filter: `user_id=eq.${user.id}` to rely on RLS and avoid connection issues
                },
                (payload) => {
                    console.log("⚡ Realtime update received:", payload);

                    // Optimistic updates
                    if (payload.eventType === 'INSERT') {
                        // Double check it belongs to us (redundant if RLS works but safe)
                        const newProject = payload.new as Project;
                        // Avoid adding if we already have it (though standard insert shouldn't dup in this logic)
                        setProjects((prev) => {
                            if (prev.find(p => p.id === newProject.id)) return prev;
                            return [newProject, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setProjects((prev) =>
                            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Subscription status: ${status}`);
            });

        // 2. WINDOW FOCUS RE-FETCH
        const handleFocus = () => {
            console.log("👀 Window focused, refreshing projects...");
            fetchProjects();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, supabase, fetchProjects]);

    // 3. GENERATION COMPLETION RE-FETCH
    // When active generation finishes, we want to ensure the list is up to date
    useEffect(() => {
        if (!activeGeneration && !loading) {
            // If generation just cleared, refresh to show new video
            fetchProjects();
        }
    }, [activeGeneration, loading, fetchProjects]);
    // Poll queue positions for queued projects
    useEffect(() => {
        if (!accessToken) return;
        const queued = projects.filter(p => p.status === 'queued');
        if (queued.length === 0) return;

        let stopped = false;

        const fetchQueue = async () => {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const updates: Record<string, number | null> = {};
            await Promise.all(queued.map(async (p) => {
                try {
                    const res = await fetch(`${API_BASE}/api/course/render-status/${p.id}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    updates[p.id] = typeof data.queue_position === 'number' ? data.queue_position : (typeof data.queue_size === 'number' ? data.queue_size : null);
                } catch (e) {
                    // ignore
                }
            }));
            if (!stopped && Object.keys(updates).length) {
                setQueuePositions(prev => ({ ...prev, ...updates }));
            }
        };

        // Initial and interval
        fetchQueue();
        const t = setInterval(fetchQueue, 15000);
        return () => { stopped = true; clearInterval(t); };
    }, [projects, accessToken]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

        try {
            const { error } = await supabase.from("courses").delete().eq("id", id);

            if (error) {
                alert("Failed to delete project");
                console.error("Error deleting project:", error);
            }
            // Realtime subscription will handle the UI update
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatDuration = (metadata: Project["metadata"]) => {
        if (metadata?.actual_duration) {
            const totalSeconds = Math.round(metadata.actual_duration / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (metadata?.duration) return `~${metadata.duration} min`;
        return "N/A";
    };



    if (loading) {
        return <LoadingScreen message="Loading dashboard..." />;
    }

    const handleCopyAndEdit = async (courseId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${API_BASE_URL}/api/course/copy-course/${courseId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) throw new Error("Failed to copy course");

            const data = await res.json();
            router.push(`/dashboard/structure/${data.course_id}`);
        } catch (error) {
            console.error("Error editing course:", error);
            alert("Failed to start editing course.");
        }
    };

    const openRenameDialog = (project: Project) => {
        setCourseToRename(project);
        setNewName(project.name);
        setIsRenameOpen(true);
    };

    const handleRename = async () => {
        if (!courseToRename || !newName.trim()) return;

        setIsRenaming(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${API_BASE_URL}/api/course/course/${courseToRename.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: newName })
            });

            if (!res.ok) throw new Error("Failed to rename course");

            // Optimistic update
            setProjects(prev => prev.map(p =>
                p.id === courseToRename.id ? { ...p, name: newName } : p
            ));

            setIsRenameOpen(false);
        } catch (error) {
            console.error("Error renaming course:", error);
            alert("Failed to rename course");
        } finally {
            setIsRenaming(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Videos
                        </CardTitle>

                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {projects.length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Current Plan
                        </CardTitle>

                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 capitalize">
                            {profile?.subscription_level || 'Free'}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-teal-600 to-teal-700 text-white border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-teal-100">
                            Create New
                        </CardTitle>

                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="secondary"
                            className="w-full bg-white/10 hover:bg-white/20 text-white border-none"
                            onClick={() => router.push("/dashboard/create")}
                        >
                            Start New Course
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Projects */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Recent Projects
                    </h2>
                </div>

                {projects.length === 0 ? (
                    // Empty State
                    <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                <Video className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                No courses created yet
                            </h3>
                            <p className="text-slate-500 max-w-sm mb-8">
                                Get started by creating your first AI-generated compliance
                                training video.
                            </p>
                            <Button
                                onClick={() => router.push("/dashboard/create")}
                                className="bg-teal-700 hover:bg-teal-800 text-white px-8"
                                size="lg"
                            >
                                Create New Course
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    // Projects Table
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">
                                        Title
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600">
                                        Date Created
                                    </TableHead>
                                    <TableHead className="font-semibold text-slate-600">
                                        Duration
                                    </TableHead>

                                    <TableHead className="text-center font-semibold text-slate-600">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-900">
                                            {project.name || "Untitled Course"}
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(project.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatDuration(project.metadata)}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-2">
                                            <div className="relative flex items-center justify-center min-h-[40px]">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* PRIMARY ACTION: Watch Video (Always visible if completed) */}
                                                    {project.status === 'completed' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.push(`/dashboard/player?id=${project.id}`)}
                                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            title="Watch Video"
                                                        >
                                                            <PlayCircle className="h-6 w-6" />
                                                        </Button>
                                                    )}

                                                    {/* REVIEW TOPICS: Primary Action if in this state */}
                                                    {project.status === 'reviewing_topics' && (
                                                        <button
                                                            style={{ backgroundColor: '#f97316', color: 'white' }}
                                                            className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md shadow-sm hover:opacity-90 transition-opacity"
                                                            onClick={() => router.push(`/dashboard/plan/${project.id}`)}
                                                        >
                                                            Review Plan
                                                        </button>
                                                    )}

                                                    {/* REVIEW STRUCTURE: Primary Action if in this state */}
                                                    {project.status === 'reviewing_structure' && (
                                                        <button
                                                            style={{ backgroundColor: '#f97316', color: 'white' }}
                                                            className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md shadow-sm hover:opacity-90 transition-opacity"
                                                            onClick={() => router.push(`/dashboard/structure/${project.id}`)}
                                                        >
                                                            Edit Structure
                                                        </button>
                                                    )}

                                                    {/* PROCESSING STATES */}
                                                    {!['completed', 'reviewing_topics', 'reviewing_structure', 'failed', 'error'].includes(project.status) && (
                                                        <Button variant="ghost" size="sm" disabled className="text-slate-500 min-w-[140px] justify-start">
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-teal-600" />
                                                            {project.status === 'queued' ? (
                                                                `Queued${typeof queuePositions[project.id] === 'number' ? ` (pos ${queuePositions[project.id]} )` : ''}`
                                                            ) : (['rendering', 'processing_render'].includes(project.status)) ? (
                                                                `Rendering ${Math.round(project.progress || 0)}%`
                                                            ) : (
                                                                "Processing"
                                                            )}
                                                        </Button>
                                                    )}

                                                    {/* ERROR STATE */}
                                                    {['failed', 'error'].includes(project.status) && (
                                                        <div className="flex items-center text-red-600 text-xs font-medium mr-2">
                                                            <AlertCircle className="h-4 w-4 mr-1" />
                                                            Failed
                                                        </div>
                                                    )}
                                                </div>

                                                {/* MENU: Edit (Copy) & Delete */}
                                                <div className="absolute right-5">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            {project.status === 'completed' && (
                                                                <DropdownMenuItem onClick={() => handleCopyAndEdit(project.id)}>
                                                                    <Video className="mr-2 h-4 w-4" />
                                                                    <span>Copy & Edit</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => openRenameDialog(project)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                <span>Rename</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(project.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Course Generation Modal - opened from dashboard when clicking on in-progress course */}

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Course</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your course.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Course Name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleRename();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={isRenaming}>
                            {isRenaming ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
