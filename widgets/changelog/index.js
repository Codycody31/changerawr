class ChangelogWidget {
    constructor(container, options) {
        const scriptOptions = this.getScriptOptions();

        this.container = container;
        this.options = {
            theme: 'light',
            maxHeight: '400px',
            position: 'bottom-right',
            isPopup: false,
            maxEntries: 3,
            hidden: false,
            ...scriptOptions,
            ...options
        };

        this.isOpen = false;
        this.isLoading = false;
        this.init();
    }

    getScriptOptions() {
        const currentScript = document.currentScript;
        if (!currentScript) return {};

        return {
            theme: currentScript.getAttribute('data-theme'),
            position: currentScript.getAttribute('data-position'),
            maxHeight: currentScript.getAttribute('data-max-height'),
            isPopup: currentScript.getAttribute('data-popup') === 'true',
            trigger: currentScript.getAttribute('data-trigger'),
            maxEntries: currentScript.getAttribute('data-max-entries')
                ? parseInt(currentScript.getAttribute('data-max-entries'), 10)
                : undefined,
            hidden: currentScript.getAttribute('data-popup') === 'true'
        };
    }

    updatePosition() {
        if (!this.options.isPopup) return;

        // Reset all position styles first
        this.container.style.removeProperty('top');
        this.container.style.removeProperty('bottom');
        this.container.style.removeProperty('left');
        this.container.style.removeProperty('right');

        // Apply new position based on option
        switch (this.options.position) {
            case 'top-right':
                this.container.style.setProperty('top', '20px', 'important');
                this.container.style.setProperty('right', '20px', 'important');
                break;
            case 'top-left':
                this.container.style.setProperty('top', '20px', 'important');
                this.container.style.setProperty('left', '20px', 'important');
                break;
            case 'bottom-left':
                this.container.style.setProperty('bottom', '20px', 'important');
                this.container.style.setProperty('left', '20px', 'important');
                break;
            case 'bottom-right':
            default:
                this.container.style.setProperty('bottom', '20px', 'important');
                this.container.style.setProperty('right', '20px', 'important');
                break;
        }
    }

    addStyles() {
        const styles = `
            .changerawr-widget {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                color: #1a1a1a;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                width: 300px;
                overflow: hidden;
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .changerawr-widget.popup {
                position: fixed !important;
                z-index: 9999 !important;
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            /* Position-specific transforms */
            .changerawr-widget.popup[data-position="top-right"],
            .changerawr-widget.popup[data-position="top-left"] {
                transform: translateY(-20px);
            }

            .changerawr-widget.popup[data-position="bottom-right"],
            .changerawr-widget.popup[data-position="bottom-left"] {
                transform: translateY(20px);
            }

            .changerawr-widget.popup.open {
                opacity: 1 !important;
                transform: translateY(0) !important;
                pointer-events: all !important;
            }

            .changerawr-widget.hidden {
                display: none !important;
            }

            .changerawr-widget.dark {
                color: #ffffff;
                background: #1a1a1a;
            }

            .changerawr-header {
                padding: 12px 16px;
                border-bottom: 1px solid #eaeaea;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .changerawr-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: inherit;
                opacity: 0.6;
                transition: opacity 0.2s;
            }

            .changerawr-close:hover {
                opacity: 1;
            }

            .changerawr-close:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-header {
                border-color: #333;
            }

            .changerawr-entries {
                max-height: var(--max-height, 400px);
                overflow-y: auto;
                padding: 8px 0;
            }

            .changerawr-entry {
                padding: 8px 16px;
                border-bottom: 1px solid #f5f5f5;
                opacity: 0;
                transform: translateY(10px);
                animation: slideIn 0.3s ease forwards;
            }

            .changerawr-entry:nth-child(2) {
                animation-delay: 0.1s;
            }

            .changerawr-entry:nth-child(3) {
                animation-delay: 0.2s;
            }

            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .dark .changerawr-entry {
                border-color: #333;
            }

            .changerawr-entry:last-child {
                border: none;
            }

            .changerawr-entry:focus-within {
                background: #f5f5f5;
            }

            .dark .changerawr-entry:focus-within {
                background: #333;
            }

            .changerawr-tag {
                display: inline-block;
                padding: 2px 8px;
                background: #e8f2ff;
                color: #0066ff;
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 4px;
            }

            .dark .changerawr-tag {
                background: #1a365d;
                color: #60a5fa;
            }

            .changerawr-entry-title {
                font-weight: 500;
                margin-bottom: 4px;
            }

            .changerawr-entry-content {
                color: #666;
                font-size: 13px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 8px;
            }

            .dark .changerawr-entry-content {
                color: #999;
            }

            .changerawr-read-more {
                color: #0066ff;
                text-decoration: none;
                font-size: 12px;
                display: inline-block;
                margin-top: 4px;
                padding: 2px;
            }

            .changerawr-read-more:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-read-more {
                color: #60a5fa;
            }

            .changerawr-read-more:hover {
                text-decoration: underline;
            }

            .changerawr-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100px;
            }

            .changerawr-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0066ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .dark .changerawr-spinner {
                border-color: #333;
                border-top-color: #60a5fa;
            }

            .changerawr-footer {
                padding: 8px 16px;
                border-top: 1px solid #eaeaea;
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .dark .changerawr-footer {
                border-color: #333;
                color: #999;
            }

            .changerawr-footer a {
                color: inherit;
                text-decoration: none;
            }

            .changerawr-footer a:hover {
                text-decoration: underline;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    async init() {
        this.addStyles();

        // Combine classes into a single assignment
        let classes = `changerawr-widget ${this.options.theme}`;
        if (this.options.isPopup) {
            classes += ' popup';
        }
        if (this.options.hidden) {
            classes += ' hidden';
        }
        this.container.className = classes;

        this.container.style.setProperty('--max-height', this.options.maxHeight);
        this.container.setAttribute('role', 'dialog');
        this.container.setAttribute('aria-label', 'Changelog updates');

        if (this.options.isPopup) {
            this.updatePosition();
        }

        this.render();
        await this.loadEntries();
        this.setupKeyboardNavigation();

        if (this.options.trigger) {
            this.setupTriggerButton();
        }
    }

    setupKeyboardNavigation() {
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }

            if (e.key === 'Tab') {
                const focusableElements = this.container.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    setupTriggerButton() {
        const triggerButton = document.getElementById(this.options.trigger);
        if (!triggerButton) {
            console.warn(`Changerawr: Trigger button with ID '${this.options.trigger}' not found`);
            return;
        }

        triggerButton.setAttribute('aria-expanded', 'false');
        triggerButton.setAttribute('aria-haspopup', 'dialog');
        triggerButton.setAttribute('aria-controls', this.container.id);

        triggerButton.addEventListener('click', () => {
            this.toggle();
            triggerButton.setAttribute('aria-expanded', this.isOpen.toString());
        });

        triggerButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
                triggerButton.setAttribute('aria-expanded', this.isOpen.toString());
            }
        });
    }

    render() {
        const header = document.createElement('div');
        header.className = 'changerawr-header';
        header.innerHTML = `
            <span>Latest Updates</span>
            ${this.options.isPopup ? `
                <button 
                    class="changerawr-close" 
                    aria-label="Close changelog"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path 
                            fill="currentColor" 
                            d="M8 6.586L4.707 3.293 3.293 4.707 6.586 8l-3.293 3.293 1.414 1.414L8 9.414l3.293 3.293 1.414-1.414L9.414 8l3.293-3.293-1.414-1.414L8 6.586z"
                        />
                    </svg>
                </button>
            ` : ''}
        `;
        this.container.appendChild(header);

        const entries = document.createElement('div');
        entries.className = 'changerawr-entries';
        entries.setAttribute('role', 'list');
        this.container.appendChild(entries);

        const footer = document.createElement('div');
        footer.className = 'changerawr-footer';
        footer.innerHTML = `
            <span>Powered by Changerawr</span>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/changelog/${this.options.projectId}/rss.xml" target="_blank" rel="noopener noreferrer">RSS</a>
        `;
        this.container.appendChild(footer);

        this.renderLoading();

        const closeButton = this.container.querySelector('.changerawr-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
    }

    renderLoading() {
        const container = this.container.querySelector('.changerawr-entries');
        container.innerHTML = `
            <div class="changerawr-loading">
                <div class="changerawr-spinner" role="status"></div>
            </div>
        `;
    }

    async loadEntries() {
        this.isLoading = true;
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/changelog/${this.options.projectId}/entries`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch entries');
            }

            const data = await response.json();
            this.renderEntries(data.items);
        } catch (error) {
            console.error('Failed to load changelog:', error);
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }

    renderEntries(entries) {
        const container = this.container.querySelector('.changerawr-entries');
        container.innerHTML = '';

        const entriesToShow = entries.slice(0, this.options.maxEntries);

        entriesToShow.forEach((entry) => {
            const entryEl = document.createElement('div');
            entryEl.className = 'changerawr-entry';
            entryEl.setAttribute('role', 'listitem');
            entryEl.setAttribute('tabindex', '0');

            if (entry.tags?.length) {
                const tagEl = document.createElement('div');
                tagEl.className = 'changerawr-tag';
                tagEl.textContent = entry.tags[0].name;
                entryEl.appendChild(tagEl);
            }

            const title = document.createElement('div');
            title.className = 'changerawr-entry-title';
            title.textContent = entry.title;
            entryEl.appendChild(title);

            const content = document.createElement('div');
            content.className = 'changerawr-entry-content';
            content.textContent = entry.content;
            entryEl.appendChild(content);

            const readMore = document.createElement('a');
            readMore.href = `${process.env.NEXT_PUBLIC_APP_URL}/changelog/${this.options.projectId}#${entry.id}`;
            readMore.className = 'changerawr-read-more';
            readMore.textContent = 'Read more';
            readMore.target = '_blank';
            readMore.setAttribute('aria-label', `Read more about ${entry.title}`);
            entryEl.appendChild(readMore);

            container.appendChild(entryEl);
        });
    }

    renderError() {
        const container = this.container.querySelector('.changerawr-entries');
        container.innerHTML = `
            <div class="changerawr-error">
                Failed to load changelog entries
                <br>
                <button class="changerawr-retry">
                    Try Again
                </button>
            </div>
        `;

        const retryButton = container.querySelector('.changerawr-retry');
        retryButton.addEventListener('click', () => this.loadEntries());
    }

    open() {
        if (!this.options.isPopup) return;

        this.isOpen = true;
        this.container.classList.remove('hidden');
        this.container.style.display = 'block';

        requestAnimationFrame(() => {
            this.container.classList.add('open');
        });

        this.previouslyFocused = document.activeElement;
        const firstFocusable = this.container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    close() {
        if (!this.options.isPopup) return;

        this.isOpen = false;
        this.container.classList.remove('open');

        const handleTransitionEnd = () => {
            if (!this.isOpen) {
                if (this.options.hidden) {
                    this.container.classList.add('hidden');
                }
                this.container.style.display = 'none';
            }
            this.container.removeEventListener('transitionend', handleTransitionEnd);
        };

        this.container.addEventListener('transitionend', handleTransitionEnd);

        if (this.previouslyFocused) {
            this.previouslyFocused.focus();
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

// Initialize scripts on page load
document.addEventListener('DOMContentLoaded', () => {
    const scripts = document.querySelectorAll('script[src*="/api/integrations/widget/"]');
    scripts.forEach(currentScript => {
        const projectIdMatch = currentScript.getAttribute('src').match(/\/api\/widget\/([^?]+)/);
        if (!projectIdMatch) return;

        const projectId = projectIdMatch[1];
        const position = currentScript.getAttribute('data-position') || 'bottom-right';

        // Validate position
        if (!['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(position)) {
            console.warn(`Invalid position '${position}', defaulting to bottom-right`);
        }

        const container = document.createElement('div');
        container.id = `changerawr-widget-${Math.random().toString(36).substr(2, 9)}`;

        // Insert container based on popup state
        const isPopup = currentScript.getAttribute('data-popup') === 'true';
        if (isPopup) {
            document.body.appendChild(container);
        } else {
            currentScript.parentNode.insertBefore(container, currentScript);
        }

        // Initialize widget with correct positioning
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const widget = new ChangelogWidget(container, {
            projectId,
            theme: currentScript.getAttribute('data-theme') || 'light',
            position: currentScript.getAttribute('data-position') || 'bottom-right',
            isPopup,
            trigger: currentScript.getAttribute('data-trigger'),
            maxEntries: currentScript.getAttribute('data-max-entries')
                ? parseInt(currentScript.getAttribute('data-max-entries'), 10)
                : 3,
            hidden: isPopup // Only hide initially if it's a popup
        });
    });
});

// Global initialization method
window.ChangerawrWidget = {
    init: (config) => {
        if (!config.container) {
            throw new Error('Container element is required');
        }

        if (!config.projectId) {
            throw new Error('Project ID is required');
        }

        // Validate position
        const position = config.position || 'bottom-right';
        if (!['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(position)) {
            console.warn(`Invalid position '${position}', defaulting to bottom-right`);
        }

        config.container.id = config.container.id ||
            `changerawr-widget-${Math.random().toString(36).substr(2, 9)}`;

        // Always ensure the container is properly positioned if it's a popup
        if (config.isPopup) {
            document.body.appendChild(config.container);
        }

        return new ChangelogWidget(config.container, {
            projectId: config.projectId,
            theme: config.theme || 'light',
            maxHeight: config.maxHeight || '400px',
            position: config.position || 'bottom-right',
            isPopup: config.isPopup || false,
            maxEntries: config.maxEntries || 3,
            hidden: config.isPopup || false, // Only hide initially if it's a popup
            trigger: config.trigger
        });
    }
};