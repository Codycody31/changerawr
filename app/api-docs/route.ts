import { ApiReference } from '@scalar/nextjs-api-reference'

const config = {
    url: '/swagger.json',
    theme: 'kepler',
    mcp: {
        name: 'My API',
        url: 'https://mcp.example.com',
        disabled: true,
    },
    telemetry: false,
    showDeveloperTools: 'never',
    agent: {
        disabled: true,
    },
}

// @ts-ignore
export const GET = ApiReference(config)