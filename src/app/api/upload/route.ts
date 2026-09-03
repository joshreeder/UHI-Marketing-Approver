import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth/session";
import { ALLOWED_UPLOAD_TYPES, blobConfigured, DOCX_MIME, MAX_UPLOAD_BYTES } from "@/lib/blob";

const LETTERHEAD_MAX_BYTES = 20 * 1024 * 1024;

/** Issues short-lived client upload tokens so files go browser → Blob without touching the server. */
export async function POST(request: Request) {
  if (!blobConfigured()) {
    return NextResponse.json({ error: "File storage is not configured (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session?.isTeam) throw new Error("Sign in as a team member to upload.");
        if (pathname.startsWith("templates/")) {
          // Letterhead for Word exports: owners only, Word files only.
          if (session.user.role !== "owner") throw new Error("Only owners can change the letterhead.");
          return {
            allowedContentTypes: [DOCX_MIME],
            maximumSizeInBytes: LETTERHEAD_MAX_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: session.user.id }),
          };
        }
        if (!pathname.startsWith("items/")) throw new Error("Unexpected upload path.");
        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // The client calls createVersion() itself after upload; nothing to do here.
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
