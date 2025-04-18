import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all duration-300",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground border-muted-foreground/20",
                destructive:
                    "border-destructive/50 text-destructive dark:border-destructive dark:[&>svg]:text-destructive",
                warning:
                    "border-orange-500/50 text-orange-600 dark:border-orange-500 [&>svg]:text-orange-600 dark:text-orange-500 dark:[&>svg]:text-orange-500",
                success:
                    "border-green-500/50 text-green-600 dark:border-green-500 [&>svg]:text-green-600 dark:text-green-500 dark:[&>svg]:text-green-500",
                info:
                    "border-blue-500/50 text-blue-600 dark:border-blue-500 [&>svg]:text-blue-600 dark:text-blue-500 dark:[&>svg]:text-blue-500",
            },
            borderStyle: {
                default: "",
                accent: "border-l-4",
                solid: "border-2",
                highlight: "after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-current",
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
        },
        defaultVariants: {
            variant: "default",
            borderStyle: "default",
            rounded: "default",
            hasIcon: true,
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
>(({ className, variant = "default", borderStyle, rounded, hasIcon = true, icon, ...props }, ref) => {
    // Get the appropriate icon based on variant
    const IconComponent = iconMap[variant as keyof typeof iconMap]
    const alertIcon = icon || <IconComponent className="h-4 w-4" />

    return (
        <div
            ref={ref}
            role="alert"
            className={cn(alertVariants({
                variant,
                borderStyle,
                rounded,
                hasIcon: hasIcon
            }), className)}
            {...props}
        >
            {hasIcon && alertIcon}
            <div className={cn(!hasIcon && "pl-0")}>{props.children}</div>
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