import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
    "relative isolate rounded-2xl border bg-card text-card-foreground overflow-hidden transition-all duration-200",
    {
        variants: {
            variant: {
                default: [
                    // Base styling with optical border
                    "border border-border/40 bg-card shadow-sm",
                    // Background layer for depth
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.2xl)-1px)] before:bg-gradient-to-b before:from-background/80 before:to-background/40",
                    // Subtle highlight
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.2xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/10%)]",
                    // Hover effects
                    "hover:shadow-md hover:border-border/60 hover:after:shadow-[inset_0_1px_theme(colors.white/15%)]",
                    // Dark mode adjustments
                    "dark:border-border/20 dark:before:from-background/20 dark:before:to-background/5",
                ],
                elevated: [
                    "border border-border/30 bg-card shadow-lg",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.2xl)-1px)] before:bg-gradient-to-b before:from-background/90 before:to-background/60",
                    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(theme(borderRadius.2xl)-1px)]",
                    "after:shadow-[inset_0_1px_theme(colors.white/20%)]",
                    "hover:shadow-xl hover:border-border/50",
                    "dark:border-border/10 dark:before:from-background/30 dark:before:to-background/10",
                ],
                outlined: [
                    "border-2 border-border/60 bg-card/80 shadow-none backdrop-blur-sm",
                    "hover:border-border/80 hover:bg-card/90",
                    "dark:border-border/40 dark:hover:border-border/60",
                ],
                soft: [
                    "border border-transparent bg-card/50 backdrop-blur-sm shadow-none",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.2xl)-1px)]",
                    "before:bg-gradient-to-b before:from-background/30 before:to-background/10",
                    "hover:bg-card/70 hover:before:from-background/40 hover:before:to-background/20",
                ],
                glass: [
                    "border border-white/20 bg-white/5 backdrop-blur-md shadow-lg",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(theme(borderRadius.2xl)-1px)]",
                    "before:bg-gradient-to-b before:from-white/10 before:to-white/5",
                    "hover:bg-white/10 hover:border-white/30",
                    "dark:border-white/10 dark:bg-white/[0.02] dark:before:from-white/5 dark:before:to-white/[0.02]",
                ],
            },
            interactive: {
                true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            interactive: false,
        },
    }
)

export interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant, interactive, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(cardVariants({ variant, interactive, className }))}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm text-muted-foreground/90 leading-relaxed", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-2", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex items-center p-6 pt-0 border-t border-border/20 mt-4 bg-gradient-to-r from-background/50 to-background/20",
            className
        )}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
    cardVariants
}