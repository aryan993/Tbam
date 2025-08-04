import { NextResponse } from 'next/server';
import { supabase } from "@/app/utils/dbconnect";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    let id = formData.get('id');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name;
    const extension = '.jpg';
    if (!id) {
      id = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    }
    const key = `${id}${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload the new file
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: 'image/jpeg'
    }));

    // Update Supabase: set profile = true
    const { error: dbError } = await supabase
      .from("user")
      .update({ profile: true })
      .eq("id", id);

    if (dbError) {
      console.error('Supabase update error:', dbError);
      return NextResponse.json(
        { error: 'File uploaded but failed to update database', details: dbError.message },
        { status: 500 }
      );
    }

    const publicUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded and profile updated successfully',
      file: {
        name: key,
        size: fileBuffer.length,
        url: publicUrl
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}
