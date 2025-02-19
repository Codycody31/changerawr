import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Helper function to generate sequential version numbers
function generateVersionSequence(count: number): string[] {
    const versions: string[] = []
    let major = 1
    let minor = 0
    let patch = 0

    for (let i = 0; i < count; i++) {
        const rand = Math.random()
        if (rand < 0.1 && i > 0) {
            major++
            minor = 0
            patch = 0
        } else if (rand < 0.3) {
            minor++
            patch = 0
        } else {
            patch++
        }
        versions.push(`v${major}.${minor}.${patch}`)
    }

    return versions.sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.slice(1).split('.').map(Number)
        const [bMajor, bMinor, bPatch] = b.slice(1).split('.').map(Number)

        if (aMajor !== bMajor) return aMajor - bMajor
        if (aMinor !== bMinor) return aMinor - bMinor
        return aPatch - bPatch
    })
}

// Helper function to generate sequential dates
function generateSequentialDates(count: number, startDate = new Date('2024-01-01')): Date[] {
    const dates: Date[] = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < count; i++) {
        currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 14) + 1)
        dates.push(new Date(currentDate))
    }

    return dates.sort((a, b) => a.getTime() - b.getTime())
}

// Helper function to generate markdown content
function generateMarkdownContent(): string {
    const features = [
        'Authentication system',
        'User dashboard',
        'API endpoints',
        'Search functionality',
        'Export feature',
        'Dark mode',
        'Notification system',
        'Analytics dashboard',
        'User roles',
        'Multi-factor authentication',
        'Performance optimizations',
        'Database indexing',
        'Caching system',
        'File upload system',
        'Error tracking'
    ]

    const impacts = [
        'Improves overall system security',
        'Enhances user experience',
        'Reduces server load',
        'Optimizes database performance',
        'Streamlines workflow',
        'Increases reliability'
    ]

    const sections = [
        {
            title: '### Changes',
            bullets: Math.floor(Math.random() * 3) + 2
        },
        {
            title: '### Technical Details',
            bullets: Math.floor(Math.random() * 2) + 1
        },
        {
            title: '### Migration Guide',
            bullets: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
        }
    ]

    return sections
        .map(section => {
            if (section.bullets === 0) return ''
            const bulletPoints = Array(section.bullets)
                .fill(null)
                .map(() => {
                    const feature = faker.helpers.arrayElement(features)
                    const impact = faker.helpers.arrayElement(impacts)
                    return `- **${feature}**: ${faker.lorem.sentence()} ${impact}.`
                })
            return `${section.title}\n\n${bulletPoints.join('\n')}`
        })
        .filter(Boolean)
        .join('\n\n')
}

async function main() {
    // Clean the database
    await prisma.changelogTag.deleteMany()
    await prisma.changelogEntry.deleteMany()
    await prisma.changelog.deleteMany()
    await prisma.project.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.settings.deleteMany()
    await prisma.user.deleteMany()
    await prisma.invitationLink.deleteMany()

    // Create admin user
    const adminPassword = await hashPassword('password123')
    const admin = await prisma.user.create({
        data: {
            email: 'admin@changerawr.com',
            password: adminPassword,
            name: 'Admin User',
            role: Role.ADMIN,
            settings: {
                create: {
                    theme: 'light'
                }
            }
        }
    })

    // Create multiple staff users
    const staffMembers = await Promise.all(
        Array(3).fill(null).map(async (_, index) => {
            const staffPassword = await hashPassword('password123')
            return prisma.user.create({
                data: {
                    email: `staff${index + 1}@changerawr.com`,
                    password: staffPassword,
                    name: `Staff User ${index + 1}`,
                    role: Role.STAFF,
                    settings: {
                        create: {
                            theme: faker.helpers.arrayElement(['light', 'dark', 'system'])
                        }
                    }
                }
            })
        })
    )

    // Create multiple invitation links
    const invitationEmails = ['dev@changerawr.com', 'qa@changerawr.com', 'pm@changerawr.com']
    await Promise.all(
        invitationEmails.map(email => {
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + faker.number.int({ min: 1, max: 7 }))

            return prisma.invitationLink.create({
                data: {
                    token: faker.string.alphanumeric(32),
                    email,
                    role: Role.STAFF,
                    createdBy: admin.id,
                    expiresAt: expiryDate
                }
            })
        })
    )

    // Create multiple projects
    const projects = await Promise.all(
        Array(3).fill(null).map((_, index) => {
            return prisma.project.create({
                data: {
                    name: faker.helpers.arrayElement([
                        'Mobile App',
                        'Web Dashboard',
                        'API Gateway',
                        'Analytics Platform',
                        'Admin Panel'
                    ]),
                    isPublic: faker.datatype.boolean(),
                    allowAutoPublish: faker.datatype.boolean(),
                    requireApproval: faker.datatype.boolean(),
                    defaultTags: ['feature', 'bugfix', 'improvement', 'breaking'],
                    changelog: {
                        create: {}
                    }
                }
            })
        })
    )

    // Create tags
    const tags = await Promise.all([
        prisma.changelogTag.create({ data: { name: 'Feature' } }),
        prisma.changelogTag.create({ data: { name: 'Bug Fix' } }),
        prisma.changelogTag.create({ data: { name: 'Improvement' } }),
        prisma.changelogTag.create({ data: { name: 'Breaking Change' } }),
        prisma.changelogTag.create({ data: { name: 'Security' } }),
        prisma.changelogTag.create({ data: { name: 'Performance' } }),
        prisma.changelogTag.create({ data: { name: 'Documentation' } })
    ])

    // Generate versions and dates for each project
    const entriesPerProject = 20
    const projectVersions = projects.reduce((acc, project) => ({
        ...acc,
        [project.id]: generateVersionSequence(entriesPerProject)
    }), {})

    const projectDates = projects.reduce((acc, project) => ({
        ...acc,
        [project.id]: generateSequentialDates(entriesPerProject)
    }), {})

    // Create changelog entries for each project
    const entries = await Promise.all(
        projects.flatMap(project =>
            Array(entriesPerProject).fill(null).map((_, index) => {
                const isPublished = index < entriesPerProject - 3 // Keep last 3 unpublished
                return prisma.changelogEntry.create({
                    data: {
                        title: faker.helpers.arrayElement([
                            'Implemented new authentication system',
                            'Enhanced security measures',
                            'Improved system performance',
                            'Updated user interface',
                            'Added dark mode support',
                            'Fixed critical issues',
                            'Expanded API functionality',
                            'Optimized search capabilities',
                            'Introduced export features',
                            'Revamped documentation'
                        ]),
                        content: generateMarkdownContent(),
                        version: (projectVersions as { [key: string]: any })[project.id][index],
                        publishedAt: isPublished ? (projectDates as { [key: string]: any })[project.id][index] : null,
                        changelog: {
                            connect: {
                                projectId: project.id
                            }
                        },
                        tags: {
                            connect: Array(faker.number.int({ min: 1, max: 3 }))
                                .fill(null)
                                .map(() => ({
                                    id: faker.helpers.arrayElement(tags).id
                                }))
                        }
                    }
                })
            })
        )
    )

    console.log('Seeding completed:', {
        admin: { email: admin.email, role: admin.role },
        staffCount: staffMembers.length,
        invitationCount: invitationEmails.length,
        projects: projects.map(p => ({ id: p.id, name: p.name })),
        entriesCount: entries.length,
        tagsCount: tags.length
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })