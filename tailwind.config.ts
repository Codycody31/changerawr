import type {Config} from "tailwindcss";

export default {
    darkMode: ["class"],
    // Safelist from @changerawr/markdown v1.2.0 — avoids module loading issues in jiti/Docker
    safelist: [
        "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm",
        "font-bold", "font-semibold", "font-medium", "font-mono",
        "italic", "underline", "line-through", "leading-7", "leading-relaxed",
        "mt-8", "mt-6", "mt-5", "mt-4", "mt-3", "mt-2",
        "mb-6", "mb-4", "mb-3", "mb-2", "my-6", "my-4", "my-2",
        "p-4", "p-6", "p-2", "px-1.5", "px-2", "px-3", "px-4", "px-6",
        "py-0.5", "py-1", "py-2", "pl-4", "pl-6",
        "flex", "inline-flex", "items-center", "justify-center", "gap-2", "space-y-1",
        "relative", "group", "list-disc", "list-decimal", "list-inside", "ml-4",
        "border-l-2", "border-l-4", "border-t", "border-border", "border-muted-foreground",
        "rounded", "rounded-lg", "rounded-md", "bg-muted", "max-w-full", "h-auto",
        "overflow-x-auto", "hover:underline", "hover:opacity-100", "opacity-0",
        "group-hover:opacity-100", "transition-opacity", "transition-colors", "transition-all", "duration-200",
        "text-muted-foreground", "text-primary",
        "bg-blue-500/10", "border-blue-500/30", "text-blue-600", "border-l-blue-500",
        "bg-amber-500/10", "border-amber-500/30", "text-amber-600", "border-l-amber-500",
        "bg-red-500/10", "border-red-500/30", "text-red-600", "border-l-red-500",
        "bg-green-500/10", "border-green-500/30", "text-green-600", "border-l-green-500",
        "bg-blue-600", "text-white", "hover:bg-blue-700",
        "bg-gray-200", "text-gray-900", "hover:bg-gray-300",
        "dark:text-blue-400", "dark:text-amber-400", "dark:text-red-400", "dark:text-green-400",
        "dark:bg-gray-800", "dark:text-gray-100",
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
