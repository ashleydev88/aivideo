"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, User, CreditCard, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingScreen } from '@/components/ui/loading-screen';


export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<string>("free");

    // Form States
    const [fullName, setFullName] = useState("");
    const [location, setLocation] = useState<"USA" | "UK">("UK");
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUser(user);

                // Set initial form state from metadata
                setFullName(user.user_metadata?.full_name || "");
                setLocation(user.user_metadata?.location_preference || "UK");

                // Fetch Profile for subscription
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_level')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setSubscription(profile.subscription_level || 'free');
                }

            } catch (error) {
                console.error("Error loading settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);



    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    location_preference: location
                }
            });

            if (error) throw error;

            if (error) throw error;

            setMessage({ text: "Settings updated successfully", type: "success" });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);

        } catch (error: unknown) {
            console.error("Save error:", error);
            setMessage({ text: error instanceof Error ? error.message : "Failed to update settings", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingScreen message="Loading settings..." />;
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your profile, subscription, and preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* PROFILE SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-teal-600" />
                            <CardTitle>Profile Information</CardTitle>
                        </div>
                        <CardDescription>Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Full Name
                            </label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                                className="max-w-md"
                            />
                        </div>
                        <div className="pt-2">
                            <p className="text-sm text-slate-500">Email: {user?.email}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* SUBSCRIPTION SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-teal-600" />
                            <CardTitle>Subscription</CardTitle>
                        </div>
                        <CardDescription>Manage your current plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 max-w-md">
                            <div>
                                <p className="font-semibold text-slate-900 capitalize">{subscription} Plan</p>
                                <p className="text-sm text-slate-500">
                                    {subscription === 'pro'
                                        ? "You have access to all premium features."
                                        : "Upgrade to unlock more features."}
                                </p>
                            </div>
                            {subscription !== 'pro' && (
                                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                                    Upgrade to Pro
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* PREFERENCES SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-teal-600" />
                            <CardTitle>Preferences</CardTitle>
                        </div>
                        <CardDescription>Customise your AI generation defaults.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Default Location</label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="w-60">This determines the language variations and default region (jurisdiction) used for legal contexts and compliance rules in your generated content.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            {/* Location Toggle UI from Create Page */}
                            <div className="flex items-center bg-slate-100 rounded-full p-1 w-fit border border-slate-200">
                                <button
                                    onClick={() => setLocation("USA")}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-sm font-bold ${location === "USA"
                                        ? "bg-white text-teal-700 shadow-sm ring-1 ring-black/5"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <span className="text-base">🇺🇸</span> USA
                                </button>
                                <button
                                    onClick={() => setLocation("UK")}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-sm font-bold ${location === "UK"
                                        ? "bg-white text-teal-700 shadow-sm ring-1 ring-black/5"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <span className="text-base">🇬🇧</span> UK
                                </button>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* SAVE ACTION */}
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>

                    {message && (
                        <div className={`flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-left-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
