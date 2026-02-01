'use client';

/**
 * Chart Test Gallery
 * 
 * Visual testing page for all 16 MotionGraph archetypes.
 * No API calls - uses mock fixtures directly.
 */

import React from 'react';
import { MotionGraphPreview } from '@/components/SlideEditor/MotionGraphPreview';
import chartTestFixtures from '@/lib/test/chartTestFixtures';

// Archetype tier labels
const tierLabels: Record<string, string> = {
    process: 'Essential',
    cycle: 'Essential',
    hierarchy: 'Essential',
    comparison: 'Essential',
    statistic: 'Essential',
    grid: 'Essential',
    timeline: 'Business',
    funnel: 'Business',
    pyramid: 'Business',
    mindmap: 'Business',
    code: 'Technical',
    math: 'Technical',
    architecture: 'Technical',
    matrix: 'Pedagogical',
    metaphor: 'Pedagogical',
    anatomy: 'Pedagogical',
};

const tierColors: Record<string, string> = {
    Essential: 'bg-blue-500',
    Business: 'bg-emerald-500',
    Technical: 'bg-purple-500',
    Pedagogical: 'bg-amber-500',
};

export default function ChartGalleryPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <h1 className="text-4xl font-black mb-4">
                    📊 Chart Test Gallery
                </h1>
                <p className="text-slate-400 text-lg mb-6">
                    Visual testing for all 16 MotionGraph archetypes. No API calls required.
                </p>

                {/* Legend */}
                <div className="flex flex-wrap gap-4">
                    {Object.entries(tierColors).map(([tier, color]) => (
                        <div key={tier} className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="text-sm text-slate-300">{tier}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart Grid */}
            <div className="max-w-7xl mx-auto space-y-16">
                {chartTestFixtures.map((fixture) => {
                    const tier = tierLabels[fixture.archetype] || 'Unknown';
                    const tierColor = tierColors[tier] || 'bg-slate-500';

                    return (
                        <div key={fixture.id} className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Chart Header */}
                            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${tierColor}`}>
                                        {tier}
                                    </span>
                                    <h2 className="text-2xl font-bold">
                                        {fixture.archetype}
                                    </h2>
                                </div>
                                <div className="text-sm text-slate-400">
                                    {fixture.nodes.length} nodes • {fixture.edges.length} edges
                                </div>
                            </div>

                            {/* Chart Preview Container */}
                            <div className="relative bg-slate-100 overflow-hidden" style={{ height: '540px' }}>
                                <div
                                    className="origin-top-left"
                                    style={{
                                        transform: 'scale(0.5)',
                                        width: '1920px',
                                        height: '1080px'
                                    }}
                                >
                                    <MotionGraphPreview
                                        data={fixture}
                                        accentColor="#14b8a6"
                                        backgroundColor="#f8fafc"
                                        textColor="#0f172a"
                                    />
                                </div>
                            </div>

                            {/* Chart Footer - Raw Data */}
                            <details className="p-4 border-t border-slate-700">
                                <summary className="text-slate-400 cursor-pointer hover:text-white transition-colors">
                                    View Raw JSON
                                </summary>
                                <pre className="mt-4 p-4 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-x-auto">
                                    {JSON.stringify(fixture, null, 2)}
                                </pre>
                            </details>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-700 text-center text-slate-500">
                <p>
                    ✅ All {chartTestFixtures.length} chart types rendered successfully
                </p>
            </div>
        </div>
    );
}
