import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

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

    // Create staff user
    const staffPassword = await hashPassword('password123')
    const staff = await prisma.user.create({
        data: {
            email: 'staff@changerawr.com',
            password: staffPassword,
            name: 'Staff User',
            role: Role.STAFF,
            settings: {
                create: {
                    theme: 'light'
                }
            }
        }
    })

    // Create an active invitation link
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await prisma.invitationLink.create({
        data: {
            token: 'test-invitation-token',
            email: 'newstaff@changerawr.com',
            role: Role.STAFF,
            createdBy: admin.id,
            expiresAt: tomorrow
        }
    })

    // Create a project
    const project = await prisma.project.create({
        data: {
            name: 'Demo Project',
            isPublic: true,
            allowAutoPublish: true,
            requireApproval: true,
            defaultTags: ['feature', 'bugfix', 'improvement'],
            changelog: {
                create: {}
            }
        }
    })

    // Create tags
    const tags = await Promise.all([
        prisma.changelogTag.create({ data: { name: 'Feature' } }),
        prisma.changelogTag.create({ data: { name: 'Bug Fix' } }),
        prisma.changelogTag.create({ data: { name: 'Improvement' } }),
        prisma.changelogTag.create({ data: { name: 'Breaking Change' } }),
    ])

    // Create changelog entries
    const entries = []
    for (let i = 0; i < 10; i++) {
        const isPublished = Math.random() > 0.3
        const entry = await prisma.changelogEntry.create({
            data: {
                title: faker.helpers.arrayElement([
                    'Added new authentication system',
                    'Fixed critical security vulnerability',
                    'Improved performance by 50%',
                    'Updated user interface',
                    'Added dark mode support',
                    'Fixed database connection issues',
                    'Implemented new API endpoints',
                    'Enhanced search functionality',
                    'Added export feature',
                    'Updated documentation'
                ]),
                content: faker.lorem.paragraphs(2),
                version: `v${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
                publishedAt: isPublished ? faker.date.recent({ days: 30 }) : null,
                changelog: {
                    connect: {
                        projectId: project.id
                    }
                },
                tags: {
                    connect: [
                        { id: faker.helpers.arrayElement(tags).id },
                        { id: faker.helpers.arrayElement(tags).id }
                    ]
                }
            }
        })
        entries.push(entry)
    }

    console.log('Seeding completed:', {
        admin: { email: admin.email, role: admin.role },
        staff: { email: staff.email, role: staff.role },
        invitation: { token: 'test-invitation-token', email: 'newstaff@changerawr.com' },
        project: { id: project.id, name: project.name },
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