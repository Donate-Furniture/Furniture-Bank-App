// Upload API: Securely handles client-side file uploads via Vercel Blob.
// Enforces authentication and restricts file types to images to prevent abuse.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Logic runs BEFORE the client gets a token to upload
      onBeforeGenerateToken: async (pathname) => {
        // 1. Security Check: Ensure user is logged in
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
          throw new Error("Unauthorized");
        }

        // 2. Configuration: Limit file types and structure
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ],
          // Add random suffix to prevent filename conflicts
          addRandomSuffix: true,
          // Embed metadata into the token for tracking
          tokenPayload: JSON.stringify({
            userId: (session.user as any).id, // Track who uploaded it
          }),
        };
      },
      // 3. Post-Upload Logic: Runs after Vercel confirms the upload
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Blob uploaded successfully:", blob.url);
        // You could perform additional DB logic here if needed (e.g., logging usage)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
