import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-[calc(var(--radius)-0.1rem)] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                // Default: Teal (primary)
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                // Secondary: Slate
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                // Destructive: Rose
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                // Outline
                outline: "border border-border text-foreground",
                // Success: Teal variant for positive states
                success:
                    "border-transparent bg-teal-100 text-teal-800",
                // Warning: Amber for caution states
                warning:
                    "border-transparent bg-amber-100 text-amber-800",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
