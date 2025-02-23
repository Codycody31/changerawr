import { NextResponse } from "next/server";
import {db} from "@/lib/db";

/**
 * @method GET
 * @description Gets the widget script for a public project
 * @query {
 *   projectId: String, required
 * }
 * @response 200 Widget script content
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

        // Generate the widget script
        const widgetScript = `
        (function() {
            const scriptEl = document.currentScript;
            const projectId = "${projectId}";
            
            // Get configuration from data attributes
            const config = {
                theme: scriptEl.getAttribute('data-theme') || 'light',
                isPopup: scriptEl.getAttribute('data-popup') === 'true',
                position: scriptEl.getAttribute('data-position') || 'bottom-right',
                maxEntries: parseInt(scriptEl.getAttribute('data-max-entries') || '3', 10),
                maxHeight: scriptEl.getAttribute('data-max-height') || '400px',
                trigger: scriptEl.getAttribute('data-trigger'),
                hidden: scriptEl.getAttribute('data-hidden') === 'true'
            };

            // Create and inject styles
            const style = document.createElement('style');
            style.textContent = \`
                .changerawr-widget {
                    font-family: system-ui, -apple-system, sans-serif;
                    background: var(--theme) === 'dark' ? '#1a1a1a' : '#ffffff';
                    color: var(--theme) === 'dark' ? '#ffffff' : '#000000';
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    max-height: \${config.maxHeight};
                    overflow-y: auto;
                    width: 100%;
                    max-width: 400px;
                }
                
                .changerawr-widget.popup {
                    position: fixed;
                    \${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                    \${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    display: none;
                    z-index: 9999;
                }
                
                .changerawr-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: none;
                    z-index: 9998;
                }
            \`;
            document.head.appendChild(style);

            // Create widget container
            const widget = document.createElement('div');
            widget.className = 'changerawr-widget' + (config.isPopup ? ' popup' : '');
            
            if (config.isPopup) {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.className = 'changerawr-overlay';
                document.body.appendChild(overlay);
                
                // Setup trigger button listener
                if (config.trigger) {
                    const triggerBtn = document.getElementById(config.trigger);
                    if (triggerBtn) {
                        triggerBtn.addEventListener('click', () => {
                            widget.style.display = 'block';
                            overlay.style.display = 'block';
                        });
                        
                        overlay.addEventListener('click', () => {
                            widget.style.display = 'none';
                            overlay.style.display = 'none';
                        });
                    }
                }
            }

            // Initially hide if specified
            if (config.hidden) {
                widget.style.display = 'none';
            }

            // Insert widget into DOM
            if (config.isPopup) {
                document.body.appendChild(widget);
            } else {
                scriptEl.parentNode.insertBefore(widget, scriptEl);
            }

            // Fetch and display changelog entries
            fetch(\`${process.env.NEXT_PUBLIC_APP_URL}/api/projects/\${projectId}/changelog\`)
                .then(response => response.json())
                .then(entries => {
                    const limitedEntries = entries.slice(0, config.maxEntries);
                    widget.innerHTML = limitedEntries.map(entry => \`
                        <div class="entry" style="padding: 16px; border-bottom: 1px solid #eee;">
                            <h3 style="margin: 0 0 8px 0;">\${entry.title}</h3>
                            <div style="color: #666;">\${entry.content}</div>
                        </div>
                    \`).join('');
                })
                .catch(error => {
                    console.error('Failed to load changelog entries:', error);
                    widget.innerHTML = '<div style="padding: 16px;">Failed to load updates</div>';
                });
        })();`;

        return new NextResponse(widgetScript, {
            status: 200,
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
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