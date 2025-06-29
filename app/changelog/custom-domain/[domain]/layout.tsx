import {Metadata} from 'next'
import React from "react";
import ScrollToTopButton from "@/components/changelog/ScrollToTopButton";
import {getDomainByDomain} from '@/lib/custom-domains/service';

interface CustomDomainLayoutProps {
    params: Promise<{
        domain: string;
        path?: string[];
    }>
    children: React.ReactNode
}

export async function generateMetadata(
    {params}: CustomDomainLayoutProps
): Promise<Metadata> {
    const {domain: encodedDomain} = await params;
    const domain = decodeURIComponent(encodedDomain);

    const domainConfig = await getDomainByDomain(domain);

    if (!domainConfig || !domainConfig.verified) {
        return {
            metadataBase: new URL(`https://${domain}`),
        };
    }

    return {
        metadataBase: new URL(`https://${domain}`),
        alternates: {
            types: {
                'application/rss+xml': `/rss.xml`,
            },
        },
    };
}

export default function CustomDomainLayout({children}: CustomDomainLayoutProps) {
    return (
        <div className="container mx-auto py-8">
            <ScrollToTopButton/>
            {children}
        </div>
    );
}