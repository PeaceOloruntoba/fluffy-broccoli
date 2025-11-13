import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadBuffer(buffer: Buffer, folder: string, filename?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename },
      (error, result) => {
        if (error || !result?.secure_url) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
