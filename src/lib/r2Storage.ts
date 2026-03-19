import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT || '';
export const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || '';

export const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads a file buffer/blob to Cloudflare R2.
 */
export async function uploadFileToR2(fileBlob: Blob, filename: string, contentType: string = 'application/pdf'): Promise<boolean> {
    try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error('R2 upload failed:', error);
        return false;
    }
}

/**
 * Generates a short-lived presigned URL for secure access.
 * Valid for 10 minutes (600 seconds) by default.
 */
export async function getPresignedUrlFromR2(filename: string, expiresIn: number = 600): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: filename,
        });

        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
        console.error('Failed to generate presigned URL:', error);
        throw error;
    }
}
