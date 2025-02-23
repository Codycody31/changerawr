// scripts/widget/build.ts
import * as esbuild from 'esbuild';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('NEXT_PUBLIC_APP_URL is required');
}

async function buildWidget() {
    try {
        // Build the widget bundle
        await esbuild.build({
            entryPoints: ['widgets/changelog/index.js'],
            bundle: true,
            minify: true,
            sourcemap: true,
            target: ['es2018'],
            format: 'iife',
            globalName: 'ChangerawrWidgetLoader',
            outfile: 'public/widget-bundle.js',
            define: {
                'process.env.NEXT_PUBLIC_APP_URL': `"${process.env.NEXT_PUBLIC_APP_URL}"`,
            },
        });

        console.log('✅ Widget built successfully');
    } catch (error) {
        console.error('❌ Widget build failed:', error);
        process.exit(1);
    }
}

buildWidget();