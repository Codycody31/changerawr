// app/project/[projectId]/settings/domains/page.tsx
'use client'

import {useState, useEffect} from 'react'
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
    Clock
} from 'lucide-react'
import {motion, AnimatePresence} from 'framer-motion'
import type {CustomDomain, DNSInstructions} from '@/lib/types/custom-domains'

interface ProjectDomainSettingsProps {
    params: Promise<{
        projectId: string
    }>
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

    useEffect(() => {
        loadDomains()
    }, [projectId])

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
                setSuccess(`Domain ${newDomain} added successfully!`)
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
                    setSuccess(`Domain ${domain} verified successfully! Your changelog is now live.`)
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
        return 33 // Initial setup completed, DNS pending
    }

    // Auto-clear success/error messages
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
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400"/>
                    <p className="text-gray-600">Loading domain settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Globe className="w-8 h-8 text-blue-600"/>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Custom Domains</h1>
                    <p className="text-gray-600 mt-1">
                        Make your changelog available at your own domain
                    </p>
                </div>
            </div>

            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{opacity: 0, y: -20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                    >
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{opacity: 0, y: -20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                    >
                        <Alert>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Domain Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Add Custom Domain</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddDomain} className="space-y-4">
                        <div>
                            <Label htmlFor="domain">Domain Name</Label>
                            <Input
                                id="domain"
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="changelog.yourcompany.com"
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Enter the custom domain you want to use for your changelog
                            </p>
                        </div>
                        <Button type="submit" disabled={isAddingDomain}>
                            {isAddingDomain ? 'Adding Domain...' : 'Add Domain'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* DNS Instructions */}
            {dnsInstructions && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-800">DNS Configuration Required</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-blue-700">
                            Add these DNS records to your domain provider to complete the setup:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-blue-800 mb-2">1. CNAME Record</h4>
                                <div className="bg-white p-4 rounded border relative">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div><strong>Type:</strong> CNAME</div>
                                        <div><strong>Name:</strong> <code>{dnsInstructions.cname.name}</code></div>
                                        <div><strong>Value:</strong> <code>{dnsInstructions.cname.value}</code></div>
                                        <div><strong>TTL:</strong> 3600 (or Auto)</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(`${dnsInstructions.cname.name} CNAME ${dnsInstructions.cname.value}`)}
                                    >
                                        <Copy className="w-4 h-4"/>
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-blue-800 mb-2">2. TXT Record (for verification)</h4>
                                <div className="bg-white p-4 rounded border relative">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div><strong>Type:</strong> TXT</div>
                                        <div><strong>Name:</strong> <code>{dnsInstructions.txt.name}</code></div>
                                        <div className="md:col-span-2">
                                            <strong>Value:</strong>
                                            <code className="block mt-1 break-all">{dnsInstructions.txt.value}</code>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(`${dnsInstructions.txt.name} TXT ${dnsInstructions.txt.value}`)}
                                    >
                                        <Copy className="w-4 h-4"/>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Alert>
                            <AlertDescription>
                                After adding these DNS records, it may take up to 48 hours for changes to propagate.
                                You can check verification status using the &ldquo;Verify&rdquo; button below.
                            </AlertDescription>
                        </Alert>

                        <Button
                            variant="outline"
                            onClick={() => setDnsInstructions(null)}
                        >
                            Close Instructions
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Current Domains */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Your Custom Domains</CardTitle>
                        <Button onClick={loadDomains} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2"/>
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {domains.length === 0 ? (
                        <div className="text-center py-8">
                            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No custom domains yet</h3>
                            <p className="text-gray-600">
                                Add a custom domain to make your changelog available at your own URL
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {domains.map((domain) => (
                                <motion.div
                                    key={domain.id}
                                    layout
                                    className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <h3 className="font-semibold text-xl">{domain.domain}</h3>
                                                <Badge variant={domain.verified ? "default" : "secondary"}>
                                                    {domain.verified ? 'Active' : 'Pending Verification'}
                                                </Badge>
                                                {domain.verified && (
                                                    <a
                                                        href={`https://${domain.domain}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4"/>
                                                    </a>
                                                )}
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Setup Progress</span>
                                                    <span
                                                        className="text-gray-600">{getVerificationProgress(domain)}%</span>
                                                </div>
                                                <Progress value={getVerificationProgress(domain)} className="h-2"/>
                                            </div>

                                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4"/>
                                                    <span>Added {formatDate(domain.createdAt)}</span>
                                                </div>
                                                {domain.verifiedAt && (
                                                    <div className="flex items-center space-x-1">
                                                        <CheckCircle className="w-4 h-4 text-green-600"/>
                                                        <span>Verified {formatDate(domain.verifiedAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {!domain.verified && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleVerifyDomain(domain.domain)}
                                                    disabled={verifyingDomain === domain.domain}
                                                >
                                                    {verifyingDomain === domain.domain ? 'Verifying...' : 'Verify'}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteDomain(domain.domain)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Status Messages */}
                                    {!domain.verified && (
                                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <p className="text-sm text-yellow-800">
                                                <strong>Next step:</strong> Add the DNS records above and
                                                click &ldquo;Verify&rdquo;
                                                to complete setup. If you do not see the DNS records, please redo the process.
                                            </p>
                                        </div>
                                    )}

                                    {domain.verified && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800">
                                                <strong>Live!</strong> Your changelog is available
                                                at <code>{domain.domain}</code>
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}