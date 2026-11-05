


import sharp from 'sharp';
import cloudinary from '../config/cloudinary';

export const uploadToCloudinary = async (fileBuffer: Buffer, folder: string) => {
  
  // Step 1: Check if image has transparency
  const metadata = await sharp(fileBuffer).metadata();
  const hasTransparency = metadata.hasAlpha;

  let optimizedBuffer: Buffer;
  let format: string;

  if (hasTransparency) {
    // Transparency আছে -> WebP এ রাখুন (transparency preserve + small size)
    optimizedBuffer = await sharp(fileBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    format = 'webp';
  } else {
    // Transparency নেই -> JPEG এ convert, white bg guarantee
    optimizedBuffer = await sharp(fileBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 80 })
      .toBuffer();
    format = 'jpeg';
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `glowly/${folder}`, format },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result?.public_id,
          url: result?.secure_url,
          format,
        });
      }
    );
    uploadStream.end(optimizedBuffer);
  });
};