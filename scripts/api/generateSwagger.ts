import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { parse } from 'comment-parser';
import type { OpenAPIV3 } from 'openapi-types';
import chalk from 'chalk';
import 'dotenv/config'
import packageJson from "../../package.json";
import ora from 'ora';

interface SwaggerRoute {
  filePath: string;
  path: string;
  method: string;
  docs: any;
  section: string;
}

interface RouteReport {
  documented: string[];
  undocumented: string[];
  sections: Map<string, string[]>;
}

// Helper function to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay helper for more realistic loading times
const randomDelay = async (min: number = 200, max: number = 800) => {
  const delayTime = Math.floor(Math.random() * (max - min + 1) + min);
  await delay(delayTime);
};

function pathToSectionTitle(path: string): string {
  const segment = path.split('/')[0];
  if (!segment) return 'General';

  return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
}

function parseSchema(schema: any): OpenAPIV3.SchemaObject {
  if (typeof schema !== 'object' || !schema) {
    return { type: 'object' };
  }

  const result: OpenAPIV3.SchemaObject = {
    type: schema.type || 'object'
  };

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.example) {
    result.example = schema.example;
  }

  if (schema.enum) {
    result.enum = schema.enum;
  }

  if (schema.format) {
    result.format = schema.format;
  }

  if (schema.properties) {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      result.properties[key] = parseSchema(value);
    }
  }

  if (schema.items) {
    result.items = parseSchema(schema.items);
  }

  if (schema.required) {
    result.required = schema.required;
  }

  if (schema.additionalProperties) {
    result.additionalProperties = typeof schema.additionalProperties === 'object'
        ? parseSchema(schema.additionalProperties)
        : schema.additionalProperties;
  }

  return result;
}

function tryParseJSON(str: string, defaultValue: any = undefined) {
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

function processRouteOperation(route: SwaggerRoute, routeDocs: any): OpenAPIV3.OperationObject {
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
        operation.summary = tag.text;
        break;
      case 'description':
        operation.description = tag.text;
        break;
      case 'param':
        if (!operation.parameters) {
          operation.parameters = [];
        }
        const paramLocation = tag.type.includes('body') ? 'body' :
            tag.type.includes('path') ? 'path' :
                tag.type.includes('header') ? 'header' : 'query';

        if (paramLocation === 'body') {
          const schema = tryParseJSON(tag.description);
          operation.requestBody = {
            required: !tag.optional,
            content: {
              'application/json': {
                schema: schema ? parseSchema(schema) : {
                  type: 'object',
                  properties: {
                    [tag.name]: {
                      type: tag.type.replace('body.', '').toLowerCase(),
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
            in: paramLocation,
            description: tag.description,
            required: !tag.optional,
            schema: {
              type: tag.type.toLowerCase().replace(`${paramLocation}.`, '')
            }
          });
        }
        break;
      case 'body':
        const bodySchema = tryParseJSON(tag.description);
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: bodySchema ? parseSchema(bodySchema) : {
                type: 'object',
                description: tag.description
              }
            }
          }
        };
        break;
      case 'returns':
      case 'response':
        const statusCode = tag.name || '200';
        const responseSchema = tryParseJSON(tag.description);
        operation.responses[statusCode] = {
          description: responseSchema?.description || 'Successful response',
          content: {
            'application/json': {
              schema: responseSchema ? parseSchema(responseSchema) : {
                type: tag.type?.toLowerCase() || 'object',
                description: tag.description
              }
            }
          }
        };
        break;
      case 'throws':
      case 'error':
        const errorCode = tag.name || '400';
        const errorSchema = tryParseJSON(tag.description);
        operation.responses[errorCode] = {
          description: tag.description || 'Error response',
          content: {
            'application/json': {
              schema: errorSchema ? parseSchema(errorSchema) : {
                type: 'object',
                properties: {
                  error: {
                    type: 'string'
                  },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        path: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        };
        break;
      case 'secure':
        operation.security = [{
          [tag.name || 'cookieAuth']: []
        }];
        break;
    }
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
    const comments = parse(content);

    const routePath = path.dirname(file)
        .replace(/\\/g, '/')
        .replace(/\[([^\]]+)\]/g, '{$1}');

    const section = pathToSectionTitle(routePath);

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    let hasDocumentation = false;

    for (const method of methods) {
      const methodPattern = new RegExp(`export\\s+async\\s+function\\s+${method}`);
      if (methodPattern.test(content)) {
        const routeDocs = comments.find(comment =>
            comment.description.includes(`@${method.toLowerCase()}`) ||
            comment.tags.some(tag =>
                (tag.tag === 'method' && tag.name.toLowerCase() === method.toLowerCase()) ||
                tag.tag.toLowerCase() === method.toLowerCase()
            )
        );

        if (routeDocs) {
          hasDocumentation = true;
          routes.push({
            filePath: file,
            path: routePath,
            method: method.toLowerCase(),
            docs: routeDocs,
            section
          });

          if (!sections.has(section)) {
            sections.set(section, new Set());
          }
          sections.get(section)!.add(routePath);

          // Add to report sections
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

  return { routes, report, sections };
}

async function generateSwaggerDocs() {
  const spinner = ora('Initializing Swagger documentation generator...').start();

  try {
    const API_DIR = path.join(process.cwd(), 'app/api');

    await randomDelay(500, 1000);
    spinner.text = 'Finding route files...';
    // Find all route files
    const routeFiles = await glob('**/route.ts', {
      cwd: API_DIR,
      ignore: ['**/_*.ts', '**/node_modules/**']
    });

    await randomDelay();
    spinner.text = 'Setting up OpenAPI structure...';
    const swagger: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Changerawr API Documentation',
        version: packageJson.version,
        description: 'The official documentation for the Changerawr API. rawr'
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
            bearerFormat: 'JWT'
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'accessToken'
          }
        }
      },
      tags: [],
      'x-tagGroups': []
    };

    await randomDelay(1000, 2000);
    spinner.text = 'Processing route files...';
    // Process route files
    const { routes, report, sections } = await processRouteFiles(routeFiles, API_DIR);

    await randomDelay();
    spinner.text = 'Organizing API sections...';
    // Add sections as tags and create tag groups
    const tagGroups: { name: string; tags: string[] }[] = [];

    sections.forEach((routes, section) => {
      // Add tag
      swagger.tags!.push({
        name: section,
        description: `Operations related to ${section}`
      });

      // Add tag group
      tagGroups.push({
        name: section,
        tags: [section]
      });
    });

    swagger["x-tagGroups"] = tagGroups;

    await randomDelay(800, 1500);
    spinner.text = 'Converting routes to OpenAPI format...';
    // Convert routes to OpenAPI format
    for (const route of routes) {
      const apiPath = `/api/${route.path}`;
      const pathItem: OpenAPIV3.PathItemObject = swagger.paths[apiPath] || {};

      // Process operation
      const operation = processRouteOperation(route, route.docs);

      pathItem[route.method] = operation;
      swagger.paths[apiPath] = pathItem;

      // Add a tiny delay for each route to show progress
      await delay(50);
    }

    await randomDelay(500, 1000);
    spinner.text = 'Writing documentation file...';
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir);
    }

    // Write swagger.json
    await fs.writeFile(
        path.join(publicDir, 'swagger.json'),
        JSON.stringify(swagger, null, 2)
    );

    await randomDelay(300, 600);
    spinner.succeed('Documentation generated successfully!');

    // Print report
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
    await randomDelay(200, 500); // Even add a delay before showing error
    spinner.fail('Error generating documentation');
    console.error(chalk.red('Error details:'), error);
    process.exit(1);
  }
}

// Execute the generator
generateSwaggerDocs().catch(error => {
  console.error(chalk.red('Error generating documentation:'), error);
  process.exit(1);
});