"use client";

import { useEffect, useRef } from 'react';
import {RedocStandalone} from "redoc";

interface RedocDemoProps {
    url: string;
    title?: string;
    tryItOutConfig?: {
        enabled?: boolean;
        apiUrl?: string;
        headers?: Record<string, string>;
    };
}

declare global {
    interface Window {
        RedocTryItOut: {
            init: (
                specUrl: string,
                options: {
                    title?: string;
                    tryItOutEnabled?: boolean;
                    tryItOutBaseUrl?: string;
                    tryItOutHeaders?: Record<string, string>;
                    theme?: any;
                    nativeScrollbars?: boolean;
                    expandResponses?: string;
                    requiredPropsFirst?: boolean;
                    sortPropsAlphabetically?: boolean;
                    showExtensions?: boolean;
                    hideHostname?: boolean;
                    menuToggle?: boolean;
                    jsonSampleExpandLevel?: number;
                    hideSingleRequestSampleTab?: boolean;
                    expandSingleSchemaField?: boolean;
                    pathInMiddlePanel?: boolean;
                    simpleOneOfTypeLabel?: boolean;
                    sideNavStyle?: string;
                },
                container: HTMLElement
            ) => void;
        };
    }
}

const RedocDemo = ({
                       url,
                       title = "API Documentation",
                       tryItOutConfig = { enabled: false }
                   }: RedocDemoProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptLoaded = useRef<boolean>(false);

    const theme = {
        typography: {
            fontSize: '15px',
            lineHeight: '1.7',
            fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
            fontWeightRegular: '400',
            fontWeightBold: '600',
            fontWeightLight: '300',
            headings: {
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                lineHeight: '1.4'
            },
            code: {
                fontSize: '13.5px',
                fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: '1.6',
                fontWeight: '400'
            },
            links: {
                color: 'inherit',
                visited: 'inherit',
                hover: 'inherit'
            }
        },
        sidebar: {
            width: '280px',
            background: 'inherit'
        },
        rightPanel: {
            width: '40%'
        }
    };

    useEffect(() => {
        if (!containerRef.current || !tryItOutConfig.enabled) return;

        const initRedoc = () => {
            if (!window.RedocTryItOut || !containerRef.current) return;

            const options = {
                title,
                theme,
                tryItOutEnabled: true,
                tryItOutBaseUrl: tryItOutConfig.apiUrl,
                tryItOutHeaders: tryItOutConfig.headers,
                nativeScrollbars: true,
                expandResponses: "200,201",
                requiredPropsFirst: true,
                sortPropsAlphabetically: true,
                showExtensions: true,
                hideHostname: false,
                menuToggle: true,
                jsonSampleExpandLevel: 3,
                hideSingleRequestSampleTab: false,
                expandSingleSchemaField: true,
                pathInMiddlePanel: true,
                simpleOneOfTypeLabel: true,
                sideNavStyle: 'path-only'
            };

            window.RedocTryItOut.init(url, options, containerRef.current);
        };

        if (scriptLoaded.current) {
            initRedoc();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/redoc-try-it-out/dist/try-it-out.min.js';
            script.onload = () => {
                scriptLoaded.current = true;
                initRedoc();
            };
            document.body.appendChild(script);
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [url, title, tryItOutConfig]);

    if (!tryItOutConfig.enabled) {
        return (
            <div id="redoc_container" ref={containerRef}>
                <RedocStandalone
                    specUrl={url}
                    options={{
                        title,
                        theme,
                        nativeScrollbars: true,
                        expandResponses: "200,201",
                        requiredPropsFirst: true,
                        sortPropsAlphabetically: true,
                        showExtensions: true,
                        hideHostname: false,
                        menuToggle: true,
                        jsonSampleExpandLevel: 3,
                        hideSingleRequestSampleTab: false,
                        expandSingleSchemaField: true,
                        pathInMiddlePanel: true,
                        simpleOneOfTypeLabel: true,
                        sideNavStyle: 'path-only'
                    }}
                />
            </div>
        );
    }

    return <div id="redoc_container" ref={containerRef} className="min-h-screen" />;
};

export default RedocDemo;