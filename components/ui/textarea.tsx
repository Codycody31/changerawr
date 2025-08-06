import * as React from "react"

import {cn} from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
    variant?: "default" | "ghost"
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({className, variant = "default", ...props}, ref) => {
        const baseStyles = "flex min-h-[80px] w-full bg-background text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

        const variantStyles = {
            default: "rounded-md border border-input px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            ghost: "border-0 px-0 py-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        }

        return (
            <textarea
                className={cn(
                    baseStyles,
                    variantStyles[variant],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export {Textarea}