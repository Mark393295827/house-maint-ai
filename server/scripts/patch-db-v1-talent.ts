
import pool, { isSQLite } from '../config/database.js';

async function patchTalentEngine() {
    console.log('🧠 Patching DB for Talent Engine Hardening...');

    // Patch patterns table
    if (isSQLite) {
        const patternCols = [
            'consecutive_high_ratings INTEGER DEFAULT 0',
            'parent_pattern_id INTEGER',
            'is_variant INTEGER DEFAULT 0'
        ];
        for (const colDef of patternCols) {
            const [name] = colDef.split(' ');
            try {
                await pool.query(`ALTER TABLE patterns ADD COLUMN ${colDef}`);
                console.log(`✅ Added ${name} to patterns`);
            } catch (e) {
                if (e.message.includes('duplicate column')) {
                    console.log(`ℹ️  Column ${name} already exists`);
                } else {
                    console.log(`⚠️  Error adding ${name}: ${e.message}`);
                }
            }
        }
    } else {
        await pool.query(`
            ALTER TABLE patterns 
            ADD COLUMN IF NOT EXISTS consecutive_high_ratings INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS parent_pattern_id INTEGER,
            ADD COLUMN IF NOT EXISTS is_variant INTEGER DEFAULT 0
        `);
        console.log('✅ Postgres schema verified');
    }

    console.log('✅ Talent Engine DB Patch Complete');
    process.exit(0);
}

patchTalentEngine().catch(e => {
    console.error(e);
    process.exit(1);
});
