import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getCloudinary } from "@/app/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Returns a Cloudinary signed upload payload so the admin UI can upload
 * videos directly to Cloudinary (bypassing Vercel's ~4.5MB body limit).
 */
export async function POST() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { ok: false, error: "Cloudinary environment variables are not configured." },
      { status: 500 },
    );
  }

  try {
    const cloudinary = getCloudinary();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "sai-brand/products";
    const paramsToSign = {
      timestamp,
      folder,
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret,
    );

    return NextResponse.json({
      ok: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    });
  } catch (error) {
    console.error("[upload sign] Failed to create Cloudinary signature", error);
    return NextResponse.json(
      { ok: false, error: "Failed to prepare video upload." },
      { status: 500 },
    );
  }
}
