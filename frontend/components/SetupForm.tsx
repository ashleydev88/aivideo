"use client";
import { useState } from 'react';
import { Upload, Clock, Palette, Play, FileText, PenTool, Sparkles } from 'lucide-react';

export default function SetupForm({ onStart, isLoading }: { onStart: (file: File, duration: number, style: string) => void, isLoading: boolean }) {
    const [method, setMethod] = useState<'policy' | 'script' | 'topic' | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [style, setStyle] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleComingSoon = () => alert("This feature is coming soon!");

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
            name: "Tech Isometric",
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

            {/* Step 2: Policy Upload (Conditional) */}
            {method === 'policy' && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            )}

            {/* Step 3: Course Duration (Conditional) */}
            {file && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="flex items-center gap-2 text-lg font-bold mb-6 text-slate-800">
                        <Clock size={20} className="text-teal-700" /> Course Duration
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[3, 5, 10, 15, 20].map(m => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className={`py-3 px-4 rounded-lg font-medium transition-all
                                    ${duration === m ? 'bg-teal-700 text-white shadow-md scale-105' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >
                                {m} Mins
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
                            <button
                                key={s.name}
                                onClick={() => setStyle(s.name)}
                                className={`relative group overflow-hidden rounded-xl border-2 transition-all text-left flex flex-col h-[160px]
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
                                <div className="relative mt-auto p-4 w-full bg-gradient-to-t from-slate-900/80 to-transparent">
                                    <span className="font-bold text-white text-xs">
                                        {s.name}
                                    </span>
                                </div>

                                {/* Selection Indicator */}
                                {style === s.name && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 5: Submit Button (Conditional) */}
            {style && (
                <div className="flex justify-center pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                        onClick={() => file && duration && style && onStart(file, duration, style)}
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
