"use client";
import { useState, useEffect } from 'react';
import { LayoutList, ArrowRight, Wand2, Type, Target, ListChecks, Lightbulb } from 'lucide-react';

interface Topic {
    id: number;
    title: string;
    purpose: string;
    key_points: string[];
}

export default function PlanningEditor({ topics, duration, initialTitle, initialLearningObjective, onBack, onNext, isLoading }:
    { topics: Topic[], duration: number, initialTitle: string, initialLearningObjective: string, onBack: () => void, onNext: (t: Topic[], title: string) => void, isLoading: boolean }) {

    const [editedTopics, setTopics] = useState<Topic[]>(topics);
    const [title, setTitle] = useState(initialTitle);
    const [learningObjective, setLearningObjective] = useState(initialLearningObjective);

    // Sync from props
    useEffect(() => {
        if (topics && topics.length > 0) setTopics(topics);
        if (initialTitle) setTitle(initialTitle);
        if (initialLearningObjective) setLearningObjective(initialLearningObjective);
    }, [topics, initialTitle, initialLearningObjective]);

    const handleTopicChange = (index: number, field: keyof Topic, val: string | string[]) => {
        const newTopics = [...editedTopics];
        newTopics[index] = { ...newTopics[index], [field]: val };
        setTopics(newTopics);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 pb-20">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Course Plan Review</h1>
                <p className="text-slate-500 text-lg">Review the AI-generated learning path and objectives.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-8">

                {/* Course Metadata Section */}
                <div className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-teal-700">
                            <Type size={20} />
                            <span className="font-bold text-lg">Course Title</span>
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-2xl font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all placeholder-slate-400"
                        />
                    </div>

                    {/* Learning Objective */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-teal-700">
                            <Target size={20} />
                            <span className="font-bold text-lg">Learning Objective</span>
                        </div>
                        <textarea
                            value={learningObjective}
                            onChange={(e) => setLearningObjective(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="h-px bg-slate-200"></div>

                {/* Topics Header */}
                <div className="flex items-center gap-2 text-teal-700">
                    <LayoutList size={20} />
                    <span className="font-bold text-lg">{duration} Minute Course Structure ({editedTopics.length} Modules)</span>
                </div>

                {/* Topics-List */}
                <div className="space-y-6">
                    {editedTopics.map((topic, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 hover:border-teal-200 transition-colors shadow-sm">

                            {/* Topic Header: Number & Title */}
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm border border-teal-200 shrink-0">
                                    {i + 1}
                                </div>
                                <input
                                    type="text"
                                    value={topic.title}
                                    onChange={(e) => handleTopicChange(i, 'title', e.target.value)}
                                    className="flex-1 bg-transparent border-b border-transparent focus:border-teal-500 focus:bg-white text-xl font-bold text-slate-900 px-2 py-1 transition-all focus:outline-none"
                                    placeholder="Topic Title"
                                />
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">

                                {/* Purpose */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <Lightbulb size={14} className="text-teal-600" /> Purpose
                                    </div>
                                    <textarea
                                        value={topic.purpose}
                                        onChange={(e) => handleTopicChange(i, 'purpose', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none min-h-[80px]"
                                    />
                                </div>

                                {/* Key Points */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <ListChecks size={14} className="text-teal-600" /> Key Points
                                    </div>
                                    <textarea
                                        value={topic.key_points.join('\n')}
                                        onChange={(e) => handleTopicChange(i, 'key_points', e.target.value.split('\n'))}
                                        className="w-full bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none min-h-[80px]"
                                        placeholder="One point per line"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 sticky bottom-8 bg-white/90 p-4 rounded-xl border border-slate-200 backdrop-blur-md shadow-lg">
                <button onClick={onBack} disabled={isLoading} className="text-slate-500 hover:text-slate-800 font-medium transition-colors px-4">
                    ← Back to Setup
                </button>
                <button
                    onClick={() => onNext(editedTopics, title)}
                    disabled={isLoading}
                    className="flex items-center gap-3 bg-teal-700 hover:bg-teal-800 text-white px-8 py-4 rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>Starting... <Wand2 className="animate-spin" /></>
                    ) : (
                        <>Start Designing <ArrowRight /></>
                    )}
                </button>
            </div>
        </div>
    );
}
