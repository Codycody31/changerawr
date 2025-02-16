import md5 from 'md5'

export function getGravatarUrl(email: string, size: number = 80): string {
    const cleanEmail = email.trim().toLowerCase()
    return `https://www.gravatar.com/avatar/${md5(cleanEmail)}?s=${size}&d=mp`
}