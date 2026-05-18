import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only guard /admin routes
    if (!request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    // If env vars not set, allow in dev (never in production)
    if (!adminUser || !adminPass) {
        return process.env.NODE_ENV === 'development'
            ? NextResponse.next()
            : new NextResponse('Admin not configured', { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        const encoded = authHeader.split(' ')[1] ?? '';
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [user, pass] = decoded.split(':');
        if (user === adminUser && pass === adminPass) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Studio Color Admin"' },
    });
}

export const config = { matcher: ['/admin/:path*'] };
