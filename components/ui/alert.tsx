import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all duration-300 shadow-sm",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground border-muted-foreground/20 shadow-slate-100 dark:shadow-slate-800/50",
                destructive:
                    "border-destructive/50 text-destructive dark:border-destructive dark:[&>svg]:text-destructive bg-destructive/5 shadow-red-100 dark:shadow-red-900/20",
                warning:
                    "border-orange-500/50 text-orange-600 dark:border-orange-500 [&>svg]:text-orange-600 dark:text-orange-500 dark:[&>svg]:text-orange-500 bg-orange-50 dark:bg-orange-950/20 shadow-orange-100 dark:shadow-orange-900/20",
                success:
                    "border-green-500/50 text-green-600 dark:border-green-500 [&>svg]:text-green-600 dark:text-green-500 dark:[&>svg]:text-green-500 bg-green-50 dark:bg-green-950/20 shadow-green-100 dark:shadow-green-900/20",
                info:
                    "border-blue-500/50 text-blue-600 dark:border-blue-500 [&>svg]:text-blue-600 dark:text-blue-500 dark:[&>svg]:text-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-blue-100 dark:shadow-blue-900/20",
            },
            borderStyle: {
                default: "",
                accent: "border-l-4",
                solid: "border-2",
                highlight: "after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-current after:rounded-l-md",
            },
            rounded: {
                default: "rounded-lg",
                none: "rounded-none",
                full: "rounded-xl",
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
            }
        },
        defaultVariants: {
            variant: "default",
            borderStyle: "default",
            rounded: "default",
            hasIcon: true,
            depth: "sm",
        },
    }
)

const iconMap = {
    default: AlertCircle,
    destructive: XCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
}

export interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {
    icon?: React.ReactNode
}

const Alert = React.forwardRef<
    HTMLDivElement,
    AlertProps
>(({ className, variant = "default", borderStyle, rounded, hasIcon = true, depth, icon, ...props }, ref) => {
    // Determine which icon to use:
    // 1. If a custom icon is provided, use it
    // 2. If hasIcon is true and no custom icon, use variant icon
    // 3. If hasIcon is false, don't show any icon
    const shouldShowIcon = hasIcon
    let alertIcon = null

    if (shouldShowIcon) {
        if (icon) {
            // Use custom icon if provided
            alertIcon = icon
        } else {
            // Use variant icon as fallback
            const IconComponent = iconMap[variant as keyof typeof iconMap]
            alertIcon = <IconComponent className="h-4 w-4" />
        }
    }

    return (
        <div
            ref={ref}
            role="alert"
            className={cn(alertVariants({
                variant,
                borderStyle,
                rounded,
                hasIcon: shouldShowIcon,
                depth
            }), className)}
            {...props}
        >
            {alertIcon}
            <div className={cn(!shouldShowIcon && "pl-0")}>{props.children}</div>
        </div>
    )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h5
        ref={ref}
        className={cn("mb-1 font-medium leading-none tracking-tight", className)}
        {...props}
    />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm [&_p]:leading-relaxed", className)}
        {...props}
    />
))
AlertDescription.displayName = "AlertDescription"

const AlertActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("mt-3 flex flex-wrap items-center gap-2", className)}
        {...props}
    />
))
AlertActions.displayName = "AlertActions"

export { Alert, AlertTitle, AlertDescription, AlertActions }