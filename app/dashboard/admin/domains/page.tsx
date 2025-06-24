'use client'

import {useState, useEffect} from 'react'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Trash2,
    RefreshCw,
    Plus,
    ExternalLink,
    Globe,
    CheckCircle,
    Clock,
    MoreVertical,
    Copy,
    Eye,
    Shield
} from 'lucide-react'
import {motion, AnimatePresence} from 'framer-motion'
import type {CustomDomain, DNSInstructions} from '@/lib/types/custom-domains'

export default function AdminDomainsPage() {
    const [domains, setDomains] = useState<CustomDomain[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddingDomain, setIsAddingDomain] = useState(false)
    const [newDomain, setNewDomain] = useState('')
    const [newProjectId, setNewProjectId] = useState('')
    const [dnsInstructions, setDnsInstructions] = useState<DNSInstructions | null>(null)
    const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        loadDomains()
    }, [])

    const loadDomains = async (): Promise<void> => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch('/api/custom-domains/list?scope=all')
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
        if (!newDomain || !newProjectId) return

        setIsAddingDomain(true)
        setError(null)

        try {
            const response = await fetch('/api/custom-domains/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    domain: newDomain,
                    projectId: newProjectId
                })
            })

            const result = await response.json()
            if (result.success) {
                setNewDomain('')
                setNewProjectId('')
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
                    setSuccess(`Domain ${domain} verified successfully!`)
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
        if (!confirm(`Are you sure you want to delete ${domain}? This action cannot be undone.`)) {
            return
        }

        setError(null)

        try {
            const response = await fetch(`/api/custom-domains/${encodeURIComponent(domain)}?admin=true`, {
                method: 'DELETE'
            })

            const result = await response.json()
            if (result.success) {
                setSuccess(`Domain ${domain} deleted successfully`)
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusIcon = (domain: CustomDomain) => {
        if (domain.verified) {
            return <CheckCircle className="w-4 h-4 text-green-600"/>
        }
        return <Clock className="w-4 h-4 text-yellow-600"/>
    }

    const getStatusBadge = (domain: CustomDomain) => {
        if (domain.verified) {
            return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
        }
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
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
            <div className="min-h-screen py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400"/>
                            <p className="text-gray-600">Loading domains...</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Globe className="w-8 h-8 text-blue-600"/>
                            Custom Domains
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Manage custom domains for all projects
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={loadDomains} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2"/>
                            Refresh
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2"/>
                                    Add Domain
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add Custom Domain</DialogTitle>
                                    <DialogDescription>
                                        Configure a new custom domain for a project
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddDomain} className="space-y-4">
                                    <div>
                                        <Label htmlFor="domain">Custom Domain</Label>
                                        <Input
                                            id="domain"
                                            type="text"
                                            value={newDomain}
                                            onChange={(e) => setNewDomain(e.target.value)}
                                            placeholder="changelog.example.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="projectId">Project ID</Label>
                                        <Input
                                            id="projectId"
                                            type="text"
                                            value={newProjectId}
                                            onChange={(e) => setNewProjectId(e.target.value)}
                                            placeholder="cm7zegrfx000ipp6g5ogohwuj"
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={isAddingDomain} className="w-full">
                                        {isAddingDomain ? 'Adding...' : 'Add Domain'}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
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
                            <Alert variant="success">
                                <AlertDescription className="text-green-800">{success}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* DNS Instructions Modal */}
                {dnsInstructions && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800 flex items-center gap-2">
                                <Shield className="w-5 h-5"/>
                                DNS Configuration Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-blue-700">
                                Add these DNS records to your domain provider to complete the setup:
                            </p>

                            <div className="grid gap-4">
                                <div>
                                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm">1</span>
                                        CNAME Record
                                    </h4>
                                    <div className="bg-white p-4 rounded border relative">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
                                            <div><strong>Type:</strong> CNAME</div>
                                            <div><strong>TTL:</strong> 3600</div>
                                            <div><strong>Name:</strong> {dnsInstructions.cname.name}</div>
                                            <div><strong>Value:</strong> {dnsInstructions.cname.value}</div>
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
                                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm">2</span>
                                        TXT Record (for verification)
                                    </h4>
                                    <div className="bg-white p-4 rounded border relative">
                                        <div className="space-y-2 text-sm font-mono">
                                            <div><strong>Type:</strong> TXT</div>
                                            <div><strong>Name:</strong> {dnsInstructions.txt.name}</div>
                                            <div><strong>Value:</strong> <span
                                                className="break-all">{dnsInstructions.txt.value}</span></div>
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
                                    DNS changes can take up to 48 hours to propagate. Use
                                    the &ldquo;Verify&rdquo; button to check status.
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

                {/* Domains List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Configured Domains ({domains.length})</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircle className="w-4 h-4 text-green-600"/>
                                <span>{domains.filter(d => d.verified).length} verified</span>
                                <Clock className="w-4 h-4 text-yellow-600 ml-4"/>
                                <span>{domains.filter(d => !d.verified).length} pending</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {domains.length === 0 ? (
                            <div className="text-center py-12">
                                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No custom domains yet</h3>
                                <p className="text-gray-600 mb-4">
                                    Add a custom domain to get started
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {domains.map((domain) => (
                                    <motion.div
                                        key={domain.id}
                                        layout
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                {getStatusIcon(domain)}
                                                <h3 className="font-semibold text-lg">{domain.domain}</h3>
                                                {getStatusBadge(domain)}
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
                                            <div className="text-sm text-gray-600 mt-1 space-x-4">
                                                <span>Project: <code
                                                    className="bg-gray-100 px-1 rounded">{domain.projectId}</code></span>
                                                <span>Added: {formatDate(domain.createdAt)}</span>
                                                {domain.verifiedAt && (
                                                    <span>Verified: {formatDate(domain.verifiedAt)}</span>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="w-4 h-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => copyToClipboard(domain.domain)}>
                                                        <Copy className="w-4 h-4 mr-2"/>
                                                        Copy Domain
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => copyToClipboard(domain.projectId)}>
                                                        <Eye className="w-4 h-4 mr-2"/>
                                                        Copy Project ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteDomain(domain.domain)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2"/>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}