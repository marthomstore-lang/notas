const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.kyrjuenufdnqoemvdjqq:MartIN1820111994%40@aws-1-us-west-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT 1')
    .then(() => {
        console.log('Connection successful!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed:', err.message);
        process.exit(1);
    });
