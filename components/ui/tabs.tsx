"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "outline" | "pills" | "underlined" | "minimal"
    size?: "sm" | "md" | "lg"
}
>(({ className, variant = "default", size = "md", ...props }, ref) => {
    const sizeStyles = {
        sm: "h-8 text-xs",
        md: "h-10 text-sm",
        lg: "h-12 text-base"
    }

    const variantStyles = {
        default: "bg-muted p-1 rounded-lg",
        outline: "border rounded-lg p-1",
        pills: "space-x-1",
        underlined: "border-b space-x-2",
        minimal: "space-x-6"
    }

    return (
        <TabsPrimitive.List
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center text-muted-foreground",
                sizeStyles[size],
                variantStyles[variant],
                className
            )}
            {...props}
        />
    )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "default" | "outline" | "pills" | "underlined" | "minimal"
    withIndicator?: boolean
}
>(({
       className,
       variant = "default",
       withIndicator = false,
       ...props
   }, ref) => {
    const variantStyles = {
        default: "rounded-md ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        outline: "rounded-md border border-transparent data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground",
        pills: "rounded-full bg-transparent px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        underlined: "rounded-none border-b-2 border-transparent px-1 pt-1 data-[state=active]:border-primary data-[state=active]:text-foreground",
        minimal: "rounded-none text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-medium"
    }

    return (
        <TabsPrimitive.Trigger
            ref={ref}
            className={cn(
                "relative inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 font-medium ring-offset-background transition-all focus-visible:outline-none",
                variantStyles[variant],
                className
            )}
            {...props}
        >
            {props.children}
            {withIndicator && variant !== "pills" && (
                <div className={cn(
                    "absolute left-0 right-0 w-full origin-left transition-all duration-300 ease-spring",
                    {
                        "bottom-1 h-0.5 rounded-full bg-primary": variant === "default" || variant === "outline" || variant === "minimal",
                        "bottom-0 h-0.5 rounded-none bg-primary": variant === "underlined",
                        "opacity-0": true,
                        "data-[state=active]:opacity-100": true
                    }
                )} />
            )}
        </TabsPrimitive.Trigger>
    )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
    animate?: boolean
}
>(({ className, animate = true, ...props }, ref) => {
    if (animate) {
        // Instead of using Framer Motion directly with asChild,
        // use CSS transitions with classes
        return (
            <TabsPrimitive.Content
                ref={ref}
                className={cn(
                    "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "transition-all duration-200 ease-out",
                    "data-[state=inactive]:opacity-0 data-[state=inactive]:translate-y-2",
                    "data-[state=active]:opacity-100 data-[state=active]:translate-y-0",
                    className
                )}
                {...props}
            />
        )
    }

    return (
        <TabsPrimitive.Content
            ref={ref}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }