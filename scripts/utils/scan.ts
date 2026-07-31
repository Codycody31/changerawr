#!/usr/bin/env -S npx tsx

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';
import { db } from '../../lib/db';

interface PageInfo {
    path: string;
    fullPath: string;
    type: 'page' | 'layout' | 'loading' | 'error' | 'not-found' | 'route';
    isDynamic: boolean;
    segments: string[];
    /** Next.js route group names this page falls under, e.g. ['auth'] for app/(auth)/login. */
    routeGroups: string[];
    screenshotPath?: string;
}

interface ScreenshotConfig {
    baseUrl: string;
    outputDir: string;
    auth?: {
        loginUrl: string;
        credentials: {
            email: string;
            password: string;
        };
        selectors: {
            emailInput: string;
            passwordInput: string;
            submitButton: string;
        };
    };
    viewport?: {
        width: number;
        height: number;
    };
    waitForSelector?: string;
    delay?: number;
    routeParams?: {
        projectId?: string;
        [key: string]: string | undefined;
    };
}

interface RouteTreeNode {
    name: string;
    path: string;
    type: PageInfo['type'];
    isDynamic: boolean;
    children: RouteTreeNode[];
}

class NextJSPageScanner {
    private appDir: string;
    private screenshotConfig?: ScreenshotConfig;

    constructor(appDir: string = './app', screenshotConfig?: ScreenshotConfig) {
        this.appDir = path.resolve(appDir);
        this.screenshotConfig = screenshotConfig;

        if (!fs.existsSync(this.appDir)) {
            throw new Error(`App directory not found: ${this.appDir}`);
        }

        if (this.screenshotConfig?.outputDir) {
            this.ensureDirectoryExists(this.screenshotConfig.outputDir);
        }
    }

    public async scanPages(): Promise<RouteTreeNode[]> {
        const pages: PageInfo[] = [];
        this.scanDirectory(this.appDir, '', pages);

        if (this.screenshotConfig) {
            await this.takeScreenshots(pages);
        }

        return this.buildRouteTree(pages);
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private async takeScreenshots(pages: PageInfo[]): Promise<void> {
        if (!this.screenshotConfig) return;

        const screenshotablePages = this.filterScreenshotablePages(pages);
        if (screenshotablePages.length === 0) {
            console.log('No screenshotable pages found');
            return;
        }

        console.log(`Taking screenshots for ${screenshotablePages.length} pages...`);

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({
            viewport: this.screenshotConfig.viewport || { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        try {
            // Handle authentication if configured
            if (this.screenshotConfig.auth) {
                await this.performLogin(page);
                // Wait 15 seconds after login before taking first screenshot
                console.log('Waiting 15 seconds after login...');
                await page.waitForTimeout(15000);
            }

            // Take screenshots of each page
            for (const pageInfo of screenshotablePages) {
                await this.screenshotPage(page, pageInfo);
            }

        } finally {
            await browser.close();
        }
    }

    // Route params named like this represent one-time/temporary values
    // (email verification links, invites, password resets, CLI auth codes)
    // — there's no stable "real" value to screenshot, so these are always
    // skipped even if a param of this name were ever added to routeParams.
    private static readonly TEMPORARY_VALUE_PARAMS = new Set(['token', 'code', 'otp', 'secret']);

    private filterScreenshotablePages(pages: PageInfo[]): PageInfo[] {
        // Once we've logged in (auth is configured), the auth-group pages
        // (login, register, forgot-password, etc.) are pointless to shoot —
        // most just redirect away from an authenticated session anyway.
        // "register" is skipped by name too as a defensive backstop, since
        // it also requires a [token] param we have no real value for.
        const skipAuthPages = !!this.screenshotConfig?.auth;

        return pages.filter(p => {
            // Only screenshot page types
            if (p.type !== 'page') return false;

            if (skipAuthPages && p.routeGroups.includes('auth')) return false;
            if (p.segments.includes('register')) return false;

            // Handle dynamic routes
            if (p.isDynamic) {
                const requiredParams = this.extractRequiredParams(p.segments);
                if (requiredParams.some(param => NextJSPageScanner.TEMPORARY_VALUE_PARAMS.has(param))) {
                    return false;
                }
                return this.hasRequiredParams(requiredParams);
            }

            // Static pages are always screenshotable
            return true;
        });
    }

    private extractRequiredParams(segments: string[]): string[] {
        return segments
            .filter(segment => segment.startsWith('[') && segment.endsWith(']'))
            .map(segment => segment.slice(1, -1)); // Remove brackets
    }

    private hasRequiredParams(requiredParams: string[]): boolean {
        if (!this.screenshotConfig?.routeParams) return false;

        return requiredParams.every(param =>
            this.screenshotConfig!.routeParams![param] !== undefined
        );
    }

    private buildRouteUrl(pageInfo: PageInfo): string {
        if (!pageInfo.isDynamic) {
            return `${this.screenshotConfig!.baseUrl}${pageInfo.path}`;
        }

        // Replace dynamic segments with actual values
        let url = pageInfo.path;

        if (this.screenshotConfig?.routeParams) {
            for (const [param, value] of Object.entries(this.screenshotConfig.routeParams)) {
                if (value) {
                    url = url.replace(`[${param}]`, value);
                }
            }
        }

        return `${this.screenshotConfig!.baseUrl}${url}`;
    }

    private async performLogin(page: Page): Promise<void> {
        if (!this.screenshotConfig?.auth) return;

        const { loginUrl, credentials, selectors } = this.screenshotConfig.auth;

        console.log(`Logging in at ${loginUrl}...`);

        await page.goto(loginUrl);

        // Step 1: Enter email and click continue
        await page.waitForSelector(selectors.emailInput);
        await page.fill(selectors.emailInput, credentials.email);
        await page.click(selectors.submitButton);

        // Step 2: Wait for password field to appear and enter password
        await page.waitForSelector(selectors.passwordInput, { timeout: 10000 });
        await page.fill(selectors.passwordInput, credentials.password);
        await page.click(selectors.submitButton);

        // If the password has appeared in a known breach (HaveIBeenPwned
        // check), a security interstitial blocks the normal redirect until
        // "Continue Anyway" is clicked. Only shows up for breached
        // passwords, so this is a no-op the rest of the time.
        // isVisible() checks the current state instantly with no polling —
        // right after the click, the interstitial (which depends on an async
        // breach-check API call) usually hasn't rendered yet. waitFor()
        // actually polls until the timeout instead of checking once.
        const continueAnyway = page.getByRole('button', { name: /Continue Anyway/i });
        const breachWarningShown = await continueAnyway
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        if (breachWarningShown) {
            console.log('Password breach warning shown — continuing anyway');
            await continueAnyway.click();
        }

        // Wait for navigation after final login. Not 'networkidle' — the
        // dashboard opens persistent connections (SSE progress streams,
        // background polling), so the network never actually goes idle and
        // this would hang until Playwright's timeout every time.
        try {
            await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
        } catch (e) {
            console.error('[debug] login did not redirect. Current URL:', page.url());
            console.error('[debug] visible body text:', (await page.locator('body').innerText()).slice(0, 500));
            await page.screenshot({ path: './_debug_login_failure.png' });
            throw e;
        }
        console.log('Login completed');
    }

    private async screenshotPage(page: Page, pageInfo: PageInfo): Promise<void> {
        if (!this.screenshotConfig) return;

        try {
            const url = this.buildRouteUrl(pageInfo);
            console.log(`Capturing: ${url}`);

            // Not 'networkidle' — same reasoning as performLogin above. The
            // configured `delay` below covers giving the page time to settle.
            await page.goto(url, { waitUntil: 'load' });

            // Wait for specific selector if configured
            if (this.screenshotConfig.waitForSelector) {
                await page.waitForSelector(this.screenshotConfig.waitForSelector, { timeout: 10000 });
            }

            // Additional delay if configured
            if (this.screenshotConfig.delay) {
                await page.waitForTimeout(this.screenshotConfig.delay);
            }

            const screenshotPath = path.join(this.screenshotConfig.outputDir, this.generateScreenshotPath(pageInfo.path));
            this.ensureDirectoryExists(path.dirname(screenshotPath));

            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            pageInfo.screenshotPath = screenshotPath;
            console.log(`Screenshot saved: ${screenshotPath}`);

        } catch (error) {
            console.error(`Failed to screenshot ${pageInfo.path}:`, error);
        }
    }

    private generateScreenshotPath(routePath: string): string {
        // Mirror the route structure as real subfolders instead of one flat
        // underscore-joined filename per page — e.g. /dashboard/admin/about
        // becomes dashboard/admin/about.png instead of rootdashboard_admin_about.png.
        if (routePath === '/') return 'root.png';

        const segments = routePath
            .split('/')
            .filter(Boolean)
            .map(segment => segment.replace(/\[|\]/g, ''));

        const fileName = `${segments[segments.length - 1]}.png`;
        const dirSegments = segments.slice(0, -1);

        return dirSegments.length > 0 ? path.join(...dirSegments, fileName) : fileName;
    }

    private scanDirectory(dirPath: string, relativePath: string, pages: PageInfo[]): void {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const currentPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                if (this.shouldSkipDirectory(entry.name)) {
                    continue;
                }
                this.scanDirectory(fullPath, currentPath, pages);
            } else if (entry.isFile()) {
                const pageInfo = this.analyzeFile(fullPath, currentPath);
                if (pageInfo) {
                    pages.push(pageInfo);
                }
            }
        }
    }

    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules',
            '.next',
            '.git',
            'components',
            'lib',
            'utils',
            'styles',
            'public'
        ];
        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    private analyzeFile(fullPath: string, relativePath: string): PageInfo | null {
        const fileName = path.basename(relativePath);
        const dirPath = path.dirname(relativePath);

        const pageFilePatterns: Record<string, PageInfo['type']> = {
            'page.tsx': 'page',
            'page.ts': 'page',
            'page.jsx': 'page',
            'page.js': 'page',
            'layout.tsx': 'layout',
            'layout.ts': 'layout',
            'layout.jsx': 'layout',
            'layout.js': 'layout',
            'loading.tsx': 'loading',
            'loading.ts': 'loading',
            'loading.jsx': 'loading',
            'loading.js': 'loading',
            'error.tsx': 'error',
            'error.ts': 'error',
            'error.jsx': 'error',
            'error.js': 'error',
            'not-found.tsx': 'not-found',
            'not-found.ts': 'not-found',
            'not-found.jsx': 'not-found',
            'not-found.js': 'not-found',
            'route.tsx': 'route',
            'route.ts': 'route',
            'route.jsx': 'route',
            'route.js': 'route'
        };

        const fileType = pageFilePatterns[fileName];
        if (!fileType) {
            return null;
        }

        const segments = dirPath === '.' ? [] : dirPath.split(path.sep).filter(Boolean);
        const isDynamic = this.checkIfDynamic(segments);

        // Route groups — app/(auth)/login — are purely organizational and
        // never appear in the actual URL; Next.js strips them entirely.
        // Track their names separately so callers can identify e.g. "this
        // page is under the auth group" without them polluting the path.
        const routeGroups = segments
            .filter(segment => segment.startsWith('(') && segment.endsWith(')'))
            .map(segment => segment.slice(1, -1));

        const urlPath = segments.reduce((acc, segment) => {
            if (segment.startsWith('(') && segment.endsWith(')')) {
                return acc; // route group — not part of the URL
            }
            if (segment.startsWith('[') && segment.endsWith(']')) {
                const paramName = segment.slice(1, -1);
                return acc + '/[' + paramName + ']';
            }
            return acc + '/' + segment;
        }, '') || '/';

        return {
            path: urlPath,
            fullPath,
            type: fileType,
            isDynamic,
            segments,
            routeGroups
        };
    }

    private checkIfDynamic(segments: string[]): boolean {
        // Route groups ((auth)) are organizational, not a URL param — only
        // actual [param] segments make a route "dynamic".
        return segments.some(segment => segment.startsWith('[') && segment.endsWith(']'));
    }

    private buildRouteTree(pages: PageInfo[]): RouteTreeNode[] {
        const root: RouteTreeNode[] = [];

        const sortedPages = [...pages].sort((a, b) =>
            a.segments.length - b.segments.length
        );

        for (const page of sortedPages) {
            const segments = page.segments;
            let currentLevel = root;
            let currentPath = '';

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                currentPath += '/' + segment;

                let node = currentLevel.find(n => n.name === segment);

                if (!node) {
                    node = {
                        name: segment,
                        path: currentPath,
                        type: i === segments.length - 1 ? page.type : 'page',
                        isDynamic: segment.startsWith('['),
                        children: []
                    };
                    currentLevel.push(node);
                }

                currentLevel = node.children;
            }

            if (segments.length === 0) {
                const rootNode: RouteTreeNode = {
                    name: 'root',
                    path: '/',
                    type: page.type,
                    isDynamic: false,
                    children: []
                };
                root.push(rootNode);
            }
        }

        return root;
    }

    public generateTreeView(nodes: RouteTreeNode[], prefix: string = ''): string {
        let result = '';

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isLastNode = i === nodes.length - 1;
            const connector = isLastNode ? '└── ' : '├── ';
            const dynamicIndicator = node.isDynamic ? ' (dynamic)' : '';

            result += `${prefix}${connector}${node.name} [${node.type}]${dynamicIndicator}\n`;

            if (node.children.length > 0) {
                const childPrefix = prefix + (isLastNode ? '    ' : '│   ');
                result += this.generateTreeView(node.children, childPrefix);
            }
        }

        return result;
    }
}

// `npm run dev` serves on 3001 (see package.json), not Next's default 3000.
const BASE_URL = process.env.SCAN_BASE_URL || 'http://localhost:3001';

async function buildConfig(): Promise<ScreenshotConfig> {
    // The previous hardcoded projectId ('cmhy3qagr000dvt7kd5hoicrk') didn't
    // exist in the current database — look up a real one each run instead
    // of relying on an ID that goes stale the moment the seed data changes.
    const project = await db.project.findFirst({ select: { id: true, name: true } });
    if (!project) {
        throw new Error('No projects found in the database — create one before running this script.');
    }
    console.log(`Using project "${project.name}" (${project.id}) for dynamic routes`);

    return {
        baseUrl: BASE_URL,
        outputDir: './screenshots',
        auth: {
            loginUrl: BASE_URL,
            credentials: {
                email: 'admin@changerawr.com', // admin seeder account email
                password: 'password123' // admin seeder account password
            },
            selectors: {
                emailInput: 'input[type="email"]',
                passwordInput: 'input[type="password"]',
                submitButton: 'button[type="submit"]'
            }
        },
        viewport: {
            width: 1920,
            height: 1080
        },
        // waitForSelector: '[data-testid="page-loaded"]', // disabled until eventually implemented
        delay: 1000, // Optional: additional delay in ms
        routeParams: {
            projectId: project.id,
        }
    };
}

async function main(): Promise<void> {
    try {
        const config = await buildConfig();
        const scanner = new NextJSPageScanner('./app', config);
        const routeTree = await scanner.scanPages();

        if (routeTree.length === 0) {
            console.log('No pages found in the app directory.');
        } else {
            console.log('\nRoute Tree:');
            console.log(scanner.generateTreeView(routeTree));
        }

    } catch (error) {
        console.error('Error scanning pages:', error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

if (require.main === module) {
    main();
}

export {NextJSPageScanner};
export type { PageInfo, RouteTreeNode, ScreenshotConfig };
