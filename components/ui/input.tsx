import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
    "relative isolate flex w-full rounded-lg border bg-background px-3 py-2 text-base transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    {
        variants: {
            variant: {
                default: [
                    // Base styling with optical border
                    "border border-input/60 bg-background shadow-sm",
                    // Background layer for depth
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-gradient-to-b before:from-background/80 before:to-background/40",
                    // Focus ring and highlight
                    "focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
                    "focus-visible:shadow-md focus-visible:before:from-background/90 focus-visible:before:to-background/60",
                    // Subtle inner highlight
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/8%)]",
                    // Dark mode adjustments
                    "dark:border-input/40 dark:before:from-background/20 dark:before:to-background/5",
                    "dark:focus-visible:border-ring/40",
                ],
                flat: [
                    "border border-transparent bg-muted/80 shadow-none backdrop-blur-sm",
                    "focus-visible:bg-background focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-muted/60 before:to-muted/40",
                    "focus-visible:before:from-background/80 focus-visible:before:to-background/40",
                ],
                outline: [
                    "bg-transparent border border-input/80 shadow-none",
                    "focus-visible:bg-background/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
                    "hover:border-input hover:bg-background/30",
                ],
                underlined: [
                    "rounded-none border-0 border-b-2 border-input/60 shadow-none bg-transparent px-0",
                    "focus-visible:border-ring focus-visible:ring-0",
                    "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-ring after:transition-all",
                    "focus-visible:after:w-full",
                ],
                ghost: [
                    "border border-transparent bg-transparent shadow-none",
                    "hover:bg-accent/30 hover:border-accent/40",
                    "focus-visible:bg-background/80 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20",
                ],
            },
            size: {
                default: "h-10",
                sm: "h-8 rounded-md px-2 text-xs",
                lg: "h-12 rounded-xl px-4 text-lg",
            },
            state: {
                default: "",
                error: [
                    "border-destructive/60 text-destructive",
                    "focus-visible:border-destructive focus-visible:ring-destructive/20",
                    "before:from-destructive/5 before:to-destructive/[0.02]",
                ],
                success: [
                    "border-green-500/60 text-green-700 dark:text-green-400",
                    "focus-visible:border-green-500 focus-visible:ring-green-500/20",
                    "before:from-green-500/5 before:to-green-500/[0.02]",
                ],
                warning: [
                    "border-yellow-500/60 text-yellow-700 dark:text-yellow-400",
                    "focus-visible:border-yellow-500 focus-visible:ring-yellow-500/20",
                    "before:from-yellow-500/5 before:to-yellow-500/[0.02]",
                ],
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            state: "default",
        },
    }
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
        VariantProps<typeof inputVariants> {
    startIcon?: React.ReactNode
    endIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, size, state, type, startIcon, endIcon, ...props }, ref) => {
        const hasIcons = startIcon || endIcon

        return (
            <div className={cn("relative", hasIcons && "flex items-center")}>
                {startIcon && (
                    <div className="absolute left-3 z-10 flex items-center pointer-events-none">
                        <div className="text-muted-foreground/60 [&>svg]:h-4 [&>svg]:w-4">
                            {startIcon}
                        </div>
                    </div>
                )}

                <input
                    type={type}
                    className={cn(
                        inputVariants({ variant, size, state, className }),
                        startIcon && "pl-10",
                        endIcon && "pr-10"
                    )}
                    ref={ref}
                    {...props}
                />

                {endIcon && (
                    <div className="absolute right-3 z-10 flex items-center pointer-events-none">
                        <div className="text-muted-foreground/60 [&>svg]:h-4 [&>svg]:w-4">
                            {endIcon}
                        </div>
                    </div>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }