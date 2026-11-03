import sharp from 'sharp';

export const sanitizeImage = async (buffer: Buffer) => {
    const image = sharp(buffer, { limitInputPixels: 20_000_000 });
    const metadata = await image.metadata();
    if (metadata.format === 'jpeg') {
        return { buffer: await image.rotate().jpeg({ quality: 85 }).toBuffer(), mimeType: 'image/jpeg' };
    }
    if (metadata.format === 'png' || metadata.format === 'webp') {
        return { buffer: await image.rotate().png().toBuffer(), mimeType: 'image/png' };
    }
    throw new Error('Unsupported image format');
};
