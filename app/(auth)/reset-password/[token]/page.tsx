import { Suspense } from 'react';
import ResetPasswordForm from './reset-password-form';
import { LoadingSpinner } from '@/components/loading-spinner';

export default async function ResetPasswordPage({
                                                    params,
                                                }: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ResetPasswordForm token={token} />
        </Suspense>
    );
}
