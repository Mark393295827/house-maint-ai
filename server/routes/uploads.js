import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Ensure upload directories exist
const uploadsDir = join(__dirname, '..', 'uploads');
const voiceDir = join(uploadsDir, 'voice');
const videoDir = join(uploadsDir, 'video');
const imageDir = join(uploadsDir, 'images');

[uploadsDir, voiceDir, videoDir, imageDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = uploadsDir;
        if (file.fieldname === 'voice') dest = voiceDir;
        else if (file.fieldname === 'video') dest = videoDir;
        else if (file.fieldname === 'image') dest = imageDir;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedMimes = {
        voice: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    };

    const allowed = allowedMimes[file.fieldname] || [];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    }
});

/**
 * POST /api/uploads/voice
 * Upload voice recording
 */
router.post('/voice', authenticate, upload.single('voice'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No voice file uploaded' });
    }

    const url = `/uploads/voice/${req.file.filename}`;

    res.json({
        message: 'Voice uploaded successfully',
        url,
        filename: req.file.filename,
        size: req.file.size
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

    const url = `/uploads/video/${req.file.filename}`;

    res.json({
        message: 'Video uploaded successfully',
        url,
        filename: req.file.filename,
        size: req.file.size
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

    const url = `/uploads/images/${req.file.filename}`;

    res.json({
        message: 'Image uploaded successfully',
        url,
        filename: req.file.filename,
        size: req.file.size
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

    const urls = req.files.map(file => `/uploads/images/${file.filename}`);

    res.json({
        message: 'Images uploaded successfully',
        urls,
        count: req.files.length
    });
});

export default router;
