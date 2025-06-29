import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"
import {cn} from "@/lib/utils"

const badgeVariants = cva(
    "relative isolate inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: [
                    "border border-primary/20 bg-primary text-primary-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-primary before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-full",
                    "after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    "hover:after:bg-white/10",
                    "dark:border-primary/30 dark:before:hidden dark:after:-inset-px",
                ],
                secondary: [
                    "border border-secondary/20 bg-secondary text-secondary-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-secondary before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-full",
                    "hover:after:bg-foreground/5",
                    "dark:before:hidden dark:after:-inset-px",
                ],
                destructive: [
                    "border border-destructive/20 bg-destructive text-destructive-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-destructive before:shadow-sm",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-full",
                    "after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    "hover:after:bg-white/10",
                    "dark:border-destructive/30 dark:before:hidden dark:after:-inset-px",
                ],
                outline: [
                    "border border-border/60 bg-background text-foreground",
                    "hover:bg-accent/30 hover:text-accent-foreground hover:border-border/80",
                    "dark:border-border/40",
                ],
                ghost: [
                    "border border-transparent bg-transparent text-foreground",
                    "hover:bg-accent/30 hover:text-accent-foreground",
                ],
                success: [
                    "border border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-b before:from-green-500/20 before:to-green-500/10",
                    "hover:bg-green-500/20",
                    "dark:bg-green-950/20 dark:border-green-500/30",
                ],
                warning: [
                    "border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-b before:from-yellow-500/20 before:to-yellow-500/10",
                    "hover:bg-yellow-500/20",
                    "dark:bg-yellow-950/20 dark:border-yellow-500/30",
                ],
                info: [
                    "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-b before:from-blue-500/20 before:to-blue-500/10",
                    "hover:bg-blue-500/20",
                    "dark:bg-blue-950/20 dark:border-blue-500/30",
                ],
                glass: [
                    "border border-white/20 bg-white/10 backdrop-blur-sm text-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-full",
                    "before:bg-gradient-to-b before:from-white/15 before:to-white/5",
                    "hover:bg-white/20 hover:border-white/30",
                    "dark:border-white/10 dark:bg-white/5 dark:before:from-white/10 dark:before:to-white/[0.02]",
                ],
            },
            size: {
                default: "h-5 px-2.5 py-0.5 text-xs",
                sm: "h-4 px-2 py-0 text-xs",
                lg: "h-6 px-3 py-1 text-sm",
                xl: "h-8 px-4 py-1.5 text-sm font-semibold",
            },
            glow: {
                none: "",
                subtle: "shadow-sm",
                medium: "shadow-md shadow-current/20",
                strong: "shadow-lg shadow-current/30",
                intense: "shadow-xl shadow-current/40 animate-pulse",
            },
            interactive: {
                true: "cursor-pointer active:scale-95",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            glow: "none",
            interactive: false,
        },
    }
)

function getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
}

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode
    dot?: boolean
    customColor?: string | null
}

function Badge({
                   className,
                   variant,
                   size,
                   glow,
                   interactive,
                   icon,
                   dot,
                   customColor,
                   style,
                   children,
                   ...props
               }: BadgeProps) {
    const customStyle =
        customColor && variant !== "outline"
            ? {
                backgroundColor: customColor,
                color: getContrastColor(customColor),
                borderColor: `${customColor}33`,
                "--badge-color": customColor,
                ...style,
            }
            : customColor && variant === "outline"
                ? {
                    backgroundColor: "transparent",
                    color: customColor,
                    borderColor: customColor,
                    "--badge-color": customColor,
                    ...style,
                }
                : style

    const colorOverrideClass =
        customColor && variant !== "outline"
            ? "before:!bg-[var(--badge-color)] after:!shadow-[inset_0_1px_rgba(255,255,255,0.15)]"
            : ""

    return (
        <div
            className={cn(
                badgeVariants({variant, size, glow, interactive}),
                colorOverrideClass,
                className
            )}
            style={customStyle}
            {...props}
        >
            {dot && (
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-70"/>
            )}
            {icon && (
                <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
            )}
            {children}
        </div>
    )
}

export {Badge, badgeVariants}
