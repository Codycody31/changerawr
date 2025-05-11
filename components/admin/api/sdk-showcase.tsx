import React, { useState } from 'react';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ChevronRight, Code, CheckCircle, FileCode, Braces } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SDKShowcase = ({ className }: { className: string }) => {
    const [copied, setCopied] = useState({
        react: false,
        php: false
    });

    const handleCopy = (text: string, sdk: string) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [sdk]: true });

        toast({
            title: 'Command Copied',
            description: 'The installation command has been copied to your clipboard.',
        });

        setTimeout(() => {
            setCopied({ ...copied, [sdk]: false });
        }, 2000);
    };

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                    <Code className="h-5 w-5 mr-2" />
                    Integrations
                </CardTitle>
                <CardDescription>
                    Official tools to integrate with Changerawr
                </CardDescription>
            </CardHeader>

            <Tabs defaultValue="react" className="w-full">
                <TabsList className="mx-6 grid grid-cols-2 mb-1">
                    <TabsTrigger value="react">React SDK</TabsTrigger>
                    <TabsTrigger value="php">PHP SDK</TabsTrigger>
                </TabsList>

                <TabsContent value="react" className="space-y-4 mt-0">
                    <CardContent className="p-3 pt-6">
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-3">
                                    <Braces className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium mb-1">React Client Library</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Easily integrate Changerawr into your React applications with our official client library.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs uppercase font-medium text-muted-foreground">INSTALLATION</p>
                                <div className="rounded-md overflow-hidden border">
                                    <div className="flex items-center px-3 py-1.5 bg-muted/50 border-b">
                                        <div className="flex space-x-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                        </div>
                                        <div className="ml-auto">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6"
                                                onClick={() => handleCopy("npm install @changerawr/react", "react")}
                                            >
                                                {copied.react ? (
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 font-mono text-xs">
                                        <code>npm install @changerawr/react</code>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs uppercase font-medium text-muted-foreground">FEATURES</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>TypeScript support with full type definitions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>React hooks for all API endpoints</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>Fully tested and maintained API client</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                        <Button
                            className="w-full"
                            variant="outline"
                            asChild
                        >
                            <a
                                href="https://github.com/changerawr/react"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center"
                            >
                                View Documentation
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </a>
                        </Button>
                    </CardFooter>
                </TabsContent>

                <TabsContent value="php" className="space-y-4 mt-0">
                    <CardContent className="p-3 pt-6">
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-3">
                                    <FileCode className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium mb-1">PHP Client Library</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Simple and lightweight PHP SDK for integrating with the Changerawr API.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs uppercase font-medium text-muted-foreground">INSTALLATION</p>
                                <div className="rounded-md overflow-hidden border">
                                    <div className="flex items-center px-3 py-1.5 bg-muted/50 border-b">
                                        <div className="flex space-x-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30"></div>
                                        </div>
                                        <div className="ml-auto">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6"
                                                onClick={() => handleCopy("composer require changerawr/php", "php")}
                                            >
                                                {copied.php ? (
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 font-mono text-xs">
                                        <code>composer require changerawr/php</code>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs uppercase font-medium text-muted-foreground">FEATURES</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>Simple, lightweight API client</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>PHP 7.4+ compatible</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span>Minimal dependencies</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                        <Button
                            className="w-full"
                            variant="outline"
                            asChild
                        >
                            <a
                                href="https://github.com/changerawr/php"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center"
                            >
                                View Documentation
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </a>
                        </Button>
                    </CardFooter>
                </TabsContent>
            </Tabs>
        </Card>
    );
}

export default SDKShowcase;