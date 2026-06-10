import type {Config} from "tailwindcss";

export default {
    darkMode: ["class"],
    // Safelist from @changerawr/markdown v1.2.0 — avoids module loading issues in jiti/Docker + generate tailwind from extensions
    safelist: [
        "bg-amber-500/10",
        "bg-blue-500/10",
        "bg-blue-600",
        "bg-gray-200",
        "bg-green-500/10",
        "bg-muted",
        "bg-red-500/10",
        "border-amber-500/30",
        "border-blue-500/30",
        "border-border",
        "border-green-500/30",
        "border-l-2",
        "border-l-4",
        "border-l-amber-500",
        "border-l-blue-500",
        "border-l-green-500",
        "border-l-red-500",
        "border-muted-foreground",
        "border-red-500/30",
        "border-t",
        "dark:bg-gray-800",
        "dark:text-amber-400",
        "dark:text-blue-400",
        "dark:text-gray-100",
        "dark:text-green-400",
        "dark:text-red-400",
        "duration-200",
        "flex",
        "font-bold",
        "font-medium",
        "font-mono",
        "font-semibold",
        "gap-2",
        "group",
        "group-hover:opacity-100",
        "h-auto",
        "hover:bg-blue-700",
        "hover:bg-gray-300",
        "hover:opacity-100",
        "hover:underline",
        "inline-flex",
        "italic",
        "items-center",
        "justify-center",
        "leading-7",
        "leading-relaxed",
        "line-through",
        "list-decimal",
        "list-disc",
        "list-inside",
        "max-w-full",
        "mb-2",
        "mb-3",
        "mb-4",
        "mb-6",
        "ml-4",
        "mt-2",
        "mt-3",
        "mt-4",
        "mt-5",
        "mt-6",
        "mt-8",
        "my-2",
        "my-4",
        "my-6",
        "opacity-0",
        "overflow-x-auto",
        "p-2",
        "p-4",
        "p-6",
        "pl-4",
        "pl-6",
        "px-1.5",
        "px-2",
        "px-3",
        "px-4",
        "px-6",
        "py-0.5",
        "py-1",
        "py-2",
        "relative",
        "rounded",
        "rounded-lg",
        "rounded-md",
        "space-y-1",
        "text-2xl",
        "text-3xl",
        "text-amber-600",
        "text-base",
        "text-blue-600",
        "text-gray-900",
        "text-green-600",
        "text-lg",
        "text-muted-foreground",
        "text-primary",
        "text-red-600",
        "text-sm",
        "text-white",
        "text-xl",
        "transition-all",
        "transition-colors",
        "transition-opacity",
        "underline"
    ],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/services/core/markdown/extensions/**/*.{js,ts}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out'
            }
        }
    },
    plugins: [require("tailwindcss-animate"), require('@tailwindcss/forms')],
} satisfies Config;
