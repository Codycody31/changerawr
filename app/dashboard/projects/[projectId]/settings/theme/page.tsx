'use client'

import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Palette, Sparkles} from 'lucide-react'

export default function ThemeSettingsPage() {
    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <Palette className="h-4 w-4 text-primary"/>
                    </div>
                    <CardTitle className="text-xl">Theme</CardTitle>
                    <Badge variant="secondary" className="ml-auto">Coming soon</Badge>
                </div>
                <CardDescription>
                    Customize the look and feel of your public changelog
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50 py-16 text-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6"/>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Theming is on the way</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Soon you&apos;ll be able to choose colors, fonts, and layouts for this
                            project&apos;s public changelog. Check back later.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
