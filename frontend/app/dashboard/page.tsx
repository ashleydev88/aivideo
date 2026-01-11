"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    Video,
    Plus,
    Download,
    Edit,
    Calendar,
    Clock,
    MoreHorizontal,
    Loader2,
    Trash2,
} from "lucide-react";
import { LoadingScreen } from '@/components/ui/loading-screen';

interface Project {
    id: string;
    created_at: string;
    status: string;
    name: string;
    metadata?: {
        duration?: number;
        topics?: any[];
    };
    video_url?: string;
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
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        const getUserAndProjects = async () => {
            try {
                // Use getSession() (cookie-based, instant) instead of getUser() (network call)
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    router.push("/login");
                    return;
                }

                setUser(user);

                // Parallel fetch for courses and profile
                const [coursesResult, profileResult] = await Promise.all([
                    supabase
                        .from("courses")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .single(),
                ]);

                if (coursesResult.error) {
                    console.error("Error fetching projects:", coursesResult.error);
                } else {
                    setProjects(coursesResult.data || []);
                }

                if (profileResult.error) {
                    console.log("Error fetching profile (might be new user lacking profile row):", profileResult.error);
                } else {
                    setProfile(profileResult.data);
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        getUserAndProjects();
    }, [router]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`http://127.0.0.1:8000/course/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (res.ok) {
                setProjects(projects.filter((p) => p.id !== id));
            } else {
                alert("Failed to delete project");
            }
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

    const formatDuration = (metadata: any) => {
        if (!metadata?.duration) return "N/A";
        return `${metadata.duration} min`;
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
                return "bg-teal-100 text-teal-700 border-teal-200";
            case "processing":
            case "generating":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "error":
            case "failed":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    if (loading) {
        return <LoadingScreen message="Loading dashboard..." />;
    }

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
                    {projects.length > 0 && (
                        <Button
                            onClick={() => router.push("/dashboard/create")}
                            className="bg-teal-700 hover:bg-teal-800 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Course
                        </Button>
                    )}
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
                                    <TableHead className="font-semibold text-slate-600">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">
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
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                                    project.status
                                                )}`}
                                            >
                                                {project.status || "Draft"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {project.status === "completed" && project.video_url ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-teal-700"
                                                        onClick={() => {
                                                            // Trigger download or view
                                                            window.open(project.video_url, "_blank");
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-teal-700"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/create?id=${project.id}`
                                                        )
                                                    }
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-700"
                                                    onClick={() => handleDelete(project.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
