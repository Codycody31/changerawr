import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"
import {AlertCircle, Info, CheckCircle2, AlertTriangle, XCircle} from "lucide-react"
import {cn} from "@/lib/utils"

const alertVariants = cva(
    "relative isolate w-full rounded-lg border p-4 transition-all duration-300 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
    {
        variants: {
            variant: {
                default: [
                    // Base styling with an optical border
                    "border border-muted-foreground/20 bg-background text-foreground",
                    // Background layer for depth
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-gradient-to-b before:from-background/80 before:to-background/40",
                    // Subtle highlight
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/8%)]",
                    "shadow-sm shadow-slate-100 dark:shadow-slate-800/50",
                ],
                destructive: [
                    "border border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/20",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-destructive/10 before:to-destructive/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.red.200/20%)]",
                    "[&>svg]:text-destructive shadow-sm shadow-red-100 dark:shadow-red-900/20",
                ],
                warning: [
                    "border border-orange-500/30 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-950/20 dark:text-orange-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-orange-500/10 before:to-orange-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.orange.200/20%)]",
                    "[&>svg]:text-orange-600 dark:[&>svg]:text-orange-500 shadow-sm shadow-orange-100 dark:shadow-orange-900/20",
                ],
                success: [
                    "border border-green-500/30 bg-green-50 text-green-600 dark:border-green-500/20 dark:bg-green-950/20 dark:text-green-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-green-500/10 before:to-green-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.green.200/20%)]",
                    "[&>svg]:text-green-600 dark:[&>svg]:text-green-500 shadow-sm shadow-green-100 dark:shadow-green-900/20",
                ],
                info: [
                    "border border-blue-500/30 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-950/20 dark:text-blue-400",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-blue-500/10 before:to-blue-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.blue.200/20%)]",
                    "[&>svg]:text-blue-600 dark:[&>svg]:text-blue-500 shadow-sm shadow-blue-100 dark:shadow-blue-900/20",
                ],
                glass: [
                    "border border-white/20 bg-white/10 backdrop-blur-md text-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.lg)-1px)]",
                    "before:bg-gradient-to-b before:from-white/15 before:to-white/5",
                    "shadow-lg shadow-black/10",
                    "dark:border-white/10 dark:bg-white/5 dark:before:from-white/10 dark:before:to-white/[0.02]",
                ],
            },
            borderStyle: {
                default: "",
                accent: "border-l-4 pl-6",
                solid: "border-2",
                highlight: [
                    "after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-current after:rounded-l-md after:z-10",
                    "pl-6",
                ],
            },
            rounded: {
                default: "rounded-lg",
                none: "rounded-none",
                full: "rounded-xl",
                pill: "rounded-2xl",
            },
            hasIcon: {
                true: "[&>svg]:inline-block",
                false: "[&>svg]:hidden pl-4 [&>div]:pl-0",
            },
            depth: {
                none: "shadow-none",
                sm: "shadow-sm",
                md: "shadow-md",
                lg: "shadow-lg",
                xl: "shadow-xl",
            },
            animation: {
                none: "",
                fade: "animate-in fade-in-0 duration-300",
                slide: "animate-in slide-in-from-top-2 duration-300",
                scale: "animate-in zoom-in-95 duration-300",
                bounce: "animate-bounce",
            },
        },
        defaultVariants: {
            variant: "default",
            borderStyle: "default",
            rounded: "default",
            hasIcon: true,
            depth: "sm",
            animation: "none",
        },
    }
)

const iconMap = {
    default: AlertCircle,
    destructive: XCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
    glass: Info,
}

export interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {
    icon?: React.ReactNode
    dismissible?: boolean
    onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({
         className,
         variant = "default",
         borderStyle,
         rounded,
         hasIcon = true,
         depth,
         animation,
         icon,
         dismissible,
         onDismiss,
         children,
         ...props
     }, ref) => {
        // Determine which icon to use
        const shouldShowIcon = hasIcon
        let alertIcon = null

        if (shouldShowIcon) {
            if (icon) {
                alertIcon = icon
            } else {
                const IconComponent = iconMap[variant as keyof typeof iconMap]
                alertIcon = <IconComponent className="h-4 w-4"/>
            }
        }

        return (
            <div
                ref={ref}
                role="alert"
                className={cn(
                    alertVariants({
                        variant,
                        borderStyle,
                        rounded,
                        hasIcon: shouldShowIcon,
                        depth,
                        animation,
                    }),
                    dismissible && "pr-12",
                    className
                )}
                {...props}
            >
                {alertIcon}
                <div className={cn(!shouldShowIcon && "pl-0")}>
                    {children}
                </div>
                {dismissible && onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        aria-label="Dismiss alert"
                    >
                        <XCircle className="h-4 w-4"/>
                    </button>
                )}
            </div>
        )
    }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
    <h5
        ref={ref}
        className={cn(
            "mb-1 font-semibold leading-none tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text",
            className
        )}
        {...props}
    />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn("text-sm leading-relaxed [&_p]:leading-relaxed opacity-90", className)}
        {...props}
    />
))
AlertDescription.displayName = "AlertDescription"

const AlertActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            "mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-current/10",
            className
        )}
        {...props}
    />
))
AlertActions.displayName = "AlertActions"

export {Alert, AlertTitle, AlertDescription, AlertActions}