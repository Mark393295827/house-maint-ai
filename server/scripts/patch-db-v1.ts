
import pool, { isSQLite } from '../config/database.js';

async function patchDB() {
    console.log('🩹 Patching DB for OpenClaw v1.0...');

    // Add resolution_plan if missing
    if (isSQLite) {
        try {
            await pool.query('ALTER TABLE reports ADD COLUMN resolution_plan TEXT');
            console.log('✅ Added resolution_plan column');
        } catch (e: any) {
            if (e.message.includes('duplicate column')) {
                console.log('ℹ️ resolution_plan column already exists');
            } else {
                console.log(`⚠️ Could not add resolution_plan (might exist): ${e.message}`);
            }
        }

        // Ensure other v1.0 columns exist
        const cols = [
            'priority_protocol TEXT',
            'match_score REAL',
            'estimated_arrival TEXT',
            'confidence_score REAL',
            'issue_type TEXT',
            'severity TEXT',
            'diagnosis_summary TEXT',
            'diagnosis_result TEXT',
            'pattern_extracted INTEGER DEFAULT 0',
            'pattern_id INTEGER'
        ];

        for (const colDef of cols) {
            const [name] = colDef.split(' ');
            try {
                await pool.query(`ALTER TABLE reports ADD COLUMN ${colDef}`);
                console.log(`✅ Added ${name} column`);
            } catch (e) {
                // ignore
            }
        }

    } else {
        // Postgres
        await pool.query(`
            ALTER TABLE reports 
            ADD COLUMN IF NOT EXISTS resolution_plan TEXT,
            ADD COLUMN IF NOT EXISTS priority_protocol TEXT,
            ADD COLUMN IF NOT EXISTS match_score REAL,
            ADD COLUMN IF NOT EXISTS estimated_arrival TEXT,
            ADD COLUMN IF NOT EXISTS confidence_score REAL,
            ADD COLUMN IF NOT EXISTS issue_type TEXT,
            ADD COLUMN IF NOT EXISTS severity TEXT,
            ADD COLUMN IF NOT EXISTS diagnosis_summary TEXT
        `);
        console.log('✅ Postgres schema verified');
    }

    // Patch patterns table
    if (isSQLite) {
        const patternCols = [
            'status TEXT',
            'performance_score REAL DEFAULT 0',
            'generation_version INTEGER DEFAULT 1'
        ];
        for (const colDef of patternCols) {
            const [name] = colDef.split(' ');
            try {
                await pool.query(`ALTER TABLE patterns ADD COLUMN ${colDef}`);
                console.log(`✅ Added ${name} to patterns`);
            } catch (e) { /* ignore */ }
        }
    } else {
        await pool.query(`
            ALTER TABLE patterns 
            ADD COLUMN IF NOT EXISTS status TEXT,
            ADD COLUMN IF NOT EXISTS performance_score REAL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS generation_version INTEGER DEFAULT 1
        `);
    }

    console.log('✅ DB Patch Complete');
    process.exit(0);
}

patchDB().catch(e => {
    console.error(e);
    process.exit(1);
});
