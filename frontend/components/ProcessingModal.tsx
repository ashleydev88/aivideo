"use client";

import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ProcessingModalProps {
    isOpen: boolean;
}

export default function ProcessingModal({ isOpen }: ProcessingModalProps) {
    return (
        <Dialog open={isOpen}>
            <DialogContent
                hideCloseButton
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="sm:max-w-md"
            >
                <DialogHeader className="text-center sm:text-center space-y-4">
                    {/* Spinning Loader Icon */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-teal-100 blur-xl animate-pulse" />
                            <Loader2 className="relative h-16 w-16 text-teal-600 animate-spin" />
                        </div>
                    </div>

                    {/* Title */}
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                        Analyzing your Policy...
                    </DialogTitle>

                    {/* Description */}
                    <DialogDescription className="text-base text-slate-600">
                        We're identifying key compliance requirements and drafting your
                        bespoke topic list.
                    </DialogDescription>
                </DialogHeader>

                {/* Warning Alert */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-600 text-center font-medium">
                        ⚠️ This may take upto 2 minutes.Please do not close this window to avoid losing your progress.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
