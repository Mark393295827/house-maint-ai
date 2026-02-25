import express from 'express';
import multer from 'multer';
import { extname } from 'path';
import { authenticate } from '../middleware/auth.js';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

const router = express.Router();

// S3 Client configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    // Optional endpoint for R2/MinIO
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: !!process.env.AWS_ENDPOINT // Needed for some non-AWS providers
});

// Configure multer storage
const storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME || 'house-maint-uploads',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);

        let folder = 'uploads';
        if (file.fieldname === 'voice') folder = 'voice';
        else if (file.fieldname === 'video') folder = 'video';
        else if (file.fieldname === 'image') folder = 'images';

        cb(null, `${folder}/${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes: Record<string, string[]> = {
        voice: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    };

    const allowed = allowedMimes[file.fieldname] || [];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    }
});

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}

/**
 * POST /api/uploads/voice
 * Upload voice recording
 */
router.post('/voice', authenticate, upload.single('voice'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No voice file uploaded' });
    }

    const file = req.file as MulterS3File;

    res.json({
        message: 'Voice uploaded successfully',
        url: file.location,
        filename: file.key,
        size: file.size
    });
});

/**
 * POST /api/uploads/video
 * Upload video recording
 */
router.post('/video', authenticate, upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    const file = req.file as MulterS3File;

    res.json({
        message: 'Video uploaded successfully',
        url: file.location,
        filename: file.key,
        size: file.size
    });
});

/**
 * POST /api/uploads/image
 * Upload image
 */
router.post('/image', authenticate, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
    }

    const file = req.file as MulterS3File;

    res.json({
        message: 'Image uploaded successfully',
        url: file.location,
        filename: file.key,
        size: file.size
    });
});

/**
 * POST /api/uploads/images
 * Upload multiple images
 */
router.post('/images', authenticate, upload.array('image', 5), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
    }

    const files = req.files as MulterS3File[];
    const urls = files.map(file => file.location);

    res.json({
        message: 'Images uploaded successfully',
        urls,
        count: req.files.length
    });
});

export default router;
