'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define types for the messages
interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInput(event.target.value);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setInput('');

        try {
            const response = await fetch('/api/experiments/mistral-ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);

        } catch (error) {
            console.error('Error fetching data:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center p-4 bg-gray-50">
            <Card className="w-full max-w-2xl h-[600px] flex flex-col p-4 gap-4">
                <h1 className="text-2xl font-bold text-center">Chat with Mistral</h1>

                <ScrollArea ref={scrollAreaRef as React.RefObject<HTMLDivElement>} className="flex-1 p-4 rounded-md bg-white">
                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500">Start the conversation!</div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex flex-col ${
                                        message.role === 'assistant' ? 'items-start' : 'items-end'
                                    }`}
                                >
                                    <div
                                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                                            message.role === 'assistant'
                                                ? 'bg-gray-100'
                                                : 'bg-blue-500 text-white'
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}