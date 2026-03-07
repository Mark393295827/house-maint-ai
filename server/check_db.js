import Database from 'better-sqlite3';

const db = new Database('house_maint.db', { readonly: true });

try {
    const users = db.prepare('SELECT id, phone, name, role FROM users LIMIT 10').all();
    console.log(JSON.stringify(users, null, 2));
} catch (err) {
    console.error('Error reading db:', err);
}
