/**
 * Extension Toolbar Manager
 *
 * Manages toolbar extension buttons with smart overflow handling.
 * Solves the problem of having 200+ extensions cluttering the toolbar.
 *
 * Features:
 * - Shows most frequently used/pinned extensions inline (max 8)
 * - Groups remaining extensions in searchable dropdown
 * - Tracks usage to promote popular extensions
 * - Allows pinning favorite extensions
 * - Categories for easy discovery
 */

import type { ExtensionButton } from '@/components/markdown-editor/MarkdownToolbar';

export interface ExtensionUsageStats {
    extensionId: string;
    useCount: number;
    lastUsed: number; // timestamp
    isPinned: boolean;
}

export interface ToolbarConfig {
    maxInlineButtons: number; // Default: 8
    pinnedExtensions: string[]; // Extension IDs
    usageStats: Record<string, ExtensionUsageStats>;
}

const DEFAULT_CONFIG: ToolbarConfig = {
    maxInlineButtons: 8,
    pinnedExtensions: [],
    usageStats: {},
};

const STORAGE_KEY = 'changerawr_toolbar_config';

/**
 * Extension Toolbar Manager
 * Manages which extensions appear inline vs in overflow menu
 */
export class ExtensionToolbarManager {
    private config: ToolbarConfig;

    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * Load toolbar configuration from localStorage
     */
    private loadConfig(): ToolbarConfig {
        if (typeof window === 'undefined') return DEFAULT_CONFIG;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return DEFAULT_CONFIG;

            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_CONFIG,
                ...parsed,
            };
        } catch (error) {
            console.error('Failed to load toolbar config:', error);
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Save toolbar configuration to localStorage
     */
    private saveConfig(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save toolbar config:', error);
        }
    }

    /**
     * Record extension usage
     */
    recordUsage(extensionId: string): void {
        if (!this.config.usageStats[extensionId]) {
            this.config.usageStats[extensionId] = {
                extensionId,
                useCount: 0,
                lastUsed: Date.now(),
                isPinned: false,
            };
        }

        this.config.usageStats[extensionId].useCount++;
        this.config.usageStats[extensionId].lastUsed = Date.now();
        this.saveConfig();
    }

    /**
     * Pin/unpin an extension
     */
    togglePin(extensionId: string): void {
        const index = this.config.pinnedExtensions.indexOf(extensionId);

        if (index === -1) {
            // Pin it
            this.config.pinnedExtensions.push(extensionId);

            // Update stats
            if (!this.config.usageStats[extensionId]) {
                this.config.usageStats[extensionId] = {
                    extensionId,
                    useCount: 0,
                    lastUsed: Date.now(),
                    isPinned: true,
                };
            } else {
                this.config.usageStats[extensionId].isPinned = true;
            }
        } else {
            // Unpin it
            this.config.pinnedExtensions.splice(index, 1);

            if (this.config.usageStats[extensionId]) {
                this.config.usageStats[extensionId].isPinned = false;
            }
        }

        this.saveConfig();
    }

    /**
     * Check if extension is pinned
     */
    isPinned(extensionId: string): boolean {
        return this.config.pinnedExtensions.includes(extensionId);
    }

    /**
     * Get extension usage score (for sorting)
     * Combines recency and frequency
     */
    private getUsageScore(stats: ExtensionUsageStats): number {
        const now = Date.now();
        const daysSinceLastUse = (now - stats.lastUsed) / (1000 * 60 * 60 * 24);

        // Recency score (decays over 30 days)
        const recencyScore = Math.max(0, 1 - (daysSinceLastUse / 30));

        // Frequency score (logarithmic to prevent domination)
        const frequencyScore = Math.log10(stats.useCount + 1);

        // Combined score (recency weighted 60%, frequency 40%)
        return (recencyScore * 0.6) + (frequencyScore * 0.4);
    }

    /**
     * Organize extensions into inline and overflow groups
     *
     * Returns:
     * - inline: Extensions to show in toolbar (pinned + most used)
     * - overflow: Extensions to show in dropdown menu
     */
    organizeExtensions(buttons: ExtensionButton[]): {
        inline: ExtensionButton[];
        overflow: ExtensionButton[];
    } {
        if (buttons.length <= this.config.maxInlineButtons) {
            // All fit inline
            return { inline: buttons, overflow: [] };
        }

        // Separate pinned and unpinned
        const pinned: ExtensionButton[] = [];
        const unpinned: ExtensionButton[] = [];

        for (const button of buttons) {
            const extensionId = button.extensionId || button.id;
            if (this.isPinned(extensionId)) {
                pinned.push(button);
            } else {
                unpinned.push(button);
            }
        }

        // Sort unpinned by usage score
        unpinned.sort((a, b) => {
            const statsA = this.config.usageStats[a.extensionId || a.id];
            const statsB = this.config.usageStats[b.extensionId || b.id];

            if (!statsA && !statsB) return 0;
            if (!statsA) return 1;
            if (!statsB) return -1;

            const scoreA = this.getUsageScore(statsA);
            const scoreB = this.getUsageScore(statsB);

            return scoreB - scoreA; // Descending
        });

        // Calculate how many unpinned can fit
        const availableSlots = Math.max(0, this.config.maxInlineButtons - pinned.length);
        const topUnpinned = unpinned.slice(0, availableSlots);
        const overflowUnpinned = unpinned.slice(availableSlots);

        return {
            inline: [...pinned, ...topUnpinned],
            overflow: overflowUnpinned,
        };
    }

    /**
     * Group overflow extensions by category for better organization
     */
    groupByCategory(buttons: ExtensionButton[]): Record<string, ExtensionButton[]> {
        const groups: Record<string, ExtensionButton[]> = {
            formatting: [],
            blocks: [],
            media: [],
            integrations: [],
            utilities: [],
            other: [],
        };

        for (const button of buttons) {
            const group = button.group || 'other';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(button);
        }

        // Remove empty groups
        return Object.fromEntries(
            Object.entries(groups).filter(([_, buttons]) => buttons.length > 0)
        );
    }

    /**
     * Search extensions by name/label
     */
    searchExtensions(buttons: ExtensionButton[], query: string): ExtensionButton[] {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return buttons;

        return buttons.filter(button =>
            button.label.toLowerCase().includes(lowerQuery) ||
            button.extensionName?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get max inline buttons setting
     */
    getMaxInlineButtons(): number {
        return this.config.maxInlineButtons;
    }

    /**
     * Set max inline buttons
     */
    setMaxInlineButtons(max: number): void {
        this.config.maxInlineButtons = Math.max(1, Math.min(20, max));
        this.saveConfig();
    }

    /**
     * Reset all toolbar settings
     */
    reset(): void {
        this.config = DEFAULT_CONFIG;
        this.saveConfig();
    }

    /**
     * Get all usage stats (for debugging/admin)
     */
    getUsageStats(): Record<string, ExtensionUsageStats> {
        return { ...this.config.usageStats };
    }
}

// Singleton instance
let instance: ExtensionToolbarManager | null = null;

export function getToolbarManager(): ExtensionToolbarManager {
    if (!instance) {
        instance = new ExtensionToolbarManager();
    }
    return instance;
}
