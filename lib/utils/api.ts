export async function fetchWithAuth(
    input: RequestInfo | URL,
    init?: RequestInit
) {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
        throw new Error('No access token')
    }

    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    const response = await fetch(input, {
        ...init,
        headers
    })

    if (response.status === 401) {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
            throw new Error('No refresh token')
        }

        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        })

        if (!refreshResponse.ok) {
            // Clear tokens and throw error
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            throw new Error('Session expired')
        }

        const { accessToken: newAccessToken } = await refreshResponse.json()
        localStorage.setItem('accessToken', newAccessToken)

        // Retry the original request with new token
        headers.set('Authorization', `Bearer ${newAccessToken}`)
        return fetch(input, {
            ...init,
            headers
        })
    }

    return response
}