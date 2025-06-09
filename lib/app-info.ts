/**
 * Application information and metadata
 * This is a central place to manage version information and other app details.
 */

export const appInfo = {
    name: 'Changerawr',
    version: '0.3.7',
    status: 'Alpha',
    environment: process.env.NODE_ENV || 'development',
    license: 'MIT',
    releaseDate: '2025-03-19',

    framework: 'Next.js App Router',
    database: 'PostgreSQL with Prisma ORM',

    // Repository and documentation links
    repository: 'https://github.com/supernova3339/changerawr',
    documentation: '/api-docs',
};

/**
 * Get the application version with status
 */
export function getVersionString(): string {
    return `${appInfo.version}${appInfo.status ? ` (${appInfo.status})` : ''}`;
}

/**
 * Get the copyright year range
 */
export function getCopyrightYears(): string {
    const startYear = 2025; // Founding year
    const currentYear = new Date().getFullYear();
    return startYear === currentYear ? `${startYear}` : `${startYear}-${currentYear}`;
}
