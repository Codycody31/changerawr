export interface CustomDomain {
    id: string
    domain: string
    projectId: string
    verificationToken: string
    verified: boolean
    createdAt: Date
    verifiedAt: Date | null
    userId: string | null
}

export interface DNSVerificationResult {
    cnameValid: boolean
    txtValid: boolean
    cnameTarget?: string
    txtRecord?: string
    errors?: string[]
}

export interface DNSInstructions {
    cname: {
        name: string
        value: string
        description: string
    }
    txt: {
        name: string
        value: string
        description: string
    }
}

export interface AddDomainRequest {
    domain: string
    projectId: string
    userId?: string
}

export interface AddDomainResponse {
    success: boolean
    domain?: {
        id: string
        domain: string
        projectId: string
        verificationToken: string
        dnsInstructions: DNSInstructions
    }
    error?: string
}

export interface VerifyDomainRequest {
    domain: string
}

export interface VerifyDomainResponse {
    success: boolean
    verification?: DNSVerificationResult & {
        verified: boolean
    }
    error?: string
}

export interface ListDomainsResponse {
    success: boolean
    domains?: CustomDomain[]
    error?: string
}

export interface DeleteDomainResponse {
    success: boolean
    error?: string
}