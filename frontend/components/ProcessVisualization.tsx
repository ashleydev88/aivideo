"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Lock, Check, Play, ScanLine, User, Database, Mic } from "lucide-react";

export default function ProcessVisualization() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const sequence = async () => {
            // Step 0: Ingestion (1.5s)
            setStep(0);
            await new Promise((r) => setTimeout(r, 1500));

            // Step 1: Decomposition (2.25s)
            setStep(1);
            await new Promise((r) => setTimeout(r, 2250));

            // Step 2: Human-in-the-Loop (1.5s)
            setStep(2);
            await new Promise((r) => setTimeout(r, 1500));

            // Step 3: Worker Swarm (3s)
            setStep(3);
            await new Promise((r) => setTimeout(r, 3000));

            // Step 4: Assembly (0.75s) -> Hold for 3s pause
            setStep(4);
            await new Promise((r) => setTimeout(r, 3750)); // 0.75s anim + 3s pause

            // Loop
            sequence();
        };

        sequence();
    }, []);

    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-teal-50/20 pointer-events-none" />

            {/* Central Stage */}
            <div className="relative z-10 w-full max-w-md h-64 flex items-center justify-center">
                <AnimatePresence mode="wait">

                    {/* STEP 0: INGESTION */}
                    {step === 0 && (
                        <motion.div
                            key="step-ingestion"
                            className="flex items-center justify-center relative"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50, scale: 0.8 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Scanner Ring */}
                            <motion.div
                                className="absolute inset-0 -m-4 border-2 border-teal-500/30 rounded-full"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                            <div className="w-16 h-16 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center relative z-10">
                                <FileText className="w-8 h-8 text-teal-700" />
                            </div>
                            <motion.div
                                className="absolute w-1 bg-teal-500 h-20 blur-sm"
                                initial={{ x: -40 }}
                                animate={{ x: 40 }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </motion.div>
                    )}

                    {/* STEP 1: DECOMPOSITION */}
                    {step === 1 && (
                        <motion.div
                            key="step-decomposition"
                            className="flex flex-col gap-4 w-full px-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {[
                                { label: "Structure", icon: Database, color: "bg-blue-500" },
                                { label: "Imagery", icon: ScanLine, color: "bg-purple-500" },
                                { label: "Voice", icon: Mic, color: "bg-amber-500" }
                            ].map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shadow-lg text-white`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden relative">
                                        <motion.div
                                            className={`absolute inset-y-0 left-0 w-1/3 ${item.color.replace('bg-', 'bg-')}/50 blur-sm`}
                                            animate={{ x: ["-100%", "300%"] }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 w-16">{item.label}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* STEP 2: HUMAN-IN-THE-LOOP */}
                    {step === 2 && (
                        <motion.div
                            key="step-approval"
                            className="flex items-center gap-4 relative"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                        >
                            {/* Converging Lines */}
                            <div className="flex flex-col gap-2">
                                {[1, 2, 3].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-24 h-1 bg-teal-200 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: 96 }}
                                    />
                                ))}
                            </div>

                            {/* Barrier */}
                            <motion.div
                                className="w-1 h-32 bg-slate-900 rounded-full relative flex items-center justify-center"
                                initial={{ height: 0 }}
                                animate={{ height: 128 }}
                            >
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-white"
                                    >
                                        <Lock className="w-3 h-3" />
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Cursor Action */}
                            <motion.div
                                className="absolute z-50 text-slate-900 fill-black"
                                initial={{ x: 50, y: 50, opacity: 0 }}
                                animate={{
                                    x: [-20, -4, -4],
                                    y: [20, 0, 0],
                                    opacity: [0, 1, 1],
                                    scale: [1, 1, 0.9, 1]
                                }}
                                transition={{ duration: 0.8, times: [0, 0.6, 0.8, 1] }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="2">
                                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                                </svg>
                            </motion.div>

                            <motion.div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl z-20"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Check className="w-6 h-6 text-white" />
                            </motion.div>
                        </motion.div>
                    )}

                    {/* STEP 3: WORKER SWARM */}
                    {step === 3 && (
                        <motion.div
                            key="step-swarm"
                            className="w-full h-full flex flex-col items-center justify-center"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.2, opacity: 0 }}
                        >
                            <div className="grid grid-cols-6 gap-1 w-full max-w-[280px]">
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="aspect-square bg-teal-600 rounded-sm"
                                        initial={{ opacity: 0.2 }}
                                        animate={{ opacity: [0.2, 1, 0.4, 0.8] }}
                                        transition={{
                                            duration: 0.2,
                                            repeat: Infinity,
                                            repeatType: "reverse",
                                            delay: Math.random() * 0.5
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 flex items-center gap-2 font-mono text-xs text-slate-600">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <ProcessingCounter />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: ASSEMBLY */}
                    {step === 4 && (
                        <motion.div
                            key="step-assembly"
                            className="relative w-full max-w-sm aspect-video bg-slate-900 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center border border-slate-700"
                            initial={{ scale: 1.5, opacity: 0 }} // Starts big (from grid)
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                            {/* Play Button */}
                            <motion.div
                                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/50"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
                            </motion.div>

                            {/* Progress Bar */}
                            <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-teal-500"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2, ease: "linear" }}
                                />
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Background Tech Lines */}
            <svg className="absolute inset-0 w-full h-full -z-10 opacity-20 pointer-events-none">
                <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" className="text-slate-900" fill="currentColor" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>
    );
}

function ProcessingCounter() {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setCount(c => {
                if (c >= 100) return 100;
                return c + Math.floor(Math.random() * 5) + 1;
            });
        }, 30);
        return () => clearInterval(interval);
    }, []);
    return <span>{Math.min(count, 100)}/100 Frames Processed</span>;
}
