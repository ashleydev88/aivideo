"use client";
import { useState, useEffect } from 'react';
import { LayoutList, ArrowRight, Wand2, Type } from 'lucide-react';

export default function PlanningEditor({ topics, duration, initialTitle, onBack, onNext, isLoading }:
    { topics: string[], duration: number, initialTitle: string, onBack: () => void, onNext: (t: string[], title: string) => void, isLoading: boolean }) {

    const [editedTopics, setTopics] = useState<string[]>(topics);
    const [title, setTitle] = useState(initialTitle);

    // Sync from props if they change (e.g. delayed load)
    useEffect(() => {
        if (topics && topics.length > 0) setTopics(topics);
        if (initialTitle) setTitle(initialTitle);
    }, [topics, initialTitle]);

    const handleChange = (index: number, val: string) => {
        const newTopics = [...editedTopics];
        newTopics[index] = val;
        setTopics(newTopics);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-white">Course Plan Review</h1>
                <p className="text-gray-400">Our AI has extracted these key topics from your policy. Edit as needed.</p>
            </div>

            <div className="bg-gray-800/80 p-8 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-sm space-y-6">

                {/* Title Input */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-300">
                        <Type size={20} />
                        <span className="font-semibold text-lg">Course Title</span>
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-2xl font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                        placeholder="Enter course title..."
                    />
                </div>

                <div className="h-px bg-gray-700/50"></div>

                <div className="flex items-center gap-2 mb-2 text-blue-300">
                    <LayoutList size={20} />
                    <span className="font-semibold text-lg">{duration} Minute Course Structure</span>
                </div>

                <div className="space-y-3">
                    {editedTopics.map((topic, i) => (
                        <div key={i} className="flex gap-4 items-center group">
                            <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-mono text-sm border border-blue-800">
                                {i + 1}
                            </div>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => handleChange(i, e.target.value)}
                                className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between items-center pt-4">
                <button onClick={onBack} disabled={isLoading} className="text-gray-500 hover:text-white transition-colors">
                    ← Back to Setup
                </button>
                <button
                    onClick={() => onNext(editedTopics, title)}
                    disabled={isLoading}
                    className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 
                             text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>Parsing Script <Wand2 className="animate-spin" /></>
                    ) : (
                        <>Start Designing <ArrowRight /></>
                    )}
                </button>
            </div>
        </div>
    );
}
