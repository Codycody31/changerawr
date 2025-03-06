import { cookies, headers } from 'next/headers'
import React from "react";

export default async function OAuthCallbackLayout({
                                                      children,
                                                  }: {
    children: React.ReactNode
}) {
    const headersList = await headers()
    const redirectUrl = headersList.get('X-OAuth-Redirect') || '/dashboard'

    // Get user data from auth context
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    // This will be serialized and passed to the client component
    const oauthData = {
        redirectTo: redirectUrl,
        hasToken: !!accessToken
    }

    return (
        <div>
            {/* Hidden div with the OAuth data for the client component */}
            <script
                id="oauth-data"
                type="application/json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(oauthData)
                }}
            />
            {children}
        </div>
    )
}