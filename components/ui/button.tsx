import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity hover:before:opacity-10",
                destructive:
                    "relative overflow-hidden bg-destructive text-destructive-foreground hover:bg-destructive/90 before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity hover:before:opacity-10",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground relative",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 relative overflow-hidden before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity hover:before:opacity-10",
                ghost: "hover:bg-accent hover:text-accent-foreground relative",
                link: "text-primary underline-offset-4 hover:underline relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-current after:transition-all hover:after:w-full",
                minimal: "text-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary",
            },
            size: {
                default: "h-10 px-4 py-2 rounded-md",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10 rounded-md",
                pill: "h-10 px-6 rounded-full",
            },
            animation: {
                none: "",
                bounce: "",
                scale: "",
                slide: "",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            animation: "none",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, animation = "none", asChild = false, isLoading, children, ...props }, ref) => {
        // Use the correct component based on asChild prop
        if (asChild) {
            return (
                <Slot
                    ref={ref}
                    className={cn(buttonVariants({ variant, size, animation, className }))}
                    {...props}
                >
                    {isLoading ? (
                        <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Loading...</span>
                        </>
                    ) : (
                        children
                    )}
                </Slot>
            );
        }

        // Add animation classes instead of using framer-motion props directly
        const animationClasses = {
            none: "",
            bounce: "active:translate-y-1 transition-transform",
            scale: "active:scale-95 transition-transform",
            slide: "active:translate-x-1 transition-transform"
        };

        return (
            <button
                ref={ref}
                className={cn(
                    buttonVariants({ variant, size, animation, className }),
                    animation && animation !== "none" ? animationClasses[animation] : ""
                )}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Loading...</span>
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }