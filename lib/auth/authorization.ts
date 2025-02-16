export function getTokenFromHeader(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
}