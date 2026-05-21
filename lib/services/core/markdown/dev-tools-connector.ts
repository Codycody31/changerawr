/**
 * Changerawr Dev Tools Connector
 *
 * Connects the browser-based markdown editor to the CLI dev server
 * for real-time debugging and development of extensions.
 */

export interface DevToolsMessage {
    type: 'log' | 'error' | 'warn' | 'info' | 'render' | 'parse';
    data: any;
    timestamp: number;
}

export type DevToolsMessageCallback = (message: DevToolsMessage) => void;

interface DevToolsClient {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    onRender: (type: string, content: string) => void;
    onParse: (rule: string, match: string, content?: string) => void;
    disconnect: () => void;
    isConnected: () => boolean;
    onMessage: (callback: DevToolsMessageCallback) => () => void;
}

class DevToolsConnector {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 2000;
    private port = 3737;
    private enabled = false;
    private messageCallbacks: Set<DevToolsMessageCallback> = new Set();

    constructor() {
        // Only enable in development mode
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            this.tryConnect();
        }
    }

    private tryConnect() {
        try {
            this.ws = new WebSocket(`ws://localhost:${this.port}`);

            this.ws.onopen = () => {
                console.log('[Dev Tools] Connected to CLI dev server');
                this.reconnectAttempts = 0;
                this.enabled = true;
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('[Dev Tools] Failed to parse message:', error);
                }
            };

            this.ws.onerror = () => {
                // Silently fail - dev server may not be running
                this.enabled = false;
            };

            this.ws.onclose = () => {
                this.enabled = false;

                // Attempt to reconnect only a few times
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.tryConnect(), this.reconnectDelay);
                }
            };
        } catch (error) {
            // Silently fail - dev server may not be running
            this.enabled = false;
        }
    }

    private handleServerMessage(message: any) {
        switch (message.type) {
            case 'eval':
                // Execute code sent from dev server
                try {
                    // eslint-disable-next-line no-eval
                    const result = eval(message.code);
                    this.send({
                        type: 'eval-result',
                        result: String(result),
                        success: true,
                    });
                } catch (error: any) {
                    this.send({
                        type: 'eval-result',
                        error: error.message,
                        success: false,
                    });
                }
                break;

            case 'breakpoint':
                if (message.action === 'add') {
                    console.log(`[Dev Tools] Breakpoint added: ${message.breakpoint.rule}`);
                } else if (message.action === 'clear') {
                    console.log('[Dev Tools] All breakpoints cleared');
                }
                break;

            case 'init':
                console.log(`[Dev Tools] Initialized with ${message.breakpoints?.length || 0} breakpoints`);
                break;
        }
    }

    private send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (error) {
                console.error('[Dev Tools] Failed to send message:', error);
            }
        }
    }

    private notifyCallbacks(message: DevToolsMessage) {
        this.messageCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('[Dev Tools] Callback error:', error);
            }
        });
    }

    public log(...args: any[]) {
        const message: DevToolsMessage = {
            type: 'log',
            data: args.map(arg => String(arg)).join(' '),
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public error(...args: any[]) {
        const message: DevToolsMessage = {
            type: 'error',
            data: args.map(arg => String(arg)).join(' '),
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public warn(...args: any[]) {
        const message: DevToolsMessage = {
            type: 'warn',
            data: args.map(arg => String(arg)).join(' '),
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public info(...args: any[]) {
        const message: DevToolsMessage = {
            type: 'info',
            data: args.map(arg => String(arg)).join(' '),
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public onRender(type: string, content: string) {
        const message: DevToolsMessage = {
            type: 'render',
            data: { type, content: content.substring(0, 200) },
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public onParse(rule: string, match: string, content?: string) {
        const message: DevToolsMessage = {
            type: 'parse',
            data: {
                rule,
                match: match.substring(0, 100),
                content: content?.substring(0, 200),
            },
            timestamp: Date.now(),
        };
        this.notifyCallbacks(message);
        if (this.enabled) {
            this.send(message);
        }
    }

    public breakpoint(rule: string, match: string, content: string) {
        if (!this.enabled) return;
        this.send({
            type: 'breakpoint',
            data: { rule, match, content },
        });
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.enabled = false;
        }
    }

    public isConnected(): boolean {
        return this.enabled && this.ws?.readyState === WebSocket.OPEN;
    }

    public onMessage(callback: DevToolsMessageCallback): () => void {
        this.messageCallbacks.add(callback);
        // Return unsubscribe function
        return () => {
            this.messageCallbacks.delete(callback);
        };
    }
}

// Singleton instance
let devToolsInstance: DevToolsConnector | null = null;

export function getDevTools(): DevToolsClient {
    if (!devToolsInstance) {
        devToolsInstance = new DevToolsConnector();
    }
    return devToolsInstance;
}

export function disconnectDevTools() {
    if (devToolsInstance) {
        devToolsInstance.disconnect();
        devToolsInstance = null;
    }
}
