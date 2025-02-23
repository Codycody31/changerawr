# API Documentation Generation Guide

## Overview
When writing API documentation for routes, focus on creating clear, consistent, and comprehensive JSDoc comments that can be automatically parsed into OpenAPI/Swagger specifications. This guide outlines the required format and components for documenting API endpoints.

## Documentation Format
Each route handler should be documented using JSDoc comments with specific tags that map to OpenAPI/Swagger fields.

### Basic Structure
```typescript
/**
 * Brief description of the endpoint
 * @method HTTP_METHOD
 * @description Detailed description of what the endpoint does
 * @body Request body schema in JSON format
 * @response Status code and response schema
 * @error Error status codes and descriptions
 * @secure (optional) Security requirements
 */
```

## Required Tags

### @method
Specifies the HTTP method. Must be one of: GET, POST, PUT, DELETE, PATCH
```typescript
@method POST
```

### @description
Detailed description of the endpoint's functionality
```typescript
@description Authenticates a user and returns JWT tokens for subsequent requests
```

### @body (for POST/PUT/PATCH)
JSON schema of the request body. Must be valid JSON format.
```typescript
@body {
  "type": "object",
  "required": ["email", "password"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "description": "User's email address"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "description": "User's password"
    }
  }
}
```

### @response
Response schema for successful requests. Include status code and JSON schema.
```typescript
@response 200 {
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" }
  }
}
```

### @error
Error responses with status codes and descriptions.
```typescript
@error 400 Validation failed - Invalid input format
@error 401 Unauthorized - Invalid credentials
@error 404 Resource not found
```

### @secure (Optional)
Authentication requirements. Default is 'cookieAuth' for cookie-based authentication.
```typescript
@secure bearerAuth
```

## Examples

### GET Endpoint
```typescript
/**
 * @method GET
 * @description Retrieves user profile information
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "email": { "type": "string" },
 *     "role": { "type": "string" }
 *   }
 * }
 * @error 401 Unauthorized - Please log in
 * @error 404 User not found
 * @secure cookieAuth
 */
export async function GET() {
  // Implementation
}
```

### POST Endpoint
```typescript
/**
 * @method POST
 * @description Creates a new user account
 * @body {
 *   "type": "object",
 *   "required": ["email", "password", "name"],
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "User's email address"
 *     },
 *     "password": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "User's password"
 *     },
 *     "name": {
 *       "type": "string",
 *       "description": "User's full name"
 *     }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "email": { "type": "string" },
 *     "name": { "type": "string" }
 *   }
 * }
 * @error 400 Validation failed
 * @error 409 Email already exists
 */
export async function POST() {
  // Implementation
}
```

## Common Response Types

### Paginated Response
```typescript
@response 200 {
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" }
        }
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "total": { "type": "number" },
        "page": { "type": "number" },
        "pageSize": { "type": "number" },
        "totalPages": { "type": "number" }
      }
    }
  }
}
```

### Error Response
```typescript
@error 400 {
  "type": "object",
  "properties": {
    "error": { "type": "string" },
    "details": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    }
  }
}
```

## Best Practices

1. **Consistency**: Use consistent naming and formatting across all endpoints
2. **Completeness**: Document all possible response codes and edge cases
3. **Validation**: Always include validation requirements in the schema
4. **Security**: Specify authentication requirements for protected routes
5. **Examples**: Provide examples for complex request/response schemas
6. **Descriptions**: Write clear, concise descriptions for all parameters

## Common Schemas

Consider extracting common schemas to reduce duplication:

### User Schema
```typescript
const UserSchema = {
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "role": { "type": "string", "enum": ["user", "admin"] }
  }
}
```

### Pagination Schema
```typescript
const PaginationSchema = {
  "type": "object",
  "properties": {
    "page": { "type": "number", "minimum": 1 },
    "pageSize": { "type": "number", "minimum": 1 },
    "total": { "type": "number" },
    "totalPages": { "type": "number" }
  }
}
```

Remember to validate your documentation against the OpenAPI specification to ensure compatibility with Swagger UI and other API documentation tools.