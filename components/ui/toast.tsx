"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & {
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
}
>(({ className, position = "bottom-right", ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            "fixed z-[100] flex max-h-screen p-4 gap-2",
            {
                "top-0 right-0 flex-col-reverse sm:top-0 sm:right-0 sm:flex-col": position === "top-right",
                "top-0 left-0 flex-col-reverse sm:top-0 sm:left-0 sm:flex-col": position === "top-left",
                "bottom-0 right-0 flex-col sm:bottom-0 sm:right-0 sm:flex-col": position === "bottom-right",
                "bottom-0 left-0 flex-col sm:bottom-0 sm:left-0 sm:flex-col": position === "bottom-left",
                "top-0 right-0 left-0 flex-col-reverse items-center sm:top-0 sm:right-0 sm:left-0 sm:flex-col": position === "top-center",
                "bottom-0 right-0 left-0 flex-col items-center sm:bottom-0 sm:right-0 sm:left-0 sm:flex-col": position === "bottom-center",
            },
            "md:max-w-[420px]",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
    "group pointer-events-auto relative isolate flex w-full items-center justify-between space-x-2 overflow-hidden rounded-xl border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full backdrop-blur-sm",
    {
        variants: {
            variant: {
                default: [
                    // Base styling with optical border
                    "border border-border/40 bg-background/90 text-foreground backdrop-blur-md",
                    // Background layer for depth
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)] before:bg-gradient-to-b before:from-background/90 before:to-background/70",
                    // Subtle highlight
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/10%)]",
                    "shadow-lg shadow-black/10",
                ],
                destructive: [
                    "border border-destructive/30 bg-destructive/10 text-destructive backdrop-blur-md",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "before:bg-gradient-to-b before:from-destructive/20 before:to-destructive/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.red.200/20%)]",
                    "shadow-lg shadow-red-500/20",
                ],
                success: [
                    "border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 backdrop-blur-md",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "before:bg-gradient-to-b before:from-green-500/20 before:to-green-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.green.200/20%)]",
                    "shadow-lg shadow-green-500/20",
                ],
                warning: [
                    "border border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 backdrop-blur-md",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "before:bg-gradient-to-b before:from-yellow-500/20 before:to-yellow-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.yellow.200/20%)]",
                    "shadow-lg shadow-yellow-500/20",
                ],
                info: [
                    "border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 backdrop-blur-md",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "before:bg-gradient-to-b before:from-blue-500/20 before:to-blue-500/5",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.blue.200/20%)]",
                    "shadow-lg shadow-blue-500/20",
                ],
                glass: [
                    "border border-white/20 bg-white/10 backdrop-blur-xl text-foreground",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.xl)-1px)]",
                    "before:bg-gradient-to-b before:from-white/20 before:to-white/5",
                    "shadow-xl shadow-black/20",
                    "dark:border-white/10 dark:bg-white/5 dark:before:from-white/15 dark:before:to-white/[0.02]",
                ],
            },
            size: {
                default: "p-4",
                sm: "p-3 text-sm",
                lg: "p-6 text-base",
            },
            withIcon: {
                true: "pl-12",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            withIcon: false,
        },
    }
)

const iconMap = {
    default: null,
    destructive: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
    glass: Info,
}

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
    icon?: React.ReactNode
}
>(({ className, variant = "default", size, withIcon, icon, children, ...props }, ref) => {
    const IconComponent = iconMap[variant as keyof typeof iconMap]
    const toastIcon = icon || (IconComponent ? <IconComponent className="h-5 w-5" /> : null)
    const hasIcon = !!toastIcon || withIcon

    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant, size, withIcon: hasIcon }), className)}
            {...props}
        >
            {hasIcon && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    {toastIcon}
                </div>
            )}
            <div className="grid gap-1 w-full">{children}</div>
            <ToastPrimitives.Close className="absolute right-2 top-2 rounded-md p-1.5 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </ToastPrimitives.Close>
        </ToastPrimitives.Root>
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action> & {
    variant?: "default" | "primary" | "secondary" | "outline" | "destructive"
}
>(({ className, variant = "default", ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            {
                "border-muted/40 hover:bg-secondary hover:text-secondary-foreground": variant === "default",
                "border-transparent bg-primary/20 text-primary hover:bg-primary/30": variant === "primary",
                "border-transparent bg-secondary/20 text-secondary-foreground hover:bg-secondary/30": variant === "secondary",
                "border-border hover:bg-accent hover:text-accent-foreground": variant === "outline",
                "border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30": variant === "destructive",
            },
            "group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
            className
        )}
        toast-close=""
        {...props}
    >
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn(
            "text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text",
            className
        )}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn("text-sm opacity-90 leading-relaxed", className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Progress indicator for timed toasts
const ToastProgress = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
    value: number // 0-100
    variant?: "default" | "destructive" | "success" | "warning" | "info"
}
>(({ className, value, variant = "default", ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "absolute bottom-0 left-0 right-0 h-1 bg-current/10 overflow-hidden rounded-b-xl",
            className
        )}
        {...props}
    >
        <div
            className={cn(
                "h-full transition-all duration-100",
                {
                    "bg-current/40": variant === "default",
                    "bg-destructive/60": variant === "destructive",
                    "bg-green-500/60": variant === "success",
                    "bg-yellow-500/60": variant === "warning",
                    "bg-blue-500/60": variant === "info",
                }
            )}
            style={{ width: `${value}%` }}
        />
    </div>
))
ToastProgress.displayName = "ToastProgress"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
    ToastProgress,
}