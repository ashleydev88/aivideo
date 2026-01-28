"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, User, CreditCard, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingScreen } from '@/components/ui/loading-screen';
import Cropper from 'react-easy-crop';
import { Slider } from "@/components/ui/slider";
import { Image as ImageIcon, Trash2, Camera } from 'lucide-react';

export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [subscription, setSubscription] = useState<string>("free");

    // Form States
    const [fullName, setFullName] = useState("");
    const [location, setLocation] = useState<"USA" | "UK">("USA");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoCrop, setLogoCrop] = useState<any>(null);
    const [logoZoom, setLogoZoom] = useState(1);
    const [tempLogo, setTempLogo] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUser(user);

                // Set initial form state from metadata
                setFullName(user.user_metadata?.full_name || "");
                setLocation(user.user_metadata?.location_preference || "USA");
                setLogoUrl(user.user_metadata?.logo_url || null);
                setLogoCrop(user.user_metadata?.logo_crop || null);

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

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempLogo(reader.result as string);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            let finalLogoUrl = logoUrl;
            let finalLogoCrop = logoCrop;

            // If there's a new logo being cropped
            if (tempLogo && croppedAreaPixels) {
                // Convert dataUrl to blob
                const response = await fetch(tempLogo);
                const blob = await response.blob();
                const fileName = `logo_${user.id}_${Date.now()}.png`;
                const filePath = `${user.id}/${fileName}`;

                const { data, error: uploadError } = await supabase.storage
                    .from('course-assets')
                    .upload(filePath, blob, { contentType: 'image/png', upsert: true });

                if (uploadError) throw uploadError;

                // For simplicity, we'll store the public URL if it's a public bucket, 
                // but usually we should use getPublicUrl or signed URLs.
                // The backend get_asset_url handles both.
                finalLogoUrl = filePath;
                finalLogoCrop = { ...croppedAreaPixels, zoom: zoom };
            }

            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    location_preference: location,
                    logo_url: finalLogoUrl,
                    logo_crop: finalLogoCrop
                }
            });

            if (error) throw error;

            setLogoUrl(finalLogoUrl);
            setLogoCrop(finalLogoCrop);
            setTempLogo(null);
            setMessage({ text: "Settings updated successfully", type: "success" });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);

        } catch (error: any) {
            console.error("Save error:", error);
            setMessage({ text: error.message || "Failed to update settings", type: "error" });
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

                        {/* LOGO SECTION */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <Camera className="w-5 h-5 text-teal-600" />
                                <label className="text-sm font-medium">Company Logo</label>
                            </div>

                            {!tempLogo && !logoUrl && (
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                                    <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500 mb-4">No logo uploaded yet</p>
                                    <Button variant="outline" size="sm" className="relative">
                                        Upload Logo
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                </div>
                            )}

                            {(tempLogo || logoUrl) && (
                                <div className="space-y-6">
                                    <div className="relative w-full h-[300px] bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                                        <Cropper
                                            image={tempLogo || (logoUrl?.startsWith('http') ? logoUrl : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/course-assets/${logoUrl}`)}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={1}
                                            onCropChange={setCrop}
                                            onCropComplete={onCropComplete}
                                            onZoomChange={setZoom}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-500">Zoom</span>
                                            <span className="text-xs font-medium text-slate-500">{zoom.toFixed(1)}x</span>
                                        </div>
                                        <Slider
                                            value={[zoom]}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            onValueChange={(vals) => setZoom(vals[0])}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="relative">
                                            Change Logo
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                setLogoUrl(null);
                                                setTempLogo(null);
                                                setLogoCrop(null);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Remove
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400 italic">
                                        This logo will appear in the bottom left of the first and last slides of your courses.
                                    </p>
                                </div>
                            )}
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
                        <CardDescription>Customize your AI generation defaults.</CardDescription>
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
