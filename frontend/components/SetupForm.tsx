"use client";
import { useState } from 'react';
import { Upload, Clock, Palette, Play } from 'lucide-react';

export default function SetupForm({ onStart, isLoading }: { onStart: (file: File, duration: number, style: string) => void, isLoading: boolean }) {
    const [duration, setDuration] = useState(3);
    const [style, setStyle] = useState("Minimalist Vector");
    const [file, setFile] = useState<File | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

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
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                    Create New Course
                </h1>
                <p className="text-slate-500 text-lg">Turn your policy documents into engaging video training.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Duration & File */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <label className="flex items-center gap-2 text-lg font-bold mb-4 text-slate-800">
                            <Clock size={20} className="text-teal-700" /> Course Duration
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[3, 5, 10, 15, 20].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setDuration(m)}
                                    className={`py-2 px-4 rounded-lg font-medium transition-all
                                        ${duration === m ? 'bg-teal-700 text-white shadow-md scale-105' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                >
                                    {m} Mins
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <label className="flex items-center gap-2 text-lg font-bold mb-4 text-slate-800">
                            <Upload size={20} className="text-teal-700" /> Policy Document
                        </label>
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFile}
                                accept=".pdf,.docx,.txt"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all group-hover:bg-slate-50
                                ${file ? 'border-teal-500 bg-teal-50' : 'border-slate-300'}`}>
                                {file ? (
                                    <div className="text-teal-700 font-medium truncate">{file.name}</div>
                                ) : (
                                    <div className="text-slate-500">
                                        <p className="font-medium">Drop PDF or DOCX here</p>
                                        <p className="text-xs mt-2 text-slate-400">or click to browse</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Style */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <label className="flex items-center gap-2 text-lg font-bold mb-4 text-slate-800">
                        <Palette size={20} className="text-teal-700" /> Visual Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar content-start">
                        {styles.map(s => (
                            <button
                                key={s.name}
                                onClick={() => setStyle(s.name)}
                                className={`relative group overflow-hidden rounded-xl border-2 transition-all text-left flex flex-col h-[180px]
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
                                    <span className="font-bold text-white text-sm">
                                        {s.name}
                                    </span>
                                </div>

                                {/* Selection Indicator */}
                                {style === s.name && (
                                    <div className="absolute top-3 right-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-6">
                <button
                    onClick={() => file && onStart(file, duration, style)}
                    disabled={!file || isLoading}
                    className="flex items-center gap-3 bg-teal-700 hover:bg-teal-800 text-white px-10 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {isLoading ? "Analyzing Policy..." : "Start Planning"}
                    {!isLoading && <Play fill="currentColor" size={20} />}
                </button>
            </div>
        </div>
    );
}
