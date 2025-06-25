'use client'

import {useState, useEffect, useCallback} from 'react'
import {use} from 'react'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Progress} from '@/components/ui/progress'
import {
    Trash2,
    RefreshCw,
    ExternalLink,
    Globe,
    Copy,
    CheckCircle,
    Clock,
    Zap,
    Shield,
    Sparkles,
    ArrowRight,
    Link,
    Settings,
    Rocket,
    Check,
    ChevronDown,
    ChevronUp,
    MoreHorizontal
} from 'lucide-react'
import {motion, AnimatePresence} from 'framer-motion'

interface CustomDomain {
    id: string
    domain: string
    projectId: string
    verified: boolean
    createdAt: string
    verifiedAt?: string
    dnsInstructions?: DNSInstructions
}

interface DNSInstructions {
    cname: { name: string; value: string }
    txt: { name: string; value: string }
}

interface ProjectDomainSettingsProps {
    params: Promise<{
        projectId: string
    }>
}

// Confetti component
const ConfettiAnimation = ({show}: { show: boolean }) => {
    if (!show) return null

    const confettiPieces = Array.from({length: 50}, (_, i) => (
        <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'][i % 7],
                left: `${Math.random() * 100}%`,
                top: '-10px'
            }}
            initial={{y: -10, rotate: 0, scale: 0}}
            animate={{
                y: window.innerHeight + 100,
                rotate: Math.random() * 360,
                scale: [0, 1, 0.8, 0],
                x: Math.random() * 200 - 100
            }}
            transition={{
                duration: 3 + Math.random() * 2,
                ease: "easeOut",
                delay: Math.random() * 0.5
            }}
        />
    ))

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {confettiPieces}
        </div>
    )
}

// Mobile-optimized DNS Record component
const DNSRecord = ({type, data, onCopy}: {
    type: 'CNAME' | 'TXT'
    data: { name: string; value: string }
    onCopy: (text: string) => void
}) => {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <Card className="bg-background border">
            <CardContent className="p-3 sm:p-4">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-3 sm:hidden">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {type === 'CNAME' ? '1' : '2'}
                        </div>
                        <h4 className="font-semibold text-sm">{type} Record</h4>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </Button>
                </div>

                {/* Desktop/Expanded Mobile Content */}
                <div className={`space-y-3 ${!isExpanded ? 'hidden sm:block' : 'block'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
                        <div className="space-y-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">Type</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded text-xs">{type}</div>
                        </div>
                        {type === 'CNAME' && (
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wide">TTL</span>
                                <div className="font-mono bg-muted px-2 py-1 rounded text-xs">3600</div>
                            </div>
                        )}
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">Name</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded break-all text-xs">{data.name}</div>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide">Value</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded break-all text-xs">{data.value}</div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 w-full sm:w-auto"
                        onClick={() => onCopy(`${data.name} ${type} ${data.value}`)}
                    >
                        <Copy className="w-3 h-3"/>
                        Copy Record
                    </Button>
                </div>

                {/* Mobile Summary */}
                {!isExpanded && (
                    <div className="sm:hidden space-y-2">
                        <div className="text-xs text-muted-foreground truncate">
                            <span className="font-mono">{data.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 w-full"
                            onClick={() => onCopy(`${data.name} ${type} ${data.value}`)}
                        >
                            <Copy className="w-3 h-3"/>
                            Copy
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function ProjectDomainSettings({params}: ProjectDomainSettingsProps) {
    const {projectId} = use(params)
    const [domains, setDomains] = useState<CustomDomain[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddingDomain, setIsAddingDomain] = useState(false)
    const [newDomain, setNewDomain] = useState('')
    const [dnsInstructions, setDnsInstructions] = useState<DNSInstructions | null>(null)
    const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)
    const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadDomains()
    }, [projectId])

    const triggerConfetti = useCallback(() => {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)
    }, [])

    const toggleDomainExpansion = (domainId: string) => {
        const newExpanded = new Set(expandedDomains)
        if (newExpanded.has(domainId)) {
            newExpanded.delete(domainId)
        } else {
            newExpanded.add(domainId)
        }
        setExpandedDomains(newExpanded)
    }

    const loadDomains = async (): Promise<void> => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch(`/api/custom-domains/list?projectId=${projectId}`)
            const result = await response.json()

            if (result.success) {
                setDomains(result.domains || [])
            } else {
                setError(result.error || 'Failed to load domains')
            }
        } catch (error) {
            setError('Failed to load domains')
            console.error('Failed to load domains:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddDomain = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        if (!newDomain) return

        setIsAddingDomain(true)
        setError(null)

        try {
            const response = await fetch('/api/custom-domains/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    domain: newDomain,
                    projectId: projectId
                })
            })

            const result = await response.json()
            if (result.success) {
                setNewDomain('')
                setDnsInstructions(result.domain.dnsInstructions)
                setSuccess(`Domain ${newDomain} added successfully! Follow the DNS instructions below.`)
                await loadDomains()
            } else {
                setError(result.error || 'Failed to add domain')
            }
        } catch (error) {
            setError('Failed to add domain')
            console.error('Failed to add domain:', error)
        } finally {
            setIsAddingDomain(false)
        }
    }

    const handleVerifyDomain = async (domain: string): Promise<void> => {
        setVerifyingDomain(domain)
        setError(null)

        try {
            const response = await fetch('/api/custom-domains/verify', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({domain})
            })

            const result = await response.json()
            if (result.success) {
                await loadDomains()
                if (result.verification.verified) {
                    setSuccess(`🎉 Domain ${domain} verified successfully! Your changelog is now live.`)
                    triggerConfetti()
                } else {
                    setError(`Verification failed: ${result.verification.errors?.join(', ') || 'DNS records not found'}`)
                }
            } else {
                setError(result.error || 'Verification failed')
            }
        } catch (error) {
            setError('Failed to verify domain')
            console.error('Failed to verify domain:', error)
        } finally {
            setVerifyingDomain(null)
        }
    }

    const handleDeleteDomain = async (domain: string): Promise<void> => {
        if (!confirm(`Remove ${domain} from this project? This action cannot be undone.`)) {
            return
        }

        setError(null)

        try {
            const response = await fetch(`/api/custom-domains/${encodeURIComponent(domain)}`, {
                method: 'DELETE'
            })

            const result = await response.json()
            if (result.success) {
                setSuccess(`Domain ${domain} removed successfully`)
                await loadDomains()
            } else {
                setError(result.error || 'Failed to delete domain')
            }
        } catch (error) {
            setError('Failed to delete domain')
            console.error('Failed to delete domain:', error)
        }
    }

    const copyToClipboard = async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text)
            setSuccess('Copied to clipboard!')
        } catch {
            setError('Failed to copy to clipboard')
        }
    }

    const formatDate = (date: Date | string): string => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getVerificationProgress = (domain: CustomDomain): number => {
        if (domain.verified) return 100
        return 40 // DNS setup initiated
    }

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null)
                setError(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [success, error])

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary"/>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Loading domain settings</h3>
                            <p className="text-sm text-muted-foreground px-4">Setting up your custom domain
                                configuration...</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
            <ConfettiAnimation show={showConfetti}/>

            {/* Enhanced Header */}
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="space-y-2"
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div
                        className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary-foreground"/>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Custom
                            Domains</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Connect your own domain to create a professional changelog experience
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{opacity: 0, scale: 0.95, y: -10}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.95, y: -10}}
                    >
                        <Alert variant="destructive" className="border-destructive/20">
                            <AlertDescription className="font-medium text-sm">{error}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{opacity: 0, scale: 0.95, y: -10}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.95, y: -10}}
                    >
                        <Alert variant="success">
                            <AlertDescription className="text-green-800 dark:text-green-200 font-medium text-sm">
                                {success}
                            </AlertDescription>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Domain Card */}
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.1}}
            >
                <Card
                    className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary"/>
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-lg">Add Custom Domain</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Connect your domain to make your changelog accessible at your URL
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddDomain} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="domain" className="text-sm font-medium">Domain Name</Label>
                                <div className="relative">
                                    <Link
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                    <Input
                                        id="domain"
                                        type="text"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        placeholder="changelog.yourcompany.com"
                                        className="pl-10"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Use a subdomain like{' '}
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">changelog.yoursite.com</code>
                                    {' '}or{' '}
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">updates.yoursite.com</code>
                                </p>
                            </div>
                            <Button type="submit" disabled={isAddingDomain} className="w-full">
                                {isAddingDomain ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>
                                        Adding Domain...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2"/>
                                        Add Domain
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* DNS Instructions */}
            {dnsInstructions && (
                <motion.div
                    initial={{opacity: 0, scale: 0.98}}
                    animate={{opacity: 1, scale: 1}}
                    className="relative"
                >
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-primary"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="text-primary flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span>DNS Configuration Required</span>
                                        <Badge variant="secondary" className="text-xs w-fit">Step 2 of 3</Badge>
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Add these DNS records to your domain provider
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {/* CNAME Record */}
                                <div className="space-y-3">
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                                            1
                                        </div>
                                        <h4 className="font-semibold text-foreground">CNAME Record</h4>
                                    </div>
                                    <DNSRecord
                                        type="CNAME"
                                        data={dnsInstructions.cname}
                                        onCopy={copyToClipboard}
                                    />
                                </div>

                                {/* TXT Record */}
                                <div className="space-y-3">
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                                            2
                                        </div>
                                        <h4 className="font-semibold text-foreground">TXT Record (Verification)</h4>
                                    </div>
                                    <DNSRecord
                                        type="TXT"
                                        data={dnsInstructions.txt}
                                        onCopy={copyToClipboard}
                                    />
                                </div>
                            </div>

                            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                                    DNS changes can take up to 48 hours to propagate. You can verify your setup using
                                    the &ldquo;Verify&rdquo; button once the records are added.
                                </AlertDescription>
                            </Alert>

                            <div className="flex flex-col gap-3">
                                <Button variant="outline" onClick={() => setDnsInstructions(null)}
                                        className="gap-2 w-full sm:w-auto">
                                    <Check className="w-4 h-4"/>
                                    I&apos;ve Added These Records
                                </Button>
                                <Button variant="ghost" size="sm" asChild className="w-full sm:w-auto">
                                    <a
                                        href="https://www.cloudways.com/blog/dns-record/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        DNS Setup Guide
                                    </a>
                                </Button>

                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Current Domains */}
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.2}}
            >
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                    <Settings className="w-4 h-4 text-muted-foreground"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="text-lg">Your Domains</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Manage your connected custom domains
                                    </p>
                                </div>
                            </div>
                            <Button onClick={loadDomains} variant="outline" size="sm"
                                    className="gap-2 w-full sm:w-auto">
                                <RefreshCw className="w-4 h-4"/>
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {domains.length === 0 ? (
                            <div className="text-center py-12">
                                <div
                                    className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Globe className="w-8 h-8 text-muted-foreground"/>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">No domains connected yet</h3>
                                <p className="text-muted-foreground text-sm max-w-md mx-auto px-4">
                                    Add your first custom domain to create a professional changelog experience for your
                                    users.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {domains.map((domain, index) => (
                                    <motion.div
                                        key={domain.id}
                                        layout
                                        initial={{opacity: 0, y: 20}}
                                        animate={{opacity: 1, y: 0}}
                                        transition={{delay: index * 0.1}}
                                        className="border border-border rounded-xl p-4 sm:p-6 hover:bg-muted/30 transition-all duration-200"
                                    >
                                        {/* Mobile-first domain header */}
                                        <div className="space-y-4">
                                            {/* Top row - always visible */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Rocket
                                                            className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                                                        <h3 className="font-semibold text-lg text-foreground truncate">{domain.domain}</h3>
                                                    </div>
                                                    <Badge variant={domain.verified ? "default" : "secondary"}
                                                           className="gap-1 text-xs">
                                                        {domain.verified ? (
                                                            <>
                                                                <CheckCircle className="w-3 h-3"/>
                                                                Live & Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3 h-3"/>
                                                                Pending
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>

                                                {/* Mobile actions */}
                                                <div className="flex items-center gap-1 sm:hidden">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleDomainExpansion(domain.id)}
                                                        className="p-2"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4"/>
                                                    </Button>
                                                </div>

                                                {/* Desktop actions */}
                                                <div className="hidden sm:flex items-center gap-2">
                                                    {domain.verified && (
                                                        <Button variant="ghost" size="sm" asChild
                                                                className="gap-2 text-primary">
                                                            <a
                                                                href={`https://${domain.domain}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink className="w-4 h-4"/>
                                                                Visit
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {!domain.verified && (
                                                        <Button
                                                            onClick={() => handleVerifyDomain(domain.domain)}
                                                            disabled={verifyingDomain === domain.domain}
                                                            size="sm"
                                                            className="gap-2"
                                                        >
                                                            {verifyingDomain === domain.domain ? (
                                                                <>
                                                                    <RefreshCw className="w-4 h-4 animate-spin"/>
                                                                    Verifying...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4"/>
                                                                    Verify
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteDomain(domain.domain)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Progress - visible on mobile and desktop */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span
                                                        className="text-muted-foreground font-medium">Setup Progress</span>
                                                    <span
                                                        className="text-muted-foreground">{getVerificationProgress(domain)}%</span>
                                                </div>
                                                <Progress value={getVerificationProgress(domain)} className="h-2"/>
                                            </div>

                                            {/* Expandable content for mobile */}
                                            <AnimatePresence>
                                                {(expandedDomains.has(domain.id) || window.innerWidth >= 640) && (
                                                    <motion.div
                                                        initial={{opacity: 0, height: 0}}
                                                        animate={{opacity: 1, height: 'auto'}}
                                                        exit={{opacity: 0, height: 0}}
                                                        transition={{duration: 0.2}}
                                                        className="space-y-4 sm:space-y-0"
                                                    >
                                                        {/* Metadata */}
                                                        <div
                                                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4"/>
                                                                <span>Added {formatDate(domain.createdAt)}</span>
                                                            </div>
                                                            {domain.verifiedAt && (
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle className="w-4 h-4 text-green-600"/>
                                                                    <span>Verified {formatDate(domain.verifiedAt)}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Mobile actions */}
                                                        <div className="flex flex-col gap-3 sm:hidden">
                                                            {domain.verified && (
                                                                <Button variant="outline" size="sm" asChild
                                                                        className="gap-2 w-full">
                                                                    <a
                                                                        href={`https://${domain.domain}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4"/>
                                                                        Visit Site
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            {!domain.verified && (
                                                                <Button
                                                                    onClick={() => handleVerifyDomain(domain.domain)}
                                                                    disabled={verifyingDomain === domain.domain}
                                                                    size="sm"
                                                                    className="gap-2 w-full"
                                                                >
                                                                    {verifyingDomain === domain.domain ? (
                                                                        <>
                                                                            <RefreshCw
                                                                                className="w-4 h-4 animate-spin"/>
                                                                            Verifying...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle className="w-4 h-4"/>
                                                                            Verify Domain
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteDomain(domain.domain)}
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 w-full"
                                                            >
                                                                <Trash2 className="w-4 h-4"/>
                                                                Remove Domain
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Status Messages */}
                                            <div className="mt-4">
                                                {!domain.verified ? (
                                                    <Alert hasIcon={false}
                                                        className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                                                        <ArrowRight
                                                            className="h-4 w-4 text-amber-600 dark:text-amber-400"/>
                                                        <AlertDescription
                                                            className="text-amber-800 dark:text-amber-200 text-sm">
                                                            <strong>Next step:</strong> Add the DNS records shown above,
                                                            then click &ldquo;Verify Domain&rdquo; to complete setup.
                                                            If you can&apos;t see the DNS records, restart setup by
                                                            deleting this domain.
                                                        </AlertDescription>
                                                    </Alert>
                                                ) : (
                                                    <Alert hasIcon={false}
                                                        className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                                        <AlertDescription
                                                            className="text-green-800 dark:text-green-200 text-sm">
                                                            <strong>🎉 Congratulations!</strong> Your changelog is live
                                                            at{' '}
                                                            <code
                                                                className="bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded text-xs break-all">
                                                                {domain.domain}
                                                            </code>
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}