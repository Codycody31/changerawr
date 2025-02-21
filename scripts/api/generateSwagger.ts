import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { parse } from 'comment-parser';
import type { OpenAPIV3 } from 'openapi-types';
import chalk from 'chalk';
import 'dotenv/config'
import packageJson from "../../package.json";

interface SwaggerRoute {
  filePath: string;
  path: string;
  method: string;
  docs: any;
}

interface RouteReport {
  documented: string[];
  undocumented: string[];
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

async function generateSwaggerDocs() {
  const API_DIR = path.join(process.cwd(), 'app/api');
  const report: RouteReport = {
    documented: [],
    undocumented: []
  };

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
    }
  };

  // Find all route files
  const routeFiles = await glob('**/route.ts', {
    cwd: API_DIR,
    ignore: ['**/_*.ts', '**/node_modules/**']
  });

  const routes: SwaggerRoute[] = [];

  for (const file of routeFiles) {
    const filePath = path.join(API_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse JSDoc comments
    const comments = parse(content);

    // Extract route information from file path
    const routePath = path.dirname(file)
        .replace(/\\/g, '/') // Convert Windows paths to forward slashes
        .replace(/\[([^\]]+)\]/g, '{$1}');

    // Check for HTTP methods in the file
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
            docs: routeDocs
          });
        } else {
          report.undocumented.push(`${routePath} [${method}]`);
        }
      }
    }

    if (hasDocumentation) {
      report.documented.push(routePath);
    }
  }

  // Convert routes to OpenAPI format
  for (const route of routes) {
    const apiPath = `/api/${route.path}`;
    const pathItem: OpenAPIV3.PathItemObject = swagger.paths[apiPath] || {};
    const operation: OpenAPIV3.OperationObject = {
      summary: '',
      responses: {},
      security: []
    };

    // Parse JSDoc description and tags
    if (route.docs.description) {
      operation.description = route.docs.description;
    }

    for (const tag of route.docs.tags) {
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

    pathItem[route.method] = operation;
    swagger.paths[apiPath] = pathItem;
  }

  // Ensure public directory exists
  const publicDir = path.join(process.cwd(), 'public');
  try {
    await fs.access(publicDir);
  } catch {
    await fs.mkdir(publicDir);
  }

  // Write swagger.json to public directory
  await fs.writeFile(
      path.join(publicDir, 'swagger.json'),
      JSON.stringify(swagger, null, 2)
  );

  // Print report
  console.log('\nAPI Documentation Report:');
  console.log(`\nAPI Server URL: ${chalk.blue(process.env.OPENAPI_URL_SERVER)}`);
  console.log('\nDocumented Routes:');
  report.documented.forEach(route => {
    console.log(chalk.green(`✓ /api/${route}`));
  });

  console.log('\nUndocumented Routes:');
  report.undocumented.forEach(route => {
    console.log(chalk.yellow(`⚠ /api/${route}`));
  });

  console.log('\nSummary:');
  console.log(`Total Routes: ${report.documented.length + report.undocumented.length}`);
  console.log(`Documented: ${chalk.green(report.documented.length)}`);
  console.log(`Undocumented: ${chalk.yellow(report.undocumented.length)}`);

  console.log('\nSwagger documentation generated successfully in public/swagger.json!');
}

// Execute the generator
generateSwaggerDocs().catch(error => {
  console.error(chalk.red('Error generating documentation:'), error);
  process.exit(1);
});