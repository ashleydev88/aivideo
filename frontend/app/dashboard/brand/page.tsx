"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Image as ImageIcon, Trash2, Camera, Palette } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { SketchPicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function BrandPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Form States
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoCrop, setLogoCrop] = useState<any>(null);
    const [tempLogo, setTempLogo] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);

    // Brand Color
    const [brandColor, setBrandColor] = useState<string>('#0d9488'); // Default teal

    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUser(user);

                // 1. Fetch Logo from metadata (legacy/standard location)
                const storedLogoPath = user.user_metadata?.logo_url;
                setLogoUrl(storedLogoPath || null);
                const storedCrop = user.user_metadata?.logo_crop || null;
                setLogoCrop(storedCrop);
                if (storedCrop?.zoom) setZoom(storedCrop.zoom);

                // Resolve Signed URL if logo exists
                if (storedLogoPath && !storedLogoPath.startsWith('http')) {
                    const { data } = await supabase.storage
                        .from('logos')
                        .createSignedUrl(storedLogoPath, 3600); // 1 hour link

                    if (data?.signedUrl) {
                        setResolvedLogo(data.signedUrl);
                    } else {
                        // Fallback check in course-assets if migration isn't 100% or old logo
                        // But since we are moving to new system, we might prioritize logos bucket.
                        // Let's try to resolve from course-assets if logos failed (optional legacy support)
                        const { data: legacyData } = await supabase.storage
                            .from('course-assets')
                            .createSignedUrl(storedLogoPath, 3600);
                        if (legacyData?.signedUrl) setResolvedLogo(legacyData.signedUrl);
                    }
                } else if (storedLogoPath) {
                    setResolvedLogo(storedLogoPath);
                }

                // 2. Fetch Brand Colour from profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('brand_colour')
                    .eq('id', user.id)
                    .single();

                if (profile?.brand_colour) {
                    setBrandColor(profile.brand_colour);
                }

            } catch (error) {
                console.error("Error loading brand settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempLogo(reader.result as string);
                setResolvedLogo(null); // Clear resolved, show temp
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            let finalLogoUrl = logoUrl;
            let finalLogoCrop = { ...(logoCrop || {}), zoom: zoom };

            // 1. Handle Logo Upload
            if (tempLogo) {
                const response = await fetch(tempLogo);
                const blob = await response.blob();
                const fileName = `logo_${user.id}_${Date.now()}.png`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, blob, { contentType: 'image/png', upsert: true });

                if (uploadError) throw uploadError;

                finalLogoUrl = filePath;
                finalLogoCrop = { zoom: zoom };

                // Get signed URL for immediate display update
                const { data: signedData } = await supabase.storage
                    .from('logos')
                    .createSignedUrl(filePath, 3600);

                if (signedData?.signedUrl) {
                    setResolvedLogo(signedData.signedUrl);
                }
            }

            // 2. Update User Metadata (Logo)
            // We keep logo in metadata as per existing pattern for now, unless instructed otherwise.
            const { error: metadataError } = await supabase.auth.updateUser({
                data: {
                    logo_url: finalLogoUrl,
                    logo_crop: finalLogoCrop
                }
            });
            if (metadataError) throw metadataError;

            // 3. Update Profiles Table (Brand Colour)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ brand_colour: brandColor })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setLogoUrl(finalLogoUrl);
            setLogoCrop(finalLogoCrop);
            setTempLogo(null);
            setMessage({ text: "Brand settings updated successfully", type: "success" });

            setTimeout(() => setMessage(null), 3000);

        } catch (error: any) {
            console.error("Save error:", error);
            setMessage({ text: error.message || "Failed to update settings", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Brand</h1>
                <p className="text-slate-500">Manage your brand identity, logo, and colors.</p>
            </div>

            <div className="grid gap-6">

                {/* LOGO SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-teal-600" />
                            <CardTitle>Logo</CardTitle>
                        </div>
                        <CardDescription>Upload your company logo. This will appear on the bottom right of all slides.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                <div className="relative w-full h-[200px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                                    <img
                                        src={tempLogo || resolvedLogo || ''}
                                        alt="Logo preview"
                                        style={{
                                            maxWidth: '80%',
                                            maxHeight: '80%',
                                            objectFit: 'contain',
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'center',
                                            transition: 'transform 0.2s ease'
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-500">Logo Size on Slides</span>
                                        <span className="text-xs font-medium text-slate-500">{zoom.toFixed(1)}x</span>
                                    </div>
                                    <Slider
                                        value={[zoom]}
                                        min={0.5}
                                        max={2}
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
                                            setResolvedLogo(null);
                                            setLogoCrop(null);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* BRAND COLORS SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-teal-600" />
                            <CardTitle>Brand Colors</CardTitle>
                        </div>
                        <CardDescription>Select a primary color for your slides. This will be used for backgrounds and accents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <label className="text-sm font-medium leading-none">Primary Slide Colour</label>
                            <div className="flex items-center gap-4">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="w-16 h-16 rounded-lg border-2 border-slate-200 shadow-sm transition-transform hover:scale-105"
                                            style={{ backgroundColor: brandColor }}
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-none shadow-xl">
                                        <SketchPicker
                                            color={brandColor}
                                            onChange={(color) => setBrandColor(color.hex)}
                                            disableAlpha
                                        />
                                    </PopoverContent>
                                </Popover>
                                <div className="text-sm">
                                    <p className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block mb-1">{brandColor}</p>
                                    <p className="text-slate-500">Click the square to pick a color.</p>
                                </div>
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
        </div>
    );
}
