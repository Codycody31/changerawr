"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {X} from "lucide-react"

import {cn} from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({className, ...props}, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 backdrop-blur-md bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Define proper types for the extended props
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    size?: "sm" | "md" | "lg" | "xl" | "full"
    position?: "center" | "top"
    disableClose?: boolean
}

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    DialogContentProps
>(({className, children, position = "center", size = "md", disableClose = false, ...props}, ref) => {
    // Create a new object without disableClose to avoid passing to DOM
    const domProps = React.useMemo(() => {
        const filteredProps = {...props}
        // TypeScript knows disableClose shouldn't be in the DOM props
        delete (filteredProps as Record<string, unknown>)['disableClose']
        return filteredProps
    }, [props])

    const sizeStyles = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        full: "max-w-full mx-4"
    } as const

    const positionStyles = {
        center: "fixed top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]",
        top: "fixed top-[10%] left-[50%] -translate-x-[50%]"
    } as const

    return (
        <DialogPortal>
            <DialogOverlay/>
            <DialogPrimitive.Content
                ref={ref}
                className={cn(
                    "z-50 grid w-full gap-4 p-6",
                    "bg-gradient-to-br from-background via-background to-muted/20",
                    "border-2 border-border/60 shadow-2xl shadow-black/25",
                    "backdrop-blur-sm rounded-xl",
                    // Optical border effect using pseudo-elements
                    "before:absolute before:inset-0 before:rounded-xl",
                    "before:bg-gradient-to-br before:from-white/10 before:via-white/5 before:to-transparent",
                    "before:pointer-events-none",
                    // Additional depth with ring
                    "ring-1 ring-white/10",
                    // Glass morphism effect
                    "relative overflow-hidden",
                    // Animations
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                    // Size and position
                    sizeStyles[size],
                    positionStyles[position],
                    className
                )}
                // Disable escape key and overlay click when disableClose is true
                onEscapeKeyDown={disableClose ? (e) => e.preventDefault() : undefined}
                onInteractOutside={disableClose ? (e) => e.preventDefault() : undefined}
                {...domProps}
            >
                {children}
                {/* Conditionally render close button */}
                {!disableClose && (
                    <DialogPrimitive.Close
                        className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                        <X className="h-4 w-4" strokeWidth={2.5}/>
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
                          className,
                          ...props
                      }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left border-b border-border/50 pb-3 mb-2",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
                          className,
                          ...props
                      }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border/50 pt-3 mt-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({className, ...props}, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({className, ...props}, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}