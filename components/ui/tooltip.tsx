"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: "default" | "info" | "warning" | "error" | "success"
    withArrow?: boolean
    size?: "sm" | "md" | "lg"
}
>(({
       className,
       sideOffset = 4,
       withArrow = true,
       variant = "default",
       size = "md",
       ...props
   }, ref) => {

    const variantStyles = {
        default: "bg-popover text-popover-foreground border-border",
        info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
        warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
        error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
        success: "bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
    }

    const sizeStyles = {
        sm: "py-1 px-2 text-xs",
        md: "py-1.5 px-3 text-sm",
        lg: "py-2 px-4 text-base"
    }

    return (
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "z-50 overflow-hidden rounded-md border shadow-md",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
                "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                sizeStyles[size],
                variantStyles[variant],
                className
            )}
            {...props}
        >
            {props.children}
            {withArrow && (
                <TooltipPrimitive.Arrow
                    className={cn(
                        "fill-current",
                        {
                            "fill-border": variant === "default",
                            "fill-blue-200 dark:fill-blue-800": variant === "info",
                            "fill-amber-200 dark:fill-amber-800": variant === "warning",
                            "fill-red-200 dark:fill-red-800": variant === "error",
                            "fill-green-200 dark:fill-green-800": variant === "success",
                        }
                    )}
                    width={10}
                    height={5}
                />
            )}
        </TooltipPrimitive.Content>
    )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }