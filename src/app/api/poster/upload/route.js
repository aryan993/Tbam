import { NextResponse } from 'next/server';
import { supabase } from "@/app/utils/dbconnect";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// R2 Client config
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    let id = formData.get("id");
    const category = formData.get("category");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!id) {
      const originalName = file.name;
      id = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = category ? `${id}_anniv.jpg` : `${id}_poster.jpg`;
    console.log(`Uploading file with ID: ${id}, Category: ${category}, Key: ${objectKey}`);

    // Delete existing object from R2 if it exists
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: objectKey,
      }));
    } catch (deleteErr) {
      console.warn("Delete failed or object didn't exist:", deleteErr.message);
      // Continue upload even if delete fails
    }

    // Upload new image to R2
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: "image/jpeg",
    }));

    // Update Supabase
    let dbError;
    if (category) {
      ({ error: dbError } = await supabase
        .from("user")
        .update({ annposter: true })
        .eq("id", id));
    } else {
      ({ error: dbError } = await supabase
        .from("user")
        .update({ poster: true })
        .eq("id", id));
    }

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return NextResponse.json(
        { error: "File uploaded but DB update failed", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded and database updated",
      file: {
        name: objectKey,
        size: buffer.length,
        url: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${objectKey}`
      },
    });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file", details: err.message },
      { status: 500 }
    );
  }
}
