import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
    "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:border-transparent focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    {
        variants: {
            variant: {
                default: "shadow-sm focus-visible:shadow-md",
                flat: "border-transparent bg-muted shadow-none focus-visible:bg-background focus-visible:border-muted",
                outline: "bg-transparent shadow-none focus-visible:bg-background",
                underlined: "rounded-none border-0 border-b shadow-none focus-visible:border-b-2",
            },
            size: {
                default: "h-10",
                sm: "h-8 rounded-md px-2 text-xs",
                lg: "h-12 rounded-xl px-4 text-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
        VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, size, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(inputVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }