import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const maxImageBytes = 5 * 1024 * 1024;
const maxRequestBytes = maxImageBytes + 64 * 1024;
const imageTypes = {
  "image/jpeg": { extension: "jpg", matches: (bytes: Buffer) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", matches: (bytes: Buffer) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: "webp", matches: (bytes: Buffer) => bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
} as const;

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a valid image file to upload." }, { status: 400 });
  }
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }
  if (file.size > maxImageBytes) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  const imageType = imageTypes[file.type as keyof typeof imageTypes];
  if (!imageType) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
  }
  const contents = Buffer.from(await file.arrayBuffer());
  if (!imageType.matches(contents)) {
    return NextResponse.json({ error: "The selected file does not match its image format." }, { status: 415 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const filename = `${randomUUID()}.${imageType.extension}`;
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
  const imagePath = path.join(uploadDirectory, filename);
  const imageUrl = `/uploads/products/${filename}`;

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(imagePath, contents, { flag: "wx" });
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.product.update({ where: { id: product.id }, data: { image: imageUrl } });
      await transaction.auditLog.create({
        data: {
          userId: admin.id,
          action: "PRODUCT_IMAGE_UPDATED",
          entityType: "Product",
          entityId: product.id,
          details: { image: imageUrl },
        },
      });
    });
  } catch (error) {
    try {
      await unlink(imagePath);
    } catch (cleanupError) {
      console.error("Could not remove an unreferenced uploaded product image:", cleanupError);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ image: imageUrl });
}
