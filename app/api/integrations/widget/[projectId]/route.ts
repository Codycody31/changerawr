import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @method GET
 * @description Gets the widget loader script for a public project
 * @query {
 *   projectId: String, required
 * }
 * @response 200 Widget loader script content
 * @error 403 Project is not public
 * @error 404 Project not found
 * @error 500 An unexpected error occurred
 */
export async function GET(
    request: Request,
    context: { params: { projectId: string } }
) {
    try {
        const { projectId } = await (async () => context.params)();

        // Check if project exists and is public
        const project = await db.project.findUnique({
            where: {
                id: projectId
            },
            select: {
                id: true,
                isPublic: true,
            }
        });

        if (!project) {
            return new NextResponse(
                JSON.stringify({ error: 'Project not found' }),
                { status: 404 }
            );
        }

        if (!project.isPublic) {
            return new NextResponse(
                JSON.stringify({ error: 'Project is not public' }),
                { status: 403 }
            );
        }

        // Generate the loader script
        const script = `
        (function() {
            // Get current script
            const currentScript = document.currentScript;
            
            // Extract configuration from data attributes
            const options = {
                projectId: '${projectId}',
                theme: currentScript.getAttribute('data-theme') || 'light',
                position: currentScript.getAttribute('data-position') || 'bottom-right',
                maxHeight: currentScript.getAttribute('data-max-height') || '400px',
                isPopup: currentScript.getAttribute('data-popup') === 'true',
                trigger: currentScript.getAttribute('data-trigger'),
                maxEntries: currentScript.getAttribute('data-max-entries') 
                    ? parseInt(currentScript.getAttribute('data-max-entries'), 10) 
                    : 3,
                hidden: currentScript.getAttribute('data-popup') === 'true'
            };

            // Create initialization function
            const initWidget = () => {
                // Create container for widget
                const container = document.createElement('div');
                container.id = \`changerawr-widget-\${Math.random().toString(36).substr(2, 9)}\`;
                
                // Determine where to insert the container
                if (options.trigger && options.trigger !== 'immediate') {
                    // Find trigger button
                    const triggerButton = document.getElementById(options.trigger);
                    if (!triggerButton) {
                        console.error(\`Changerawr: Trigger button '\${options.trigger}' not found\`);
                        return;
                    }

                    // Append to body for popup-style widgets
                    document.body.appendChild(container);

                    // Setup trigger button
                    triggerButton.setAttribute('aria-expanded', 'false');
                    triggerButton.setAttribute('aria-haspopup', 'dialog');
                    triggerButton.setAttribute('aria-controls', container.id);
                } else {
                    // Insert next to script for immediate or inline widgets
                    currentScript.parentNode.insertBefore(container, currentScript);
                }

                // Load and initialize widget
                const script = document.createElement('script');
                script.src = '${process.env.NEXT_PUBLIC_APP_URL}/widget-bundle.js';
                script.onload = () => {
                    const widget = window.ChangerawrWidget.init({
                        container,
                        ...options
                    });

                    // Setup trigger button interaction if applicable
                    if (options.trigger && options.trigger !== 'immediate') {
                        const triggerButton = document.getElementById(options.trigger);
                        triggerButton.addEventListener('click', () => widget.toggle());
                        triggerButton.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                widget.toggle();
                            }
                        });
                    }
                };
                document.head.appendChild(script);
            };

            // Initialize based on document readiness
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initWidget);
            } else {
                initWidget();
            }
        })();`;

        return new NextResponse(script, {
            status: 200,
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET'
            }
        });

    } catch (error) {
        console.error('Failed to serve widget script:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to serve widget script' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle preflight CORS requests
export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}