import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                // Primary: Solid Teal
                default:
                    "bg-primary text-primary-foreground hover:bg-[#0D9488] shadow-sm",
                // Secondary: Outline Slate
                secondary:
                    "border border-[#CBD5E1] bg-transparent text-secondary-foreground hover:bg-secondary hover:border-[#94A3B8]",
                // Destructive: Muted Rose
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-[#9F1239] shadow-sm",
                // Outline (legacy support)
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                // Ghost
                ghost: "hover:bg-accent hover:text-accent-foreground",
                // Link
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2 rounded-[var(--radius)]",
                sm: "h-9 px-3 rounded-[calc(var(--radius)-0.05rem)]",
                lg: "h-11 px-8 rounded-[calc(var(--radius)+0.05rem)]",
                icon: "h-10 w-10 rounded-[var(--radius)]",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
