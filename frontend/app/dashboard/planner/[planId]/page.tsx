"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, CheckCircle2, Clock, ArrowUp, ArrowDown, Save, Split, Combine } from "lucide-react";

interface PlannerModule {
    id: string;
    title: string;
    status: string;
    effective_status?: string;
    order_index: number;
    estimated_minutes: number;
    objective_focus?: string[];
    source_course_id?: string | null;
    linked_course?: {
        id: string;
        status?: string;
        progress?: number;
        video_url?: string;
    } | null;
}

interface PlannerStatusResponse {
    plan: {
        id: string;
        name: string;
        status: string;
        progress_percent: number;
        recommended_format: "single_video" | "multi_video_course";
    };
    modules: PlannerModule[];
}

export default function PlannerOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const planId = params.planId as string;
    const [loading, setLoading] = useState(true);
    const [startingModuleId, setStartingModuleId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PlannerStatusResponse | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [draftModules, setDraftModules] = useState<PlannerModule[]>([]);
    const [isSavingPlan, setIsSavingPlan] = useState(false);

    const fetchStatus = useCallback(async (token: string) => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiBase}/api/course/planner/${planId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.detail || "Failed to fetch planner status");
        setData(payload);
        setDraftModules(payload.modules || []);
    }, [planId]);

    useEffect(() => {
        const init = async () => {
            try {
                const { data: auth } = await supabase.auth.getSession();
                const token = auth.session?.access_token;
                if (!token) {
                    router.push("/login");
                    return;
                }
                setAccessToken(token);
                await fetchStatus(token);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to load planner");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [fetchStatus, router, supabase]);

    useEffect(() => {
        if (!accessToken) return;
        const interval = setInterval(() => {
            fetchStatus(accessToken).catch(() => {});
        }, 5000);
        return () => clearInterval(interval);
    }, [accessToken, fetchStatus]);

    const nextStartableModule = useMemo(
        () => data?.modules.find((m) => (m.effective_status || m.status) === "not_started") || null,
        [data]
    );

    const startModule = async (moduleId: string) => {
        if (!accessToken) return;
        setStartingModuleId(moduleId);
        setError(null);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const res = await fetch(`${apiBase}/api/course/planner/${planId}/modules/${moduleId}/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.detail || "Failed to start module generation");
            await fetchStatus(accessToken);
            router.push("/dashboard");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to start module");
        } finally {
            setStartingModuleId(null);
        }
    };

    const moveModule = (index: number, direction: "up" | "down") => {
        setDraftModules((prev) => {
            const next = [...prev];
            const target = direction === "up" ? index - 1 : index + 1;
            if (target < 0 || target >= next.length) return prev;
            const tmp = next[index];
            next[index] = next[target];
            next[target] = tmp;
            return next.map((m, i) => ({ ...m, order_index: i + 1 }));
        });
    };

    const updateDraftTitle = (moduleId: string, title: string) => {
        setDraftModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
    };

    const splitModule = (moduleId: string) => {
        setDraftModules((prev) => {
            const idx = prev.findIndex((m) => m.id === moduleId);
            if (idx < 0) return prev;
            const source = prev[idx];
            const leftMinutes = Math.max(1, Math.floor((source.estimated_minutes || 5) / 2));
            const rightMinutes = Math.max(1, (source.estimated_minutes || 5) - leftMinutes);
            const first: PlannerModule = {
                ...source,
                title: `${source.title} (Part 1)`,
                estimated_minutes: leftMinutes,
            };
            const second: PlannerModule = {
                ...source,
                id: `${source.id}-split-${Date.now()}`,
                title: `${source.title} (Part 2)`,
                estimated_minutes: rightMinutes,
                source_course_id: null,
                linked_course: null,
                status: "not_started",
                effective_status: "not_started",
            };
            const next = [...prev.slice(0, idx), first, second, ...prev.slice(idx + 1)];
            return next.map((m, i) => ({ ...m, order_index: i + 1 }));
        });
    };

    const mergeWithNext = (moduleId: string) => {
        setDraftModules((prev) => {
            const idx = prev.findIndex((m) => m.id === moduleId);
            if (idx < 0 || idx >= prev.length - 1) return prev;
            const first = prev[idx];
            const second = prev[idx + 1];
            const merged: PlannerModule = {
                ...first,
                title: `${first.title} + ${second.title}`,
                estimated_minutes: (first.estimated_minutes || 5) + (second.estimated_minutes || 5),
                objective_focus: [...(first.objective_focus || []), ...(second.objective_focus || [])],
                source_course_id: null,
                linked_course: null,
                status: "not_started",
                effective_status: "not_started",
            };
            const next = [...prev.slice(0, idx), merged, ...prev.slice(idx + 2)];
            return next.map((m, i) => ({ ...m, order_index: i + 1 }));
        });
    };

    const savePlanEdits = async () => {
        if (!accessToken || !data) return;
        setIsSavingPlan(true);
        setError(null);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const modulesPayload = draftModules.map((m) => ({
                title: m.title,
                objective_focus: m.objective_focus || [],
                estimated_minutes: m.estimated_minutes || 5,
            }));
            const res = await fetch(`${apiBase}/api/course/planner/${planId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    modules: modulesPayload,
                }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.detail || "Failed to save planner edits");
            await fetchStatus(accessToken);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save planner edits");
        } finally {
            setIsSavingPlan(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4">
                <Card>
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{data.plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 space-y-1">
                    <div>Status: <span className="font-medium text-slate-900">{data.plan.status}</span></div>
                    <div>Recommended format: <span className="font-medium text-slate-900">{data.plan.recommended_format.replace("_", " ")}</span></div>
                    <div>Progress: <span className="font-medium text-slate-900">{data.plan.progress_percent}%</span></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle>Course Modules</CardTitle>
                        <Button size="sm" variant="outline" onClick={savePlanEdits} disabled={isSavingPlan}>
                            {isSavingPlan ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-1" />
                            )}
                            Save Plan
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {draftModules.map((m, index) => {
                        const status = m.effective_status || m.status;
                        const canStart = nextStartableModule?.id === m.id && status === "not_started";
                        return (
                            <div key={m.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">{m.order_index}.</span>
                                        <input
                                            value={m.title}
                                            onChange={(e) => updateDraftTitle(m.id, e.target.value)}
                                            disabled={status === "in_progress" || status === "published"}
                                            className="border rounded px-2 py-1 text-sm w-[320px] max-w-full disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveModule(index, "up")}
                                            disabled={index === 0 || status === "in_progress" || status === "published"}
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveModule(index, "down")}
                                            disabled={index === draftModules.length - 1 || status === "in_progress" || status === "published"}
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => splitModule(m.id)}
                                            disabled={status === "in_progress" || status === "published"}
                                            title="Split module"
                                        >
                                            <Split className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => mergeWithNext(m.id)}
                                            disabled={index === draftModules.length - 1 || status === "in_progress" || status === "published"}
                                            title="Merge with next"
                                        >
                                            <Combine className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{m.estimated_minutes} min</span>
                                        <span>Status: {status}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {status === "published" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => m.source_course_id && router.push(`/dashboard/player?id=${m.source_course_id}`)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Open
                                        </Button>
                                    )}
                                    {canStart && (
                                        <Button
                                            size="sm"
                                            onClick={() => startModule(m.id)}
                                            disabled={startingModuleId === m.id}
                                        >
                                            {startingModuleId === m.id ? (
                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4 mr-1" />
                                            )}
                                            Generate
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
