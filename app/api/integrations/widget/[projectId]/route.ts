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
    context: { params: Promise<{ projectId: string }> }
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
            // Get current script and validate
            const currentScript = document.currentScript;
            if (!currentScript) {
                console.error('Changerawr: Could not initialize widget - script context not found');
                return;
            }
            
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

            // Validate position value
            if (!['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(options.position)) {
                console.warn(\`Changerawr: Invalid position '\${options.position}', defaulting to bottom-right\`);
                options.position = 'bottom-right';
            }

            // Create initialization function with proper container handling
            const initWidget = () => {
                // Create container with unique ID
                const container = document.createElement('div');
                container.id = \`changerawr-widget-\${Math.random().toString(36).substr(2, 9)}\`;
                
                // Handle container placement based on widget type
                const isPopupWithTrigger = options.isPopup && options.trigger && options.trigger !== 'immediate';
                
                if (isPopupWithTrigger) {
                    // Find trigger button for popup widgets
                    const triggerButton = document.getElementById(options.trigger);
                    if (!triggerButton) {
                        console.error(\`Changerawr: Trigger button '\${options.trigger}' not found\`);
                        return;
                    }

                    // Set initial container state for popup
                    container.style.setProperty('display', 'none', 'important');
                    document.body.appendChild(container);

                    // Setup trigger button accessibility
                    triggerButton.setAttribute('aria-expanded', 'false');
                    triggerButton.setAttribute('aria-haspopup', 'dialog');
                    triggerButton.setAttribute('aria-controls', container.id);
                } else {
                    // For inline widgets or immediate popups
                    currentScript.parentNode.insertBefore(container, currentScript);
                }

                // Load and initialize widget bundle
                const script = document.createElement('script');
                script.src = '${process.env.NEXT_PUBLIC_APP_URL}/widget-bundle.js';
                script.onload = () => {
                    // Initialize the widget with proper positioning
                    const widget = window.ChangerawrWidget.init({
                        container,
                        ...options,
                        // Ensure popup state is properly set
                        isPopup: isPopupWithTrigger
                    });

                    // Setup trigger button interactions if needed
                    if (isPopupWithTrigger) {
                        const triggerButton = document.getElementById(options.trigger);
                        
                        // Handle click
                        triggerButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            widget.toggle();
                            triggerButton.setAttribute('aria-expanded', widget.isOpen.toString());
                        });

                        // Handle keyboard
                        triggerButton.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                widget.toggle();
                                triggerButton.setAttribute('aria-expanded', widget.isOpen.toString());
                            }
                        });
                    }
                };

                script.onerror = () => {
                    console.error('Changerawr: Failed to load widget bundle');
                    container.innerHTML = 'Failed to load widget';
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