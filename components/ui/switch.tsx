"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const switchVariants = cva(
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    {
        variants: {
            size: {
                default: "h-6 w-11",
                sm: "h-5 w-9",
                lg: "h-7 w-14",
            },
            variant: {
                default: "",
                pill: "rounded-full",
                square: "rounded-md",
            },
            withIcon: {
                true: "[&>span]:flex [&>span]:items-center [&>span]:justify-center",
                false: "",
            },
        },
        defaultVariants: {
            size: "default",
            variant: "default",
            withIcon: false,
        },
    }
)

const thumbVariants = cva(
    "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
    {
        variants: {
            size: {
                default: "h-5 w-5",
                sm: "h-4 w-4",
                lg: "h-6 w-6",
            },
            variant: {
                default: "rounded-full",
                pill: "rounded-full",
                square: "rounded",
            },
        },
        defaultVariants: {
            size: "default",
            variant: "default",
        },
    }
)

export interface SwitchProps
    extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
        VariantProps<typeof switchVariants> {
    thumbClassName?: string
    icon?: React.ReactNode
}

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    SwitchProps
>(({
       className,
       size,
       variant,
       withIcon,
       thumbClassName,
       icon,
       ...props
   }, ref) => (
    <SwitchPrimitives.Root
        className={cn(switchVariants({ size, variant, withIcon }), className)}
        {...props}
        ref={ref}
    >
        <SwitchPrimitives.Thumb
            className={cn(
                thumbVariants({ size, variant }),
                thumbClassName
            )}
        >
            {withIcon && icon}
        </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }