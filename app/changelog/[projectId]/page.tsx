import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ChangelogEntries from '@/components/changelog/ChangelogEntries';
import ShareButton from '@/components/changelog/ShareButton';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Rss } from 'lucide-react';
import Link from 'next/link';

interface ChangelogResponse {
    project: {
        id: string;
        name: string;
        description?: string;
    };
    items: Array<{
        id: string;
        publishedAt: string;
        title?: string;
    }>;
    nextCursor?: string;
}

type ChangelogPageProps = {
    params: Promise<{ projectId: string }>;
};

async function getInitialData(projectId: string): Promise<ChangelogResponse | null> {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/changelog/${projectId}/entries`,
        { next: { revalidate: 300 } }
    );

    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch changelog');
    }

    return res.json();
}

export async function generateMetadata({ params }: ChangelogPageProps) {
    const { projectId } = await params;
    const data = await getInitialData(projectId);

    if (!data) {
        return { title: 'Changelog Not Found', description: 'The requested changelog could not be found.' };
    }

    return { title: `${data.project.name} Changelog`, description: data.project.description || 'Stay up to date with the latest updates.' };
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
    const { projectId } = await params;
    const data = await getInitialData(projectId);

    if (!data) notFound();

    return (
        <div className="container mx-auto py-12">
            <h1 className="text-4xl font-bold">{data.project.name} Changelog</h1>
            <p className="text-gray-600">{data.project.description}</p>
            <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    <span>{data.items.length} Updates</span>
                </div>
                <Link href={`/changelog/${projectId}/rss.xml`} className="flex items-center gap-2 text-blue-600">
                    <Rss className="w-5 h-5" /> RSS
                </Link>
                <ShareButton url={`${process.env.NEXT_PUBLIC_APP_URL}/changelog/${projectId}`} />
            </div>
            <Suspense fallback={<Skeleton className="h-48 w-full mt-4" />}>
                <ChangelogEntries projectId={projectId} />
            </Suspense>
        </div>
    );
}
