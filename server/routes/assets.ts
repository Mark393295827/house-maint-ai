import express from 'express';
import { z } from 'zod';
import db, { isSQLite } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import * as Sentry from '@sentry/node';

const router = express.Router();

// Schema for adding an asset
const assetSchema = z.object({
    type: z.enum(['appliance', 'system', 'structure', 'other']),
    name: z.string().min(1, 'Name is required'),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().optional(), // YYYY-MM-DD
    warrantyExpiry: z.string().optional(), // YYYY-MM-DD
    specs: z.record(z.any()).optional() // JSON object for flexible specs
});

/**
 * GET /api/assets
 * List all assets for the authenticated user
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.id;
        const queryText = `SELECT * FROM user_assets WHERE user_id = $1 ORDER BY created_at DESC`;
        const { rows } = await db.query(queryText, [userId]);

        // Parse specs JSON
        const assets = rows.map(asset => {
            try {
                asset.specs = JSON.parse(asset.specs || '{}');
            } catch (e) {
                asset.specs = {};
            }
            return asset;
        });

        res.json({ assets });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/assets
 * Add a new asset
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.id;
        const data = assetSchema.parse(req.body);

        const specsJson = JSON.stringify(data.specs || {});

        const columns = [
            'user_id', 'type', 'name', 'brand', 'model',
            'serial_number', 'purchase_date', 'warranty_expiry', 'specs'
        ];

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = [
            userId, data.type, data.name, data.brand, data.model,
            data.serialNumber, data.purchaseDate, data.warrantyExpiry, specsJson
        ];

        const queryText = `
            INSERT INTO user_assets (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;

        const { rows } = await db.query(queryText, values);

        const asset = rows[0];
        asset.specs = JSON.parse(asset.specs || '{}');

        res.status(201).json({ asset });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/assets/:id
 * Delete an asset
 */
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.id;
        const assetId = req.params.id;

        const result = await db.query(
            `DELETE FROM user_assets WHERE id = $1 AND user_id = $2`,
            [assetId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Asset not found or unauthorized' });
        }

        res.json({ message: 'Asset deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
