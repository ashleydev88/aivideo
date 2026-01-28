"use client";
import { useState, useRef, useEffect } from 'react';
import { Upload, Clock, Palette, Play, FileText, PenTool, Sparkles, Paintbrush } from 'lucide-react';

// Curated brand-friendly color palette
const COLOR_PALETTE = [
    { name: "teal", hex: "#14b8a6", label: "Teal" },
    { name: "blue", hex: "#3b82f6", label: "Blue" },
    { name: "indigo", hex: "#6366f1", label: "Indigo" },
    { name: "purple", hex: "#a855f7", label: "Purple" },
    { name: "pink", hex: "#ec4899", label: "Pink" },
    { name: "red", hex: "#ef4444", label: "Red" },
    { name: "orange", hex: "#f97316", label: "Orange" },
    { name: "green", hex: "#22c55e", label: "Green" },
];

export default function SetupForm({ onStart, isLoading }: { onStart: (title: string, file: File, duration: number, style: string, accentColor: string, colorName: string) => void, isLoading: boolean }) {
    const [method, setMethod] = useState<'policy' | 'script' | 'topic' | null>(null);
    const [title, setTitle] = useState("");
    const [duration, setDuration] = useState<number | null>(null);
    const [style, setStyle] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    // Track selected colors per style (with defaults matching backend)
    const [selectedColors, setSelectedColors] = useState<Record<string, { hex: string, name: string }>>({
        "Minimalist Vector": { hex: "#14b8a6", name: "teal" },
        "Photo Realistic": { hex: "#3b82f6", name: "blue" },
        "Sophisticated Watercolour": { hex: "#0ea5e9", name: "sky blue" },
    });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleComingSoon = () => alert("This feature is coming soon!");

    // Close color picker when clicking outside
    useEffect(() => {
        // Fetch user metadata for visual preference
        const fetchPrefs = async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.visual_preference) {
                const pref = user.user_metadata.visual_preference;
                if (["Minimalist Vector", "Photo Realistic", "Sophisticated Watercolour"].includes(pref)) {
                    setStyle(pref);
                }
            }
        };
        fetchPrefs();

        const handleClickOutside = (e: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
                setColorPickerOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const styles = [
        {
            name: "Minimalist Vector",
            image: "https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Minimalist%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL01pbmltYWxpc3Qgc2FtcGxlLndlYnAiLCJpYXQiOjE3NjgxMjQ0MDQsImV4cCI6NDkyMTcyNDQwNH0.G14g7yUmnkHyvyJOWPCBrok-jfBd-QG5XhxxXEn3EL0"
        },
        {
            name: "Photo Realistic",
            image: "https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Photo%20realistic%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL1Bob3RvIHJlYWxpc3RpYyBzYW1wbGUud2VicCIsImlhdCI6MTc2ODEyNDU2NSwiZXhwIjo0OTIxNzI0NTY1fQ.aDoO2jXmUg4_5KYntb8HPv8_y73pR2oLZaexBYpMf0Q"
        },
        {
            name: "Sophisticated Watercolour",
            image: "https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Tech%20isometric%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL1RlY2ggaXNvbWV0cmljIHNhbXBsZS53ZWJwIiwiaWF0IjoxNzY4MTI0NTk1LCJleHAiOjQ5MjE3MjQ1OTV9.-uCEwrWH2-aq8cawlSV-rAxtdEry4ab83hwYSyusbVk"
        },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
            {/* Step 1: Selection Header (Not a Card) */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    Where do you want to start?
                </h2>
                <p className="text-slate-500">
                    Choose how you want to build your compliance training video.
                </p>
            </div>

            {/* Step 1: Option Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in duration-500">
                {/* Card A: Policy Upload */}
                <div
                    onClick={() => setMethod('policy')}
                    className={`p-6 rounded-xl border transition-all cursor-pointer group
                        ${method === 'policy'
                            ? 'ring-2 ring-teal-500 bg-teal-50 border-teal-500 shadow-md'
                            : 'bg-white border-slate-200 hover:border-teal-500 shadow-sm'}`}
                >
                    <div className="flex flex-col gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors
                            ${method === 'policy' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-600'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Policy</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Turn your policy or process document into a compliant, engaging video.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card B: Paste Script */}
                <div
                    className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm opacity-70 relative overflow-hidden"
                >
                    <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            Coming Soon
                        </span>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                            <PenTool size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-400 mb-1">Paste Script</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Have a script ready? Paste it here and let our AI visualise it.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card C: Topic */}
                <div
                    className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm opacity-70 relative overflow-hidden"
                >
                    <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            Coming Soon
                        </span>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-400 mb-1">Generate from Topic</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                No policy? No problem. Enter the topic to generate a best-practice training video.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Policy Upload & Title (Conditional) */}
            {method === 'policy' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <label className="flex items-center gap-2 text-lg font-bold mb-6 text-slate-800">
                            <PenTool size={20} className="text-teal-700" /> Course Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Annual Cybersecurity Awareness 2024"
                            className="w-full p-4 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-lg font-medium"
                        />
                    </div>

                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <label className="flex items-center gap-2 text-lg font-bold mb-6 text-slate-800">
                            <Upload size={20} className="text-teal-700" /> Policy Document
                        </label>
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFile}
                                accept=".pdf,.docx,.txt"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-all group-hover:bg-slate-50
                                ${file ? 'border-teal-500 bg-teal-50' : 'border-slate-300'}`}>
                                {file ? (
                                    <div className="text-teal-700 font-medium truncate text-lg">{file.name}</div>
                                ) : (
                                    <div className="text-slate-500">
                                        <p className="font-semibold text-lg">Drop PDF or DOCX here</p>
                                        <p className="text-sm mt-2 text-slate-400">or click to browse your files</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Course Duration (Conditional) */}
            {file && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="flex items-center gap-2 text-lg font-bold mb-6 text-slate-800">
                        <Clock size={20} className="text-teal-700" /> Course Duration
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                        {[1, 3, 5, 10, 15, 20].map(m => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className={`py-3 px-4 rounded-lg font-medium transition-all
                                    ${duration === m
                                        ? (m === 1
                                            ? 'bg-amber-500 text-white shadow-md scale-105'
                                            : 'bg-teal-700 text-white shadow-md scale-105')
                                        : (m === 1
                                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}
                            >
                                {m} Min{m === 1 ? ' (dev)' : 's'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 4: Visual Style (Conditional) */}
            {duration && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="flex items-center gap-2 text-lg font-bold mb-6 text-slate-800">
                        <Palette size={20} className="text-teal-700" /> Visual Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {styles.map(s => (
                            <div key={s.name} className="relative">
                                <button
                                    onClick={() => setStyle(s.name)}
                                    className={`relative group overflow-hidden rounded-xl border-2 transition-all text-left flex flex-col h-[160px] w-full
                                        ${style === s.name ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-lg scale-[1.02]' : 'border-slate-100 hover:border-slate-300 shadow-sm'}`}
                                >
                                    {/* Background Image */}
                                    <div className="absolute inset-0">
                                        <img
                                            src={s.image}
                                            alt={s.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className={`absolute inset-0 transition-opacity duration-300
                                            ${style === s.name ? 'bg-teal-900/40' : 'bg-slate-900/20 group-hover:bg-slate-900/40'}`}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="relative mt-auto p-4 w-full bg-gradient-to-t from-slate-900/80 to-transparent flex items-center justify-between">
                                        <span className="font-bold text-white text-xs">
                                            {s.name}
                                        </span>
                                        {/* Color indicator */}
                                        <div
                                            className="w-4 h-4 rounded-full border-2 border-white/50 shadow-sm"
                                            style={{ backgroundColor: selectedColors[s.name]?.hex || '#14b8a6' }}
                                        />
                                    </div>

                                    {/* Selection Indicator */}
                                    {style === s.name && (
                                        <div className="absolute top-2 left-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </button>

                                {/* Color Picker Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setColorPickerOpen(colorPickerOpen === s.name ? null : s.name);
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
                                    style={{ backgroundColor: selectedColors[s.name]?.hex || '#14b8a6' }}
                                    title="Choose accent color"
                                >
                                    <Paintbrush size={14} className="text-white" />
                                </button>

                                {/* Color Picker Popover */}
                                {colorPickerOpen === s.name && (
                                    <div
                                        ref={colorPickerRef}
                                        className="absolute top-10 right-0 z-20 bg-white rounded-lg shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <div className="text-xs font-medium text-slate-500 mb-2">Accent Color</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLOR_PALETTE.map(color => (
                                                <button
                                                    key={color.hex}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedColors(prev => ({
                                                            ...prev,
                                                            [s.name]: { hex: color.hex, name: color.name }
                                                        }));
                                                        setColorPickerOpen(null);
                                                    }}
                                                    className={`w-7 h-7 rounded-full transition-all hover:scale-110 flex items-center justify-center
                                                        ${selectedColors[s.name]?.hex === color.hex ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                                                    style={{ backgroundColor: color.hex }}
                                                    title={color.label}
                                                >
                                                    {selectedColors[s.name]?.hex === color.hex && (
                                                        <div className="w-2 h-2 bg-white rounded-full" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 5: Submit Button (Conditional) */}
            {style && title && file && (
                <div className="flex justify-center pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                        onClick={() => file && duration && style && onStart(
                            title,
                            file,
                            duration,
                            style,
                            selectedColors[style]?.hex || '#14b8a6',
                            selectedColors[style]?.name || 'teal'
                        )}
                        disabled={isLoading}
                        className="flex items-center gap-4 bg-teal-700 hover:bg-teal-800 text-white px-12 py-5 rounded-full font-bold text-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? "Analyzing Policy..." : "Start Planning"}
                        {!isLoading && <Play fill="currentColor" size={24} />}
                    </button>
                </div>
            )}
        </div>
    );
}
