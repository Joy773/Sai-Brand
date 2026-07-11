import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getCloudinary } from "@/app/lib/cloudinary";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value;
}

async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const cloudinary = getCloudinary();
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "sai-brand/products",
        resource_type: "image",
        format: "webp",
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        });
      },
    );

    stream.end(buffer);
  });

  return result;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid form data." },
      { status: 400 },
    );
  }

  const entries = [
    ...formData.getAll("file"),
    ...formData.getAll("files"),
  ].filter(isFile);

  if (entries.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No image file provided." },
      { status: 400 },
    );
  }

  if (entries.length > MAX_FILES) {
    return NextResponse.json(
      { ok: false, error: `You can upload at most ${MAX_FILES} images.` },
      { status: 400 },
    );
  }

  for (const file of entries) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid file type: ${file.type || file.name}. Use JPEG, PNG, WebP, or GIF.`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `File "${file.name}" exceeds the 5MB size limit.`,
        },
        { status: 400 },
      );
    }
  }

  try {
    const uploads = await Promise.all(entries.map(uploadToCloudinary));
    const urls = uploads.map((upload) => upload.secure_url);

    return NextResponse.json({
      ok: true,
      url: urls[0],
      urls,
      images: uploads.map((upload) => ({
        url: upload.secure_url,
        publicId: upload.public_id,
        width: upload.width,
        height: upload.height,
        format: upload.format,
        bytes: upload.bytes,
      })),
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    const httpCode =
      typeof error === "object" &&
      error !== null &&
      "http_code" in error &&
      typeof (error as { http_code?: number }).http_code === "number"
        ? (error as { http_code: number }).http_code
        : null;

    const cloudinaryMessage =
      typeof error === "object" &&
      error !== null &&
      "error" in error &&
      typeof (error as { error?: { message?: string } }).error?.message ===
        "string"
        ? (error as { error: { message: string } }).error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : null;

    const isPermissionError =
      httpCode === 403 ||
      cloudinaryMessage?.toLowerCase().includes("missing permissions") ||
      cloudinaryMessage?.toLowerCase().includes("forbidden");

    return NextResponse.json(
      {
        ok: false,
        error: isPermissionError
          ? "Cloudinary API key is missing upload (create) permission. In Cloudinary Console → Settings → API Keys, use your Master/Root API key (or grant Upload/Create on this key), update .env.local, and restart the server."
          : cloudinaryMessage || "Failed to upload image.",
      },
      { status: 500 },
    );
  }
}
