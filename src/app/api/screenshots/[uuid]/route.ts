import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Set cache duration to 1 year since these images are immutable
const CACHE_DURATION = 60 * 60 * 24 * 365; // 1 year in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  // Validate UUID format to prevent directory traversal
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return new NextResponse("Invalid UUID format", { status: 400 });
  }

  // Find the screenshot file
  const filePath = path.join("local_user_data", "screenshots", uuid + ".png");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Screenshot not found", { status: 404 });
  }

  try {
    const fileBuffer = await fs.promises.readFile(filePath);

    // Set aggressive caching headers since these images are immutable
    const headers = new Headers({
      "Content-Type": "image/png",
      Pragma: `public`,
      "Cache-Control": `max-age=${CACHE_DURATION}`,
      Expires: new Date(Date.now() + CACHE_DURATION * 1000).toUTCString(),
      "CDN-Cache-Control": `public, immutable, max-age=${CACHE_DURATION}`,
      "Vercel-CDN-Cache-Control": `public, immutable, max-age=${CACHE_DURATION}`,
    });

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Error serving screenshot:", error);
    return new NextResponse("Error serving screenshot", { status: 500 });
  }
}
