// src/app/api/poster/delete/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/app/utils/dbconnect";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// R2 Client
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const { id, category } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    }
    console.log("id is: "+id+"the category is"+category)

    // Determine filename based on category
    const filename = category === 'anniversary' 
      ? `${id}_anniv.jpg` 
      : `${id}_poster.jpg`;

   // Attempt to delete from R2
       try {
         await s3.send(new DeleteObjectCommand({
           Bucket: process.env.R2_BUCKET,
           Key: filename,
         }));
       } catch (deleteError) {
         console.error("R2 delete error:", deleteError);
         // Don't throw yet — continue to update DB even if file is missing
       }

    // Update Supabase - determine which field to update based on category
    const updateField = category === 'anniversary' ? 'annposter' : 'poster';
    const { error } = await supabase
      .from("user")
      .update({ [updateField]: false })
      .eq("id", id);

    if (error) {
      console.error("DB update error:", error);
      return NextResponse.json({ error: "Failed to update DB" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${category === 'anniversary' ? 'Anniversary poster' : 'Poster'} deleted successfully` 
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ 
      error: `Failed to delete ${category === 'anniversary' ? 'anniversary poster' : 'poster'}` 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}