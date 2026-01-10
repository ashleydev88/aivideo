"use client";
import { useState } from 'react';
import { Upload, Clock, Palette, Play } from 'lucide-react';

export default function SetupForm({ onStart, isLoading }: { onStart: (file: File, duration: number, style: string) => void, isLoading: boolean }) {
    const [duration, setDuration] = useState(3);
    const [style, setStyle] = useState("Business Illustration");
    const [file, setFile] = useState<File | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const styles = [
        { name: "Business Illustration", img: "https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/public/course-assets/Business%20illustrative%20example/Friendly%20welcoming%20colleague.png" },
        { name: "Minimalist Vector", img: "https://placehold.co/400x300/1e293b/white?text=Minimalist" },
        { name: "Corporate Photo", img: "https://placehold.co/400x300/1e293b/white?text=Photo+Real" },
        { name: "Hand Drawn", img: "https://placehold.co/400x300/1e293b/white?text=Hand+Drawn" },
        { name: "3D Abstract", img: "https://placehold.co/400x300/1e293b/white?text=3D+Abstract" },
        { name: "Tech Isometric", img: "https://placehold.co/400x300/1e293b/white?text=Isometric" },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-teal-200 bg-clip-text text-transparent">
                    Create New Course
                </h1>
                <p className="text-slate-400">Turn your policy documents into engaging video training.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Duration & File */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-all">
                        <label className="flex items-center gap-2 text-lg font-semibold mb-4 text-teal-200">
                            <Clock size={20} /> Course Duration
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[3, 5, 10, 15, 20].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setDuration(m)}
                                    className={`py-2 px-4 rounded-lg font-medium transition-all
                                        ${duration === m ? 'bg-teal-700 text-white shadow-lg scale-105' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                                >
                                    {m} Mins
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-all">
                        <label className="flex items-center gap-2 text-lg font-semibold mb-4 text-teal-200">
                            <Upload size={20} /> Policy Document
                        </label>
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFile}
                                accept=".pdf,.docx,.txt"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all group-hover:bg-slate-700/50
                                ${file ? 'border-teal-500 bg-teal-500/10' : 'border-slate-600'}`}>
                                {file ? (
                                    <div className="text-teal-400 font-medium truncate">{file.name}</div>
                                ) : (
                                    <div className="text-slate-400">
                                        <p>Drop PDF or DOCX here</p>
                                        <p className="text-xs mt-2 opacity-60">or click to browse</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Style */}
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-all">
                    <label className="flex items-center gap-2 text-lg font-semibold mb-4 text-teal-200">
                        <Palette size={20} /> Visual Style
                    </label>
                    <div className="grid grid-cols-2 gap-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {styles.map(s => (
                            <button
                                key={s.name}
                                onClick={() => setStyle(s.name)}
                                className={`relative group rounded-lg overflow-hidden border-2 transition-all text-left
                                    ${style === s.name ? 'border-teal-500 shadow-teal-500/20 shadow-lg' : 'border-transparent hover:border-slate-600'}`}
                            >
                                <img src={s.img} alt={s.name} className="w-full h-24 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="p-2 bg-slate-900/90 text-xs font-medium text-center">
                                    {s.name}
                                </div>
                                {style === s.name && (
                                    <div className="absolute top-2 right-2 w-4 h-4 bg-teal-500 rounded-full border border-white"></div>
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
                    className="flex items-center gap-3 bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 
                             text-white px-10 py-4 rounded-full font-bold text-xl shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Analyzing Policy..." : "Start Planning"}
                    {!isLoading && <Play fill="currentColor" size={20} />}
                </button>
            </div>
        </div>
    );
}

// Scrollbar styling is now in globals.css using slate colors
