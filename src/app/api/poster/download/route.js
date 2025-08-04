// src/app/api/poster/download/route.js
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { Buffer } from 'buffer'

// Utility: stream to buffer
async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// R2 S3-compatible client
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})


export async function POST(req) {
  try {
    const { fileName, category } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { message: 'File name is required' },
        { status: 400 }
      );
    }

    // Construct key based on category
    let key = fileName;
    if (category === 'anniversary') {
      key += '_anniv.jpg';
    } else {
      key += '_poster.jpg';
    }

    // Attempt to fetch the object from R2
    const result = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }))

    const buffer = await streamToBuffer(result.Body)
    const base64 = buffer.toString('base64')
    const mimeType = result.ContentType || 'image/jpeg'
    const downloadUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({
      downloadUrl,
      fileName: key,
      message: 'File ready for download',
    })

  } catch (error) {
    console.error('R2 download error:', error)
    const status = error.Code === 'NoSuchKey' ? 404 : 500
    return NextResponse.json(
      { message: error.message || 'Failed to download file from R2' },
      { status }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 })
}