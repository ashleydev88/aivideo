"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize,
    Loader2,
} from "lucide-react";

export interface Slide {
    id: number;
    image: string;
    audio: string;
    visual_text?: string;
    duration: number; // milliseconds
    layout?: string;
}

interface SeamlessPlayerProps {
    slides: Slide[];
    autoPlay?: boolean;
}

export function SeamlessPlayer({ slides, autoPlay = true }: SeamlessPlayerProps) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [slideProgress, setSlideProgress] = useState(0);

    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const currentSlide = slides[currentSlideIndex];
    const totalSlides = slides.length;

    // Preload next slide's image
    useEffect(() => {
        if (currentSlideIndex < totalSlides - 1) {
            const nextSlide = slides[currentSlideIndex + 1];
            const img = new Image();
            img.src = nextSlide.image;
        }
    }, [currentSlideIndex, slides, totalSlides]);

    // Handle audio loading and playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSlide) return;

        requestAnimationFrame(() => {
            setIsLoading(true);
            setSlideProgress(0);
        });
        audio.src = currentSlide.audio;
        audio.load();

        const handleCanPlay = () => {
            setIsLoading(false);
            if (isPlaying) {
                audio.play().catch(console.error);
            }
        };

        const handleEnded = () => {
            // Auto-advance to next slide
            if (currentSlideIndex < totalSlides - 1) {
                setCurrentSlideIndex((prev) => prev + 1);
            } else {
                // Course complete
                setIsPlaying(false);
            }
        };

        const handleTimeUpdate = () => {
            if (audio.duration) {
                const slidePercent = (audio.currentTime / audio.duration) * 100;
                setSlideProgress(slidePercent);

                // Calculate overall progress
                const completedSlides = currentSlideIndex;
                const slideContribution = 100 / totalSlides;
                const overallProgress =
                    completedSlides * slideContribution +
                    (slidePercent / 100) * slideContribution;
                setProgress(overallProgress);
            }
        };

        audio.addEventListener("canplay", handleCanPlay);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("timeupdate", handleTimeUpdate);

        return () => {
            audio.removeEventListener("canplay", handleCanPlay);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
        };
    }, [currentSlide, currentSlideIndex, isPlaying, totalSlides]);

    // Handle play/pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && !isLoading) {
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    }, [isPlaying, isLoading]);

    // Handle mute
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.muted = isMuted;
        }
    }, [isMuted]);

    const togglePlay = useCallback(() => {
        setIsPlaying((prev) => !prev);
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev);
    }, []);

    const goToSlide = useCallback((index: number) => {
        if (index >= 0 && index < totalSlides) {
            setCurrentSlideIndex(index);
        }
    }, [totalSlides]);

    const previousSlide = useCallback(() => {
        goToSlide(currentSlideIndex - 1);
    }, [currentSlideIndex, goToSlide]);

    const nextSlide = useCallback(() => {
        goToSlide(currentSlideIndex + 1);
    }, [currentSlideIndex, goToSlide]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current.requestFullscreen();
        }
    }, []);

    const handleProgressClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = (clickX / rect.width) * 100;
            const targetSlideIndex = Math.floor((percent / 100) * totalSlides);
            goToSlide(targetSlideIndex);
        },
        [totalSlides, goToSlide]
    );

    if (!slides || slides.length === 0) {
        return (
            <div className="aspect-video bg-slate-900 flex items-center justify-center text-white/50">
                No slides available
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden group"
        >
            {/* Hidden audio element */}
            <audio ref={audioRef} preload="auto" />

            {/* Slide Display */}
            <div className="aspect-video relative">
                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="h-12 w-12 text-white animate-spin" />
                    </div>
                )}

                {/* Current slide image */}
                <img
                    src={currentSlide.image}
                    alt={`Slide ${currentSlide.id}`}
                    className="w-full h-full object-contain transition-opacity duration-300"
                    onLoad={() => setIsLoading(false)}
                />

                {/* Play overlay (shown when paused) */}
                {!isPlaying && !isLoading && (
                    <div
                        className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
                        onClick={togglePlay}
                    >
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                            <Play className="h-16 w-16 text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Progress bar */}
                <div
                    className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer"
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Previous */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={previousSlide}
                            disabled={currentSlideIndex === 0}
                        >
                            <SkipBack className="h-5 w-5" />
                        </Button>

                        {/* Play/Pause */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={togglePlay}
                        >
                            {isPlaying ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5" />
                            )}
                        </Button>

                        {/* Next */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={nextSlide}
                            disabled={currentSlideIndex === totalSlides - 1}
                        >
                            <SkipForward className="h-5 w-5" />
                        </Button>

                        {/* Mute */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={toggleMute}
                        >
                            {isMuted ? (
                                <VolumeX className="h-5 w-5" />
                            ) : (
                                <Volume2 className="h-5 w-5" />
                            )}
                        </Button>
                    </div>

                    {/* Slide counter & Fullscreen */}
                    <div className="flex items-center gap-4">
                        <span className="text-white/80 text-sm font-medium">
                            {currentSlideIndex + 1} / {totalSlides}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={toggleFullscreen}
                        >
                            <Maximize className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
