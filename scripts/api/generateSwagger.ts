import fs from 'fs/promises';
import path from 'path';
import {glob} from 'glob';
import {parse} from 'comment-parser';
import type {OpenAPIV3} from 'openapi-types';
import chalk from 'chalk';
import 'dotenv/config'
import packageJson from "../../package.json";
import ora from 'ora';
import {appInfo} from "@/lib/app-info";

interface CommentTag {
    tag: string;
    name: string;
    type: string;
    optional: boolean;
    description: string;
    line: number;
    source: string[];
    problems: string[];
}

interface CommentBlock {
    description: string;
    tags: CommentTag[];
    source: string[];
    problems: string[];
    line: number;
}

interface OpenAPIDocumentWithExtensions extends OpenAPIV3.Document {
    'x-tagGroups'?: Array<{ name: string; tags: string[] }>;
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

interface SwaggerRoute {
    filePath: string;
    path: string;
    method: HttpMethod;
    docs: CommentBlock;
    section: string;
}

interface RouteReport {
    documented: string[];
    undocumented: string[];
    sections: Map<string, string[]>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = async (min: number = 200, max: number = 800) => {
    const delayTime = Math.floor(Math.random() * (max - min + 1) + min);
    await delay(delayTime);
};

// Ordered most-specific first
const PATH_SECTION_PATTERNS: [RegExp, string][] = [
    // Project sub-sections
    [/^projects\/[^/]+\/changelog/, 'Project Changelog'],
    [/^projects\/[^/]+\/integrations/, 'Project Integrations'],
    [/^projects\/[^/]+\/cli/, 'Project CLI'],
    [/^projects\/[^/]+\/analytics/, 'Project Analytics'],
    [/^projects\/[^/]+\/catch-up/, 'Project Catch-up'],
    [/^projects\/[^/]+\/api-keys/, 'Project API Keys'],
    [/^projects/, 'Projects'],
    // Auth sub-sections
    [/^auth\/oauth/, 'Auth - OAuth'],
    [/^auth\/saml/, 'Auth - SAML'],
    [/^auth\/cli/, 'Auth - CLI'],
    [/^auth\/passkeys/, 'Auth - Passkeys'],
    [/^auth/, 'Auth'],
    // Admin sub-sections
    [/^admin\/users/, 'Admin - Users'],
    [/^admin\/config/, 'Admin - Config'],
    [/^admin\/api-keys/, 'Admin - API Keys'],
    [/^admin\/oauth/, 'Admin - OAuth'],
    [/^admin\/saml/, 'Admin - SAML'],
    [/^admin\/audit-logs/, 'Admin - Audit Logs'],
    [/^admin\/analytics/, 'Admin - Analytics'],
    [/^admin/, 'Admin'],
    // AI
    [/^ai/, 'AI'],
];

const TAG_GROUP_DEFINITIONS: { name: string; tags: string[] }[] = [
    {name: 'Authentication', tags: ['Auth', 'Auth - OAuth', 'Auth - SAML', 'Auth - CLI', 'Auth - Passkeys']},
    {name: 'Projects', tags: ['Projects', 'Project Changelog', 'Project Integrations', 'Project CLI', 'Project Analytics', 'Project Catch-up', 'Project API Keys']},
    {name: 'Admin', tags: ['Admin', 'Admin - Users', 'Admin - Config', 'Admin - API Keys', 'Admin - OAuth', 'Admin - SAML', 'Admin - Audit Logs', 'Admin - Analytics']},
    {name: 'Public', tags: ['Changelog', 'Subscribers']},
    {name: 'System', tags: ['System', 'Health', 'Dashboard', 'Analytics']},
    {name: 'Integrations', tags: ['Integrations']},
    {name: 'Other', tags: ['Setup', 'Requests', 'AI']},
];

function pathToSectionTitle(routePath: string): string {
    for (const [pattern, section] of PATH_SECTION_PATTERNS) {
        if (pattern.test(routePath)) return section;
    }

    const segment = routePath.split('/')[0];
    if (!segment) return 'General';
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function parseSchema(schema: Record<string, unknown>): OpenAPIV3.SchemaObject {
    if (typeof schema !== 'object' || !schema) {
        return {type: 'object'};
    }

    const schemaType = schema.type as OpenAPIV3.SchemaObject['type'];

    if (schemaType === 'array') {
        const result: OpenAPIV3.ArraySchemaObject = {
            type: 'array',
            items: schema.items ? parseSchema(schema.items as Record<string, unknown>) : {type: 'object'}
        };

        if (schema.description) {
            result.description = schema.description as string;
        }

        if (schema.example) {
            result.example = schema.example;
        }

        return result;
    } else {
        const result: OpenAPIV3.NonArraySchemaObject = {
            type: schemaType as OpenAPIV3.NonArraySchemaObjectType || 'object'
        };

        if (schema.description) {
            result.description = schema.description as string;
        }

        if (schema.example) {
            result.example = schema.example;
        }

        if (schema.enum) {
            result.enum = schema.enum as (string | number | boolean)[];
        }

        if (schema.format) {
            result.format = schema.format as string;
        }

        if (schema.properties) {
            result.properties = {};
            for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
                result.properties[key] = parseSchema(value as Record<string, unknown>);
            }
        }

        if (schema.required) {
            result.required = schema.required as string[];
        }

        if (schema.additionalProperties !== undefined) {
            result.additionalProperties = typeof schema.additionalProperties === 'object'
                ? parseSchema(schema.additionalProperties as Record<string, unknown>)
                : schema.additionalProperties as boolean;
        }

        return result;
    }
}

function tryParseJSON(str: string, defaultValue: unknown = undefined): unknown {
    try {
        if (typeof str === 'object') return str;
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

function extractFullDescription(tag: CommentTag): string {
    if (!tag.type && !tag.name) {
        return tag.description;
    }

    const parts = [tag.type, tag.name, tag.description].filter(Boolean);
    return parts.join(' ');
}

function httpStatusDescription(code: string): string {
    const n = parseInt(code, 10);
    if (n >= 500) return 'Server error';
    if (n >= 400) return 'Client error';
    if (n === 201) return 'Created';
    if (n === 204) return 'No content';
    return 'Successful response';
}

// Verb-like segments — treated as actions, not resource nouns
const ACTION_SEGMENTS = new Set([
    'login', 'logout', 'register', 'track', 'subscribe', 'unsubscribe',
    'verify', 'sync', 'link', 'unlink', 'generate', 'refresh', 'reset',
    'check', 'test', 'send', 'approve', 'schedule', 'cancel', 'revoke',
    'renew', 'issue', 'validate', 'authorize', 'callback', 'authenticate',
    'decrypt', 'encrypt', 'invite', 'export', 'import', 'restart',
]);

// Top-level namespace segments that add no useful context to a summary
const NAMESPACE_SEGMENTS = new Set([
    'auth', 'admin', 'api', 'public', 'internal', 'v1', 'v2',
]);

// Segments that map to a fixed readable label
const SEGMENT_LABELS: Record<string, string> = {
    'me': 'Current User',
    'cli': 'CLI',
    'ai': 'AI',
    'api-keys': 'API Keys',
    'api-key': 'API Key',
    'oauth': 'OAuth',
    'saml': 'SAML',
    'acme': 'ACME',
    'easypanel': 'EasyPanel',
};

function toTitle(segment: string): string {
    if (SEGMENT_LABELS[segment.toLowerCase()]) return SEGMENT_LABELS[segment.toLowerCase()];
    return segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toSingular(word: string): string {
    const keep = new Set(['status', 'analytics', 'access', 'progress', 'address', 'process', 'canvas', 'alias', 'cli']);
    if (keep.has(word.toLowerCase())) return word;
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y'; // entries → entry
    if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
    return word;
}

function routeToSummary(routePath: string, method: HttpMethod): string {
    const parts = routePath.split('/').filter(Boolean);
    const endsWithParam = parts[parts.length - 1]?.startsWith('{') ?? false;

    const segs = parts.filter(s => !s.startsWith('{'));
    const lastSeg = segs[segs.length - 1] ?? '';
    const prevSeg = segs[segs.length - 2] ?? '';

    // If the last segment is an action word, use it as the verb
    if (ACTION_SEGMENTS.has(lastSeg.toLowerCase())) {
        const action = toTitle(lastSeg);
        // Only add context from prevSeg if it's a meaningful resource (not a namespace)
        if (prevSeg && !ACTION_SEGMENTS.has(prevSeg) && !NAMESPACE_SEGMENTS.has(prevSeg)) {
            const ctx = toTitle(toSingular(prevSeg));
            return `${action} ${ctx}`;
        }
        return action;
    }

    const noun = endsWithParam ? toTitle(toSingular(lastSeg)) : toTitle(lastSeg);
    const singularNoun = toTitle(toSingular(lastSeg));

    switch (method) {
        case 'get':    return endsWithParam ? `Get ${noun}` : `List ${noun}`;
        case 'post':   return `Create ${singularNoun}`;
        case 'put':    return `Replace ${singularNoun}`;
        case 'patch':  return `Update ${singularNoun}`;
        case 'delete': return `Delete ${singularNoun}`;
    }
}

function extractBodySchema(tag: CommentTag): Record<string, unknown> | undefined {
    // comment-parser puts {…} content into tag.type; tag.description will be empty
    if (tag.description) {
        return tryParseJSON(tag.description) as Record<string, unknown> | undefined;
    }
    if (tag.type) {
        // Reconstruct the JSON object: content between the outer braces was stripped
        return tryParseJSON(`{${tag.type}}`) as Record<string, unknown> | undefined;
    }
    return undefined;
}

function processRouteOperation(route: SwaggerRoute, routeDocs: CommentBlock): OpenAPIV3.OperationObject {
    const operation: OpenAPIV3.OperationObject = {
        tags: [route.section],
        summary: '',
        responses: {},
        security: []
    };

    if (routeDocs.description) {
        operation.description = routeDocs.description;
    }

    for (const tag of routeDocs.tags) {
        switch (tag.tag) {
            case 'summary':
                operation.summary = extractFullDescription(tag);
                break;
            case 'description':
                operation.description = extractFullDescription(tag);
                break;
            case 'param':
                if (!operation.parameters) {
                    operation.parameters = [];
                }
                const paramLocation = tag.type.includes('body') ? 'body' :
                    tag.type.includes('path') ? 'path' :
                        tag.type.includes('header') ? 'header' : 'query';

                if (paramLocation === 'body') {
                    const schema = tryParseJSON(tag.description) as Record<string, unknown> | undefined;
                    operation.requestBody = {
                        required: !tag.optional,
                        content: {
                            'application/json': {
                                schema: schema ? parseSchema(schema) : {
                                    type: 'object' as const,
                                    properties: {
                                        [tag.name]: {
                                            type: tag.type.replace('body.', '').toLowerCase() as OpenAPIV3.NonArraySchemaObjectType,
                                            description: tag.description
                                        }
                                    }
                                }
                            }
                        }
                    };
                } else {
                    operation.parameters.push({
                        name: tag.name,
                        in: paramLocation as OpenAPIV3.ParameterObject['in'],
                        description: tag.description,
                        required: !tag.optional,
                        schema: {
                            type: tag.type.toLowerCase().replace(`${paramLocation}.`, '') as OpenAPIV3.NonArraySchemaObjectType
                        }
                    });
                }
                break;
            case 'body': {
                const bodySchema = extractBodySchema(tag);
                operation.requestBody = {
                    required: true,
                    content: {
                        'application/json': {
                            schema: bodySchema ? parseSchema(bodySchema) : {
                                type: 'object' as const,
                                description: tag.description
                            }
                        }
                    }
                };
                break;
            }
            case 'returns':
            case 'response': {
                const statusCode = tag.name || '200';
                const responseSchema = tryParseJSON(tag.description) as Record<string, unknown> | undefined;
                const type = (tag.type?.toLowerCase() || 'object') as OpenAPIV3.SchemaObject['type'];
                const schemaObj = responseSchema ? parseSchema(responseSchema) : (
                    type === 'array'
                        ? {type: 'array' as const, items: {type: 'object' as const}}
                        : {type: type as OpenAPIV3.NonArraySchemaObjectType, description: tag.description}
                );

                operation.responses[statusCode] = {
                    description: (responseSchema?.description as string) || httpStatusDescription(statusCode),
                    content: {
                        'application/json': {
                            schema: schemaObj
                        }
                    }
                };
                break;
            }
            case 'throws':
            case 'error': {
                const errorCode = tag.name || '400';
                const errorSchema = tryParseJSON(tag.description) as Record<string, unknown> | undefined;
                operation.responses[errorCode] = {
                    description: tag.description || 'Error response',
                    content: {
                        'application/json': {
                            schema: errorSchema ? parseSchema(errorSchema) : {
                                type: 'object' as const,
                                properties: {
                                    error: {
                                        type: 'string' as const
                                    },
                                    details: {
                                        type: 'array' as const,
                                        items: {
                                            type: 'object' as const,
                                            properties: {
                                                path: {type: 'string' as const},
                                                message: {type: 'string' as const}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                break;
            }
            case 'secure':
                operation.security = [{
                    [tag.name || 'cookieAuth']: []
                }];
                break;
        }
    }

    // Auto-generate summary from route path+method when @summary is absent
    if (!operation.summary) {
        operation.summary = routeToSummary(route.path, route.method);
    }

    return operation;
}

async function processRouteFiles(
    routeFiles: string[],
    API_DIR: string
): Promise<{
    routes: SwaggerRoute[],
    report: RouteReport,
    sections: Map<string, Set<string>>
}> {
    const routes: SwaggerRoute[] = [];
    const report: RouteReport = {
        documented: [],
        undocumented: [],
        sections: new Map()
    };
    const sections = new Map<string, Set<string>>();

    for (const file of routeFiles) {
        const filePath = path.join(API_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const comments = parse(content) as unknown as CommentBlock[];

        const routePath = path.dirname(file)
            .replace(/\\/g, '/')
            .replace(/\[([^\]]+)\]/g, '{$1}');

        const section = pathToSectionTitle(routePath);

        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        let hasDocumentation = false;

        // Build a map of method → line number so we can proximity-match comments
        const contentLines = content.split('\n');
        const methodLineMap = new Map<string, number>();
        contentLines.forEach((line, idx) => {
            for (const m of methods) {
                if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(line)) {
                    methodLineMap.set(m, idx + 1); // 1-indexed
                }
            }
        });

        // Track which comments are already claimed by a tag-matched method
        const claimedComments = new Set<CommentBlock>();

        for (const method of methods) {
            const methodPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
            if (methodPattern.test(content)) {
                // Primary: tag-based match
                let routeDocs = comments.find(comment =>
                    comment.description.includes(`@${method.toLowerCase()}`) ||
                    comment.tags.some(tag =>
                        (tag.tag === 'method' && tag.name.toLowerCase() === method.toLowerCase()) ||
                        tag.tag.toLowerCase() === method.toLowerCase()
                    )
                );

                if (routeDocs) {
                    claimedComments.add(routeDocs);
                } else {
                    // Fallback: find the comment block that ends immediately before this function
                    const fnLine = methodLineMap.get(method);
                    if (fnLine !== undefined) {
                        routeDocs = comments.find(comment => {
                            if (claimedComments.has(comment)) return false;
                            const lastLine = comment.source[comment.source.length - 1]?.number ?? -1;
                            // Comment must end within 3 lines before the function, and contain
                            // either useful tags or a plain-text description block
                            return lastLine < fnLine &&
                                fnLine - lastLine <= 3 &&
                                (comment.description.trim().length > 0 ||
                                    comment.tags.some(t => ['description', 'body', 'response', 'returns', 'error', 'throws', 'param', 'secure', 'summary'].includes(t.tag)));
                        });
                        if (routeDocs) claimedComments.add(routeDocs);
                    }
                }

                if (routeDocs) {
                    hasDocumentation = true;
                    routes.push({
                        filePath: file,
                        path: routePath,
                        method: method.toLowerCase() as HttpMethod,
                        docs: routeDocs,
                        section
                    });

                    if (!sections.has(section)) {
                        sections.set(section, new Set());
                    }
                    sections.get(section)!.add(routePath);

                    if (!report.sections.has(section)) {
                        report.sections.set(section, []);
                    }
                    report.sections.get(section)!.push(`${routePath} [${method}]`);
                } else {
                    report.undocumented.push(`${routePath} [${method}]`);
                }
            }
        }

        if (hasDocumentation) {
            report.documented.push(routePath);
        }
    }

    return {routes, report, sections};
}

async function generateSwaggerDocs() {
    const spinner = ora('Initializing Swagger documentation generator...').start();

    try {
        const API_DIR = path.join(process.cwd(), 'app/api');

        await randomDelay(500, 1000);
        spinner.text = 'Finding route files...';
        const routeFiles = await glob('**/route.ts', {
            cwd: API_DIR,
            ignore: ['**/_*.ts', '**/node_modules/**']
        });

        await randomDelay();
        spinner.text = 'Setting up OpenAPI structure...';
        const swagger: OpenAPIDocumentWithExtensions = {
            openapi: '3.0.0',
            info: {
                title: `${appInfo.name} API Documentation`,
                version: appInfo.version,
                description: `The official documentation for the ${appInfo.name} API. rawr`,
                contact: {
                    name: 'API Support',
                    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                }
            },
            servers: [
                {
                    url: `${process.env.NEXT_PUBLIC_APP_URL}`,
                    description: 'API Server'
                }
            ],
            paths: {},
            components: {
                schemas: {},
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'JWT Bearer token authentication'
                    },
                    cookieAuth: {
                        type: 'apiKey',
                        in: 'cookie',
                        name: 'accessToken',
                        description: 'Cookie-based authentication using accessToken'
                    }
                }
            },
            tags: [],
        };

        swagger['x-tagGroups'] = [];

        await randomDelay(1000, 2000);
        spinner.text = 'Processing route files...';
        const {routes, report, sections} = await processRouteFiles(routeFiles, API_DIR);

        await randomDelay();
        spinner.text = 'Organizing API sections...';

        const presentSections = new Set(sections.keys());

        // Add tags in a logical order (group order, then alphabetical within ungrouped)
        const groupedTags = new Set(TAG_GROUP_DEFINITIONS.flatMap(g => g.tags));
        const orderedSections: string[] = [];

        for (const group of TAG_GROUP_DEFINITIONS) {
            for (const tag of group.tags) {
                if (presentSections.has(tag)) orderedSections.push(tag);
            }
        }
        // Any sections not covered by groups (fallback)
        for (const section of [...presentSections].sort()) {
            if (!groupedTags.has(section)) orderedSections.push(section);
        }

        for (const section of orderedSections) {
            swagger.tags!.push({
                name: section,
                description: `Operations related to ${section}`
            });
        }

        // Build x-tagGroups, only including groups that have at least one present tag
        swagger['x-tagGroups'] = TAG_GROUP_DEFINITIONS
            .map(group => ({
                name: group.name,
                tags: group.tags.filter(t => presentSections.has(t))
            }))
            .filter(group => group.tags.length > 0);

        await randomDelay(800, 1500);
        spinner.text = 'Converting routes to OpenAPI format...';
        for (const route of routes) {
            const apiPath = `/api/${route.path}`;
            const pathItem: OpenAPIV3.PathItemObject = swagger.paths[apiPath] || {};

            const operation = processRouteOperation(route, route.docs);

            if (route.method === 'get') pathItem.get = operation;
            else if (route.method === 'post') pathItem.post = operation;
            else if (route.method === 'put') pathItem.put = operation;
            else if (route.method === 'delete') pathItem.delete = operation;
            else if (route.method === 'patch') pathItem.patch = operation;
            swagger.paths[apiPath] = pathItem;

            await delay(50);
        }

        await randomDelay(500, 1000);
        spinner.text = 'Writing documentation file...';
        const publicDir = path.join(process.cwd(), 'public');
        try {
            await fs.access(publicDir);
        } catch {
            await fs.mkdir(publicDir);
        }

        await fs.writeFile(
            path.join(publicDir, 'swagger.json'),
            JSON.stringify(swagger, null, 2)
        );

        await randomDelay(300, 600);
        spinner.succeed('Documentation generated successfully!');

        console.log('\nAPI Documentation Report:');
        console.log(`\nAPI Server URL: ${chalk.blue(process.env.NEXT_PUBLIC_APP_URL + '/api')}`);

        console.log('\nDocumented Routes by Section:');
        sections.forEach((routes, section) => {
            console.log(`\n${chalk.cyan(section)}:`);
            const sectionRoutes = report.sections.get(section) || [];
            sectionRoutes.forEach(route => {
                console.log(chalk.green(`✓ ${route}`));
            });
        });

        console.log('\nUndocumented Routes:');
        report.undocumented.forEach(route => {
            console.log(chalk.yellow(`⚠ ${route}`));
        });

        console.log('\nSummary:');
        console.log(`Total Routes: ${report.documented.length + report.undocumented.length}`);
        console.log(`Documented: ${chalk.green(report.documented.length)}`);
        console.log(`Undocumented: ${chalk.yellow(report.undocumented.length)}`);
        console.log(`Total Sections: ${chalk.cyan(sections.size)}`);

        console.log('\nSwagger documentation generated successfully in public/swagger.json!');
    } catch (error) {
        await randomDelay(200, 500);
        spinner.fail('Error generating documentation');
        console.error(chalk.red('Error details:'), error);
        process.exit(1);
    }
}

generateSwaggerDocs().catch(error => {
    console.error(chalk.red('Error generating documentation:'), error);
    process.exit(1);
});
