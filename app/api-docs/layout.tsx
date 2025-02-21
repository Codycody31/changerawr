import React from "react";

export const metadata = {
    title: "API Documentation",
    description: "API documentation using Redoc",
};

export default function ApiDocsLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return children;
}