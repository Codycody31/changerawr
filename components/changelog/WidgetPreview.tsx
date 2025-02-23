import React, {FC, useState} from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X } from 'lucide-react';
import {WidgetConfig} from "@/app/dashboard/projects/[projectId]/integrations/widget/widget-config";

export interface WidgetPreviewProps {
    config: WidgetConfig; // Define the type for 'config' prop
    isOpen: boolean; // Define 'isOpen' prop
    onClose: () => void; // Define 'onClose' prop
}

const FAKE_ENTRIES = [
    {
        id: '1',
        title: 'New Dashboard Interface',
        content: 'We\'ve completely redesigned the dashboard for better usability and performance.',
        tags: [{ name: 'Feature' }]
    },
    {
        id: '2',
        title: 'Bug Fixes and Performance Improvements',
        content: 'Fixed several issues with the data synchronization and improved overall system performance.',
        tags: [{ name: 'Fix' }]
    },
    {
        id: '3',
        title: 'Dark Mode Support',
        content: 'Added system-wide dark mode support with automatic theme detection.',
        tags: [{ name: 'Enhancement' }]
    },
    {
        id: '4',
        title: 'API Rate Limiting',
        content: 'Implemented smart rate limiting to prevent API abuse while maintaining service quality.',
        tags: [{ name: 'Security' }]
    },
    {
        id: '5',
        title: 'Mobile Responsive Design',
        content: 'Enhanced mobile experience with improved layouts and touch interactions.',
        tags: [{ name: 'Feature' }]
    },
    {
        id: '6',
        title: 'Export Functionality',
        content: 'Added support for exporting data in CSV, PDF, and Excel formats.',
        tags: [{ name: 'Feature' }]
    },
    {
        id: '7',
        title: 'Search Optimization',
        content: 'Improved search algorithm for faster and more accurate results.',
        tags: [{ name: 'Enhancement' }]
    },
    {
        id: '8',
        title: 'Accessibility Updates',
        content: 'Implemented ARIA labels and improved keyboard navigation throughout the application.',
        tags: [{ name: 'Enhancement' }]
    },
    {
        id: '9',
        title: 'Authentication Enhancements',
        content: 'Added support for multi-factor authentication and SSO integration.',
        tags: [{ name: 'Security' }]
    },
    {
        id: '10',
        title: 'Real-time Notifications',
        content: 'Introduced real-time notifications for important updates and system events.',
        tags: [{ name: 'Feature' }]
    }
];

const ChangelogWidget: FC<WidgetPreviewProps> = ({ config, isOpen, onClose }) => {
    const [showRSSAlert, setShowRSSAlert] = useState(false);
    const isDark = config.theme === 'dark';

    return (
        <>
            <Card className={`
        w-[300px] overflow-hidden
        ${isDark ? '!bg-zinc-800 !text-white' : '!bg-white !text-gray-900'}
        ${config.isPopup ? 'fixed z-40' : 'relative'}
        ${config.isPopup ? (isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none') : ''}
        transition-all duration-200
      `}
                  style={{
                      ...(config.isPopup && {
                          bottom: config.position.includes('bottom') ? '1rem' : 'auto',
                          top: config.position.includes('top') ? '1rem' : 'auto',
                          right: config.position.includes('right') ? '1rem' : 'auto',
                          left: config.position.includes('left') ? '1rem' : 'auto'
                      })
                  }}
            >
                {/* Header */}
                <div className={`
          p-4 border-b flex justify-between items-center
          ${isDark ? '!border-zinc-700' : '!border-gray-100'}
        `}>
                    <span className="font-semibold">Latest Updates</span>
                    {config.isPopup && (
                        <button
                            onClick={onClose}
                            className={`
                hover:opacity-70 transition-opacity
                ${isDark ? '!text-gray-400' : '!text-gray-500'}
              `}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: config.maxHeight }}
                >
                    {FAKE_ENTRIES.slice(0, config.maxEntries).map((entry) => (
                        <div
                            key={entry.id}
                            className={`
                p-4 border-b last:border-b-0
                ${isDark ? '!border-zinc-700' : '!border-gray-100'}
              `}
                        >
                            {entry.tags?.[0] && (
                                <span className={`
                  inline-block px-2 py-1 text-xs rounded-md mb-2
                  ${isDark
                                    ? '!bg-blue-900/50 !text-blue-300'
                                    : '!bg-blue-100 !text-blue-700'}
                `}>
                  {entry.tags[0].name}
                </span>
                            )}
                            <h3 className={`
                font-medium mb-1
                ${isDark ? '!text-white' : '!text-gray-900'}
              `}>
                                {entry.title}
                            </h3>
                            <p className={`
                text-sm mb-2
                ${isDark ? '!text-gray-400' : '!text-gray-600'}
              `}>
                                {entry.content}
                            </p>
                            <a
                                href="#"
                                className={`
                  text-xs hover:opacity-70 transition-opacity
                  ${isDark
                                    ? '!text-blue-400'
                                    : '!text-blue-600'}
                `}
                            >
                                Read more
                            </a>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className={`
          p-3 text-xs border-t flex justify-between items-center
          ${isDark
                    ? '!border-zinc-700 !text-gray-400'
                    : '!border-gray-100 !text-gray-500'}
        `}>
                    <span>Powered by Changerawr</span>
                    <button
                        onClick={() => setShowRSSAlert(true)}
                        className="hover:opacity-70 transition-opacity"
                    >
                        RSS
                    </button>
                </div>
            </Card>

            {/* RSS Alert Modal */}
            {showRSSAlert && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Alert className={`
            max-w-md mx-4 relative
            ${isDark ? '!bg-zinc-900 !text-white' : '!bg-white !text-gray-900'}
          `}>
                        <button
                            onClick={() => setShowRSSAlert(false)}
                            className={`
                absolute top-2 right-2 hover:opacity-70 transition-opacity
                ${isDark ? '!text-gray-400' : '!text-gray-500'}
              `}
                        >
                            <X size={16} />
                        </button>
                        <AlertDescription>
                            RSS feed functionality is only available in the embedded widget. This is just a preview.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </>
    );
};

export default function WidgetPreview({ config }: { config: WidgetConfig }) {
    const [isOpen, setIsOpen] = useState(!config.isPopup);
    const isDark = config.theme === 'dark';

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className={`
        w-full max-w-3xl rounded-xl p-8 relative min-h-[500px] 
        flex flex-col items-center justify-center
        ${isDark ? '!bg-zinc-900' : '!bg-zinc-100'}
      `}>
                {/* Browser chrome decoration */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>

                {/* Trigger button for popup mode */}
                {config.isPopup && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        View Updates
                    </button>
                )}

                {/* Widget */}
                <ChangelogWidget
                    config={config}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />

                {/* Widget placeholder when in popup mode and closed */}
                {config.isPopup && !isOpen && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`
              border-2 border-dashed rounded-lg w-[300px] h-[400px] 
              flex items-center justify-center
              ${isDark ? 'border-zinc-700' : 'border-zinc-300'}
            `}>
                            <p className={`
                text-sm
                ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
              `}>
                                Click the button above to show the widget
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}