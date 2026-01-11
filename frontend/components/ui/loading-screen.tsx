import { Skeleton } from "@/components/ui/skeleton"

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col space-y-3 items-center">
                {/* Shimmer Visual */}
                <Skeleton className="h-[200px] w-[350px] rounded-xl bg-primary/10" />
                <div className="space-y-2 w-full flex flex-col items-center pt-4">
                    <Skeleton className="h-4 w-[280px] bg-primary/10" />
                    <Skeleton className="h-4 w-[200px] bg-primary/10" />
                </div>
            </div>
            <p className="text-primary/80 font-medium text-lg animate-pulse tracking-wide">{message}</p>
        </div>
    )
}
