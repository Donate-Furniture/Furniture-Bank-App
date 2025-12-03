import { verifyToken, JwtPayload } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';


/*
What This Middleware Does:
Ongoing Authorization (Middleware): This happens every time the user tries to do something protected. The middleware 
verifies that the user is still holding a valid key and has permission to perform the requested action.

This authenticate function is designed to be called at the very beginning of any protected API route. It either returns:
[AuthenticatedRequest, null]: Authentication succeeded. The request now contains the user's ID and name, and the route can proceed.

[null, NextResponse]: Authentication failed. The response contains the error, and the calling route must stop and return this 
error immediately.
*/



// Interface to extend the standard request object with user data
export interface AuthenticatedRequest extends NextRequest {
    user?: {
        id: string;
        email: string;
        //firstName: string;
        //lastName: string;

    }
}

/**
 * Middleware function to authenticate a request using a JWT from the Authorization header.
 * * @param req The incoming Next.js request object.
 * @returns A tuple [user, response] where user is the authenticated user object, 
 * or response is an error response if authentication fails.
 */
export async function authenticate(req: NextRequest): Promise<[AuthenticatedRequest | null, NextResponse | null]> {
    // 1. Get the Authorization header
    const authHeader = req.headers.get('Authorization');

    // 2. Check for Token Presence and Format
    // Expected format: "Bearer [TOKEN]"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return [null, NextResponse.json(
            { error: 'Authentication token is required and must be a Bearer token.' },
            { status: 401 } // Unauthorized
        )];
    }

    // 3. Extract the Token
    const token = authHeader.split(' ')[1]; // Gets the part after "Bearer "

    // 4. Verify the Token (using the utility from /lib/auth.ts)
    const payload = verifyToken(token);

    if (!payload) {
        return [null, NextResponse.json(
            { error: 'Invalid or expired token.' },
            { status: 401 } // Unauthorized
        )];
    }

    // 5. Look up the User in the Database (Crucial security step)
    // We verify the userId from the payload actually corresponds to an active user.
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true } 
    });

    if (!user) {
        return [null, NextResponse.json(
            { error: 'User associated with token not found.' },
            { status: 401 } // Unauthorized
        )];
    }

    // 6. Augment the Request Object (Attach the user data)
    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.user = user;

    // 7. Success: Return the authenticated request and a null response
    return [authenticatedRequest, null];
}