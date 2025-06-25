import { getDomainByDomain } from '@/lib/custom-domains/service'
import { notFound } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

interface CustomDomainUnsubscribedProps {
    params: Promise<{
        domain: string
    }>
    searchParams: Promise<{
        email?: string
    }>
}

export default async function CustomDomainUnsubscribedPage({
                                                               params,
                                                               searchParams
                                                           }: CustomDomainUnsubscribedProps) {
    const { domain: encodedDomain } = await params
    const { email } = await searchParams
    const domain = decodeURIComponent(encodedDomain)

    // Verify domain exists and is verified
    const domainConfig = await getDomainByDomain(domain)

    if (!domainConfig || !domainConfig.verified) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Successfully Unsubscribed
                    </h1>

                    {email && (
                        <p className="text-gray-600 mb-6">
                            <strong>{email}</strong> has been unsubscribed from email notifications.
                        </p>
                    )}

                    <p className="text-gray-600 mb-6">
                        You will no longer receive email updates from this changelog.
                    </p>

                    <div className="space-y-3">
                        <a
                            href={`https://${domain}`}
                            className="inline-block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Return to Changelog
                        </a>

                        <p className="text-sm text-gray-500">
                            You can always resubscribe by visiting the changelog page.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export async function generateMetadata({ params }: CustomDomainUnsubscribedProps) {
    const { domain: encodedDomain } = await params
    const domain = decodeURIComponent(encodedDomain)

    return {
        title: `Unsubscribed - ${domain}`,
        description: 'You have been successfully unsubscribed from email notifications.',
    }
}