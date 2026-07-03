import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsRoot = join(__dirname, '..', 'uploads');

type UploadField = 'voice' | 'video' | 'image';

interface DetectedUploadType {
    mimeType: string;
    extension: string;
}

interface StoredUpload {
    url: string;
    filename: string;
    size: number;
    storage: 's3' | 'local';
    mimeType: string;
}

class UploadValidationError extends Error { }

const allowedFields = new Set<UploadField>(['voice', 'video', 'image']);

const folderForField = (fieldname: string) => {
    if (fieldname === 'voice') return 'voice';
    if (fieldname === 'video') return 'video';
    if (fieldname === 'image') return 'images';
    return 'uploads';
};

const hasS3Config = Boolean(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
);

const s3 = hasS3Config
    ? new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        },
        endpoint: process.env.AWS_ENDPOINT,
        forcePathStyle: Boolean(process.env.AWS_ENDPOINT)
    })
    : null;

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        if (allowedFields.has(file.fieldname as UploadField)) {
            cb(null, true);
            return;
        }

        cb(new UploadValidationError('Invalid upload field'));
    },
    limits: {
        fileSize: 50 * 1024 * 1024,
    }
});

function startsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
}

function hasAscii(buffer: Buffer, offset: number, value: string): boolean {
    return buffer.length >= offset + value.length && buffer.toString('ascii', offset, offset + value.length) === value;
}

function hasFtypBox(buffer: Buffer): boolean {
    return hasAscii(buffer, 4, 'ftyp');
}

function detectUploadType(file: Express.Multer.File): DetectedUploadType {
    const field = file.fieldname as UploadField;
    const buffer = file.buffer;

    if (!buffer || buffer.length < 4) {
        throw new UploadValidationError('Invalid or empty upload');
    }

    if (field === 'image') {
        if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
            return { mimeType: 'image/jpeg', extension: '.jpg' };
        }

        if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
            return { mimeType: 'image/png', extension: '.png' };
        }

        if (hasAscii(buffer, 0, 'RIFF') && hasAscii(buffer, 8, 'WEBP')) {
            return { mimeType: 'image/webp', extension: '.webp' };
        }

        if (hasAscii(buffer, 0, 'GIF87a') || hasAscii(buffer, 0, 'GIF89a')) {
            return { mimeType: 'image/gif', extension: '.gif' };
        }
    }

    if (field === 'voice') {
        if (hasAscii(buffer, 0, 'ID3') || startsWith(buffer, [0xff, 0xfb]) || startsWith(buffer, [0xff, 0xf3]) || startsWith(buffer, [0xff, 0xf2])) {
            return { mimeType: 'audio/mpeg', extension: '.mp3' };
        }

        if (hasAscii(buffer, 0, 'RIFF') && hasAscii(buffer, 8, 'WAVE')) {
            return { mimeType: 'audio/wav', extension: '.wav' };
        }

        if (hasAscii(buffer, 0, 'OggS')) {
            return { mimeType: 'audio/ogg', extension: '.ogg' };
        }

        if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
            return { mimeType: 'audio/webm', extension: '.webm' };
        }

        if (hasFtypBox(buffer)) {
            return { mimeType: 'audio/mp4', extension: '.m4a' };
        }
    }

    if (field === 'video') {
        if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
            return { mimeType: 'video/webm', extension: '.webm' };
        }

        if (hasFtypBox(buffer)) {
            const majorBrand = buffer.toString('ascii', 8, 12);
            if (majorBrand === 'qt  ') {
                return { mimeType: 'video/quicktime', extension: '.mov' };
            }

            return { mimeType: 'video/mp4', extension: '.mp4' };
        }
    }

    throw new UploadValidationError('Unsupported upload content');
}

function s3UrlForKey(key: string): string {
    const publicBaseUrl = process.env.AWS_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    if (publicBaseUrl) {
        return `${publicBaseUrl}/${key}`;
    }

    const bucket = process.env.AWS_BUCKET_NAME || 'house-maint-uploads';
    if (process.env.AWS_ENDPOINT) {
        return `${process.env.AWS_ENDPOINT.replace(/\/+$/, '')}/${bucket}/${key}`;
    }

    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function persistUpload(file: Express.Multer.File): Promise<StoredUpload> {
    const detected = detectUploadType(file);
    const folder = folderForField(file.fieldname);
    const filenameOnly = `${Date.now()}-${crypto.randomUUID()}${detected.extension}`;
    const filename = `${folder}/${filenameOnly}`;

    if (hasS3Config && s3) {
        const bucket = process.env.AWS_BUCKET_NAME || 'house-maint-uploads';
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: filename,
            Body: file.buffer,
            ContentType: detected.mimeType,
            Metadata: {
                fieldName: file.fieldname
            }
        }));

        return {
            url: s3UrlForKey(filename),
            filename,
            size: file.size,
            storage: 's3',
            mimeType: detected.mimeType
        };
    }

    const destination = join(uploadsRoot, folder);
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, filenameOnly), file.buffer, { flag: 'wx' });

    return {
        url: `/uploads/${filename}`,
        filename,
        size: file.size,
        storage: 'local',
        mimeType: detected.mimeType
    };
}

function handleMulterError(err: unknown, res: Response, next: NextFunction): void {
    if (!err) {
        next();
        return;
    }

    if (err instanceof multer.MulterError || err instanceof UploadValidationError || err instanceof Error) {
        res.status(400).json({ error: 'Invalid upload' });
        return;
    }

    next(err);
}

function singleUpload(field: UploadField) {
    return (req: Request, res: Response, next: NextFunction) => {
        upload.single(field)(req, res, err => handleMulterError(err, res, next));
    };
}

function multiImageUpload(req: Request, res: Response, next: NextFunction) {
    upload.array('image', 5)(req, res, err => handleMulterError(err, res, next));
}

async function handleSingleUpload(req: Request, res: Response, next: NextFunction, missingMessage: string, successMessage: string) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: missingMessage });
        }

        const stored = await persistUpload(req.file);
        res.json({
            message: successMessage,
            ...stored
        });
    } catch (error) {
        if (error instanceof UploadValidationError) {
            return res.status(400).json({ error: 'Invalid upload' });
        }
        next(error);
    }
}

/**
 * POST /api/uploads/voice
 * Upload voice recording
 */
router.post('/voice', authenticate, singleUpload('voice'), (req, res, next) =>
    handleSingleUpload(req, res, next, 'No voice file uploaded', 'Voice uploaded successfully')
);

/**
 * POST /api/uploads/video
 * Upload video recording
 */
router.post('/video', authenticate, singleUpload('video'), (req, res, next) =>
    handleSingleUpload(req, res, next, 'No video file uploaded', 'Video uploaded successfully')
);

/**
 * POST /api/uploads/image
 * Upload image
 */
router.post('/image', authenticate, singleUpload('image'), (req, res, next) =>
    handleSingleUpload(req, res, next, 'No image file uploaded', 'Image uploaded successfully')
);

/**
 * POST /api/uploads/images
 * Upload multiple images
 */
router.post('/images', authenticate, multiImageUpload, async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const files = req.files as Express.Multer.File[];
        const responses = await Promise.all(files.map(persistUpload));

        res.json({
            message: 'Images uploaded successfully',
            urls: responses.map(file => file.url),
            files: responses,
            count: responses.length
        });
    } catch (error) {
        if (error instanceof UploadValidationError) {
            return res.status(400).json({ error: 'Invalid upload' });
        }
        next(error);
    }
});

export default router;
