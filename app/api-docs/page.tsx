"use client";

import dynamic from "next/dynamic";

const DynamicRedoc = dynamic(() => import("./RedocDemo"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse text-gray-600">
                Loading API Documentation...
            </div>
        </div>
    ),
});

export default function ApiDocsPage() {
    return <DynamicRedoc
        url="/swagger.json"
        tryItOutConfig={{
            enabled: true,
            apiUrl: process.env.NEXT_PUBLIC_API_URL + '/api',
            headers: {
                "Authorization": "Bearer ${token}"
            }
        }}
    />;
}