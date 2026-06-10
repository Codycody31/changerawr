'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Terminal,
  X,
  Trash2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { getDevTools } from '@/lib/services/core/markdown/dev-tools-connector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'render' | 'parse';
  timestamp: Date;
  message: string;
  data?: any;
}

export function DevToolsConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showDisconnectedModal, setShowDisconnectedModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const devTools = getDevTools();

  // Check if there are any linked extensions
  const { data: extensions, isLoading } = useQuery({
    queryKey: ['extensions'],
    queryFn: async () => {
      const res = await fetch('/api/extensions/list');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const hasLinkedExtensions = extensions?.some((ext: any) => ext.isLinked) || false;

  // Debug logging
  useEffect(() => {
    // console.log('[DevToolsConsole] Extensions:', extensions);
    // console.log('[DevToolsConsole] Has linked:', hasLinkedExtensions);
    // console.log('[DevToolsConsole] Is loading:', isLoading);
    // console.log('[DevToolsConsole] NODE_ENV:', process.env.NODE_ENV);
  }, [extensions, hasLinkedExtensions, isLoading]);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      const connected = devTools.isConnected();
      setIsConnected(connected);

      // Show modal if dev tools is open but not connected
      if (isOpen && !connected && !showDisconnectedModal) {
        setShowDisconnectedModal(true);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 2 seconds
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [isOpen, showDisconnectedModal]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const addMessage = (
    type: ConsoleMessage['type'],
    message: string,
    data?: any
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        timestamp: new Date(),
        message,
        data,
      },
    ]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'log':
        return <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />;
      case 'error':
        return <Circle className="h-3 w-3 fill-red-500 text-red-500" />;
      case 'warn':
        return <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />;
      case 'info':
        return <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />;
      case 'render':
        return <Circle className="h-3 w-3 fill-purple-500 text-purple-500" />;
      case 'parse':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      default:
        return <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />;
    }
  };

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'render':
        return 'text-purple-600 dark:text-purple-400';
      case 'parse':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Listen to dev tools messages
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = devTools.onMessage((message) => {
      addMessage(message.type, message.data);
    });

    return unsubscribe;
  }, [isOpen]);

  // Only show in development mode AND if there are linked extensions
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!hasLinkedExtensions) {
    return null;
  }

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 shadow-lg"
          size="lg"
          variant={isConnected ? 'default' : 'destructive'}
        >
          <Terminal className="h-5 w-5 mr-2" />
          Dev Tools
          {isConnected ? (
            <Wifi className="h-4 w-4 ml-2" />
          ) : (
            <WifiOff className="h-4 w-4 ml-2" />
          )}
        </Button>
      )}

      {/* Disconnected modal */}
      <Dialog open={showDisconnectedModal} onOpenChange={(open) => {
        setShowDisconnectedModal(open);
        // If closing modal and dev tools is still open but not connected, close dev tools too
        if (!open && isOpen && !isConnected) {
          setIsOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Dev Server Not Connected
            </DialogTitle>
            <DialogDescription>
              The Changerawr CLI dev server is not running or not connected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To use the dev tools console, you need to start the CLI dev server:
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-sm">
              <div className="text-green-600 dark:text-green-400">
                $ changerawr ext dev
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The dev server will:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Start a WebSocket server on port 3737</li>
              <li>Watch your extension files for changes</li>
              <li>Provide an interactive REPL console</li>
              <li>Send real-time debug information to this panel</li>
            </ul>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                Status:
                {isConnected ? (
                  <Badge variant="default" className="ml-2">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dev tools console panel */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 z-50 shadow-2xl border-2 w-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <div className="flex items-center gap-3">
              <Terminal className="h-4 w-4" />
              <span className="font-semibold text-sm">Dev Tools Console</span>
              {isConnected ? (
                <Badge variant="default" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {messages.length} messages
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                title="Clear console"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Console messages */}
          {!isMinimized && (
            <ScrollArea className="h-[400px]">
              <div ref={scrollRef} className="p-3 space-y-1 font-mono text-xs">
                {messages.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    No messages yet. {!isConnected && 'Start the CLI dev server to see debug output.'}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-2 py-1 hover:bg-muted/50 rounded px-2"
                    >
                      {getMessageIcon(msg.type)}
                      <span className="text-muted-foreground text-[10px] w-20 flex-shrink-0">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={`flex-1 ${getMessageColor(msg.type)}`}>
                        {msg.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}
    </>
  );
}
