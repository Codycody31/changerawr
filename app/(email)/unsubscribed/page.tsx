'use client';

import {JSX, Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {CheckCircle} from 'lucide-react';

function UnsubscribedContent(): JSX.Element {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    return (
        <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600"/>
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
                    <p className="text-sm text-gray-500">
                        You can always resubscribe by visiting the changelog page.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function UnsubscribedPage(): JSX.Element {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <Suspense fallback={
                <div className="h-96 w-full max-w-md rounded-lg bg-white/30 backdrop-blur-sm animate-pulse"/>
            }>
                <UnsubscribedContent/>
            </Suspense>
        </div>
    );
}