import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
    // Clean the database
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

    console.log('Seeding completed:', {
        admin: { email: admin.email, role: admin.role },
        staff: { email: staff.email, role: staff.role },
        invitation: { token: 'test-invitation-token', email: 'newstaff@changerawr.com' }
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