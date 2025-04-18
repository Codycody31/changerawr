import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground hover:bg-accent",
                ghost: "border-transparent bg-transparent text-foreground hover:bg-accent",
                success: "border-transparent bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30",
                warning: "border-transparent bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30",
                info: "border-transparent bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30",
            },
            size: {
                default: "h-5 px-2.5 py-0.5 text-xs",
                sm: "h-4 px-2 py-0 text-xs",
                lg: "h-6 px-3 py-1 text-sm",
            },
            glow: {
                none: "",
                subtle: "shadow-sm",
                full: "shadow-[0_0_10px_rgba(var(--color-primary-500-rgb),0.35)]",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            glow: "none",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode
}

function Badge({
                   className,
                   variant,
                   size,
                   glow,
                   icon,
                   children,
                   ...props
               }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size, glow }), className)} {...props}>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </div>
    )
}

export { Badge, badgeVariants }