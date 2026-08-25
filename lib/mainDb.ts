import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MAIN_DB_HOST || 'localhost',
  port: Number(process.env.MAIN_DB_PORT) || 3306,
  user: process.env.MAIN_DB_USER || 'vvrobots',
  password: process.env.MAIN_DB_PASSWORD || 'MD1be]qm0h2NJ*Z},P@i',
  database: process.env.MAIN_DB_NAME || 'vvrobots',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export interface MainDbUser {
  id: number;
  email: string;
  name: string;
  department?: string | null;
  password_hash: string;
  role: string;
}

export async function findMainDbUserByEmail(email: string): Promise<MainDbUser | null> {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, email, name, department, password_hash, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email.trim()]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0] as MainDbUser;
    }
    return null;
  } catch (error) {
    console.error('Error querying main vvrobots database:', error);
    return null;
  }
}
