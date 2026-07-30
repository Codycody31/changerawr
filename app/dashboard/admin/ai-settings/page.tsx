'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, CheckCircle, Loader2, Lock, Copy, ExternalLink, Cloud, Tag, BrainCircuit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatePresence, motion } from 'framer-motion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Settings {
    enableAIAssistant: boolean
    aiApiKey: boolean | null
    changelogTaggerUrl: string | null
    changelogTaggerApiKey: boolean | null
    changelogTaggerAutoDetected: boolean
}

interface TrainingStatus {
    status: 'idle' | 'running' | 'done' | 'error'
    current_step: number
    total_steps: number
    current_epoch: number
    total_epochs: number
    loss: number | null
    progress_pct: number
    error: string
    records_used: number
}

type ActivePanel = 'secton' | 'tagger'

const MASKED = '••••••••••••••••'
const isMasked = (v: string) => v.includes('•')

function NavItem({ icon: Icon, label, configured, active, training, onClick }: {
    icon: React.ElementType
    label: string
    configured: boolean
    active: boolean
    training?: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                active ? 'bg-background shadow-sm border border-border/60' : 'hover:bg-muted/50 border border-transparent',
            )}
        >
            <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-medium flex-1', active && 'text-primary')}>{label}</span>
            {training
                ? <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-primary" />
                : configured && <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />}
        </button>
    )
}

export default function AISettingsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [panel, setPanel]                   = useState<ActivePanel>('secton')
    const [enabled, setEnabled]               = useState(false)
    const [sectonKey, setSectonKey]           = useState('')
    const [sectonKeyDirty, setSectonKeyDirty] = useState(false)
    const [taggerUrl, setTaggerUrl]           = useState('')
    const [taggerKey, setTaggerKey]           = useState('')
    const [taggerKeyDirty, setTaggerKeyDirty] = useState(false)
    const [promoCopied, setPromoCopied]       = useState(false)
    const [sectonResult, setSectonResult]     = useState<{ valid: boolean; message: string } | null>(null)
    const [taggerResult, setTaggerResult]     = useState<{ success: boolean; message: string } | null>(null)
    const [testingSecton, setTestingSecton]   = useState(false)
    const [testingTagger, setTestingTagger]   = useState(false)
    const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null)

    const { data: settings, isLoading } = useQuery<Settings>({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const r = await fetch('/api/admin/ai-settings')
            if (!r.ok) throw new Error('Failed')
            return r.json()
        },
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        if (!settings) return
        setEnabled(settings.enableAIAssistant)
        setSectonKey(settings.aiApiKey ? MASKED : '')
        setTaggerUrl(settings.changelogTaggerUrl ?? '')
        setTaggerKey(settings.changelogTaggerApiKey ? MASKED : '')
    }, [settings])

    // Live training progress — connects once a tagger is configured/detected,
    // closes itself once the stream reports a terminal (non-running) status.
    const hasTagger = !!settings?.changelogTaggerUrl || !!settings?.changelogTaggerAutoDetected
    useEffect(() => {
        if (!hasTagger) return
        const es = new EventSource('/api/admin/ai-settings/tagger-status')
        let prevStatus: string | null = null
        es.onmessage = (e) => {
            const data: TrainingStatus = JSON.parse(e.data)
            setTrainingStatus(data)
            if (prevStatus === 'running' && data.status === 'done') {
                toast({ title: 'Tagger training complete', description: `Fine-tuned on ${data.records_used} records.` })
            } else if (prevStatus === 'running' && data.status === 'error') {
                toast({ title: 'Tagger training failed', description: data.error, variant: 'destructive' })
            }
            prevStatus = data.status
            if (data.status !== 'running') es.close()
        }
        es.onerror = () => es.close()
        return () => es.close()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasTagger])

    const { mutate: save, isPending: isSaving } = useMutation({
        mutationFn: async (body: Record<string, unknown>) => {
            const r = await fetch('/api/admin/ai-settings', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!r.ok) throw new Error((await r.json()).error || 'Save failed')
        },
        onSuccess: () => {
            toast({ title: 'Saved' })
            setSectonKeyDirty(false)
            setTaggerKeyDirty(false)
            queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
        },
        onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    })

    const handleSave = () => {
        const body: Record<string, unknown> = {
            enableAIAssistant: enabled,
            aiApiProvider: 'secton',
            changelogTaggerUrl: taggerUrl || null,
        }
        if (sectonKeyDirty && !isMasked(sectonKey)) body.aiApiKey = sectonKey || null
        if (taggerKeyDirty && !isMasked(taggerKey)) body.changelogTaggerApiKey = taggerKey || null
        save(body)
    }

    const handleCancel = () => {
        if (!settings) return
        setEnabled(settings.enableAIAssistant)
        setSectonKey(settings.aiApiKey ? MASKED : '')
        setSectonKeyDirty(false)
        setTaggerUrl(settings.changelogTaggerUrl ?? '')
        setTaggerKey(settings.changelogTaggerApiKey ? MASKED : '')
        setTaggerKeyDirty(false)
        setSectonResult(null)
        setTaggerResult(null)
    }

    const validateSecton = async () => {
        if (!sectonKey || isMasked(sectonKey)) { toast({ title: 'Enter a new key first', variant: 'destructive' }); return }
        setTestingSecton(true); setSectonResult(null)
        try {
            const r = await fetch('/api/admin/ai-settings/test-key', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: sectonKey, provider: 'secton' }),
            })
            setSectonResult(await r.json())
        } catch { setSectonResult({ valid: false, message: 'Request failed' }) }
        finally { setTestingSecton(false) }
    }

    const testTagger = async () => {
        setTestingTagger(true); setTaggerResult(null)
        try {
            const r = await fetch('/api/admin/ai-settings/test-tagger', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: taggerUrl, apiKey: taggerKeyDirty && !isMasked(taggerKey) ? taggerKey : undefined }),
            })
            setTaggerResult(await r.json())
        } catch { setTaggerResult({ success: false, message: 'Request failed' }) }
        finally { setTestingTagger(false) }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-[calc(100vh-8rem)] w-full gap-4">
                <div className="h-10 w-52 bg-muted rounded animate-pulse" />
                <div className="flex flex-1 min-h-0 rounded-xl border overflow-hidden">
                    <div className="w-56 bg-muted/30 border-r" />
                    <div className="flex-1 bg-muted/10" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col w-full gap-4" style={{ height: 'calc(100vh - 8rem)' }}>

            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">AI Integration</h1>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="text-sm text-muted-foreground">Enable AI</span>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
            </div>

            {/* Sidebar layout — fills remaining height */}
            <div className="flex flex-1 min-h-0 w-full rounded-xl border bg-card shadow-sm overflow-hidden">

                {/* Nav */}
                <div className="w-56 bg-muted/20 border-r flex flex-col gap-1 p-3 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                        Services
                    </p>
                    <NavItem icon={Cloud} label="Secton" configured={!!settings?.aiApiKey} active={panel === 'secton'} onClick={() => setPanel('secton')} />
                    <NavItem icon={Tag}   label="Changelog Tagger" configured={!!taggerUrl || !!settings?.changelogTaggerAutoDetected} training={trainingStatus?.status === 'running'} active={panel === 'tagger'} onClick={() => setPanel('tagger')} />
                </div>

                {/* Content + footer */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8">
                        <AnimatePresence mode="wait" initial={false}>

                            {/* Secton */}
                            {panel === 'secton' && (
                                <motion.div key="secton" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }} className="space-y-6 w-full">

                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">Secton</h2>
                                        {settings?.aiApiKey
                                            ? <Badge variant="secondary" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Configured</Badge>
                                            : <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>}
                                    </div>

                                    <Separator />

                                    {/* Promo */}
                                    <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
                                        <div className="flex items-center justify-between gap-6">
                                            <div>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Badge variant="default" className="text-xs">Exclusive</Badge>
                                                    30% off your first purchase
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">Use code CHANGERAWR at checkout on platform.secton.org</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5">
                                                    <code className="font-mono font-semibold text-sm">CHANGERAWR</code>
                                                    <button onClick={() => { navigator.clipboard.writeText('CHANGERAWR'); setPromoCopied(true); setTimeout(() => setPromoCopied(false), 2000) }} className="text-muted-foreground hover:text-foreground transition-colors">
                                                        {promoCopied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                                <Button variant="default" size="sm" asChild>
                                                    <a href="https://platform.secton.org/settings/organization/billing" target="_blank" rel="noreferrer">
                                                        Get credits <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>API key</Label>
                                        <div className="flex gap-2 w-full">
                                            <div className="relative flex-1">
                                                <Input type="password" placeholder={settings?.aiApiKey ? MASKED : 'sk_…'} value={sectonKey}
                                                    onChange={e => { setSectonKey(e.target.value); setSectonKeyDirty(true); setSectonResult(null) }}
                                                    autoComplete="off" className="pr-10" />
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                            <Button variant="outline" onClick={validateSecton} disabled={testingSecton || !sectonKey || isMasked(sectonKey)}>
                                                {testingSecton ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Keys start with <code className="text-xs bg-muted px-1 py-0.5 rounded">sk_</code> —{' '}
                                            <a href="https://platform.secton.org/settings/organization/api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">generate one</a>
                                        </p>
                                    </div>

                                    <AnimatePresence>
                                        {sectonResult && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <Alert variant={sectonResult.valid ? 'success' : 'destructive'}>
                                                    <AlertDescription>{sectonResult.message}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* Tagger */}
                            {panel === 'tagger' && (
                                <motion.div key="tagger" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }} className="space-y-6 w-full">

                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">Changelog Tagger</h2>
                                        {taggerUrl
                                            ? <Badge variant="secondary" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Configured</Badge>
                                            : settings?.changelogTaggerAutoDetected
                                                ? <Badge variant="secondary" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Auto-detected</Badge>
                                                : <Badge variant="outline" className="text-muted-foreground">Optional</Badge>}
                                    </div>

                                    <Separator />

                                    {!taggerUrl && settings?.changelogTaggerAutoDetected && (
                                        <Alert variant="success">
                                            <AlertDescription>
                                                A changelog-tagger service was found running locally (bundled with this
                                                image) and is being used automatically — no setup needed. Set a Service
                                                URL below only if you want to point at a different instance.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {trainingStatus?.status === 'running' && (
                                        <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
                                                Training in progress…
                                                <span className="ml-auto text-muted-foreground font-normal">
                                                    {trainingStatus.total_steps > 0
                                                        ? `step ${trainingStatus.current_step}/${trainingStatus.total_steps} (${trainingStatus.progress_pct}%)`
                                                        : 'starting…'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-300"
                                                    style={{ width: `${Math.max(trainingStatus.progress_pct, 3)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Epoch {trainingStatus.current_epoch}/{trainingStatus.total_epochs || '—'}
                                                {trainingStatus.loss !== null && ` · loss ${trainingStatus.loss.toFixed(4)}`}
                                                {' · '}the current model keeps serving requests until this finishes
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Service URL</Label>
                                        <div className="flex gap-2 w-full">
                                            <Input type="url" placeholder="http://localhost:31672" value={taggerUrl}
                                                onChange={e => { setTaggerUrl(e.target.value); setTaggerResult(null) }} className="flex-1 min-w-0" />
                                            <Button variant="outline" onClick={testTagger} disabled={testingTagger || !taggerUrl}>
                                                {testingTagger ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Leave empty to use the auto-detected local service, if any.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>API key <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <div className="relative w-full">
                                            <Input type="password" placeholder={settings?.changelogTaggerApiKey ? MASKED : 'None required'}
                                                value={taggerKey}
                                                onChange={e => { setTaggerKey(e.target.value); setTaggerKeyDirty(true); setTaggerResult(null) }}
                                                autoComplete="off" className="pr-10" />
                                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {taggerResult && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <Alert variant={taggerResult.success ? 'success' : 'destructive'}>
                                                    <AlertDescription>{taggerResult.message}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t px-8 py-4 flex justify-end gap-3 bg-muted/20">
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save settings'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
