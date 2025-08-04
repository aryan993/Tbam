import { supabase } from '@/app/utils/dbconnect';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Buffer } from 'buffer';

// Utility to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Initialize R2 client
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  const cacheBust = searchParams.get("cacheBust"); // Optional cache busting parameter

  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  // Extract user ID and image type from filename
  const userId = filename.split("_")[0].split(".")[0];
  let imageType = 'profile'; // default
  if (filename.includes('_poster')) imageType = 'poster';
  if (filename.includes('_anniv')) imageType = 'annposter';

  try {
    // First check Supabase to see if the image exists
    const { data: user, error } = await supabase
      .from('user')
      .select(imageType)
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Supabase error or user not found:', error);
      return new Response("User not found", { status: 404 });
    }

    // Check if the specific image type exists in Supabase
    if (!user[imageType]) {
      return new Response("Image not available", { status: 404 });
    }

      try {
      const result = await s3.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: filename,
      }));

      const buffer = await streamToBuffer(result.Body);

      return new Response(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });

    } catch (r2Error) {
      return new Response("File not found", { status: 404 });
    }

  } catch (err) {
    console.error("Image fetch error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}