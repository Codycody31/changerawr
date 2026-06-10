import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    // Exclude extensions/ — they are symlinked and Turbopack's filesystem classification
    // for that subtree breaks PlainSource::from_source when any diagnostic is emitted.
    transpilePackages: ['@changerawr/markdown'],
    reactCompiler: {
        sources: (filename: string) => !/[/\\]extensions[/\\]/.test(filename),
    },
    images: {
        formats: ["image/avif", "image/webp"],
        // No remote patterns needed - avatars are proxied through /api/avatar/[hash]
        remotePatterns: [],
    },
    turbopack: {},
    webpack: (config, { isServer }) => {
        // Exclude extensions folder from type checking and compilation
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];

        config.module.rules.push({
            test: /\.(ts|tsx|js|jsx)$/,
            include: [path.join(__dirname, 'extensions')],
            use: 'ignore-loader',
        });

        return config;
    },
    typescript: {
        // Ignore build errors (extensions folder will always have errors)
        ignoreBuildErrors: true,
    },
    experimental: {
        // Enable optimized Fast Refresh for faster development
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@heroicons/react'],
        // Turbo mode for faster builds
    },
    typedRoutes: false,
    // output: 'standalone', uses next-start, leave commented-out
};

export default nextConfig;