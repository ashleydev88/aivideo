
export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center gap-6">
            <div className="h-12 flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1.5 h-full bg-primary rounded-full animate-wave"
                        style={{
                            animationDelay: `${i * 0.1}s`
                        }}
                    />
                ))}
            </div>
            <p className="text-primary/80 font-medium text-lg animate-pulse tracking-wide">{message}</p>
        </div>
    )
}
