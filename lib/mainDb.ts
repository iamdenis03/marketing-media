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

import bcrypt from 'bcrypt';
import { prisma } from './prisma';

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


export async function ensurePasswordResetTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_reset_email_code (email, code, used),
        INDEX idx_reset_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.error('Error ensuring password_reset_codes table exists:', err);
  }
}

export async function createPasswordResetCode(email: string): Promise<{
  success: boolean;
  code?: string;
  recipientName?: string;
  userEmail?: string;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await ensurePasswordResetTable();

    const [rows]: any = await pool.query(
      'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [cleanEmail]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      // Return success true without code to prevent email enumeration
      return { success: true };
    }

    const user = rows[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate existing active codes for this user
    await pool.query(
      'UPDATE password_reset_codes SET used = 1 WHERE user_id = ? AND used = 0',
      [user.id]
    );

    // Insert new code
    await pool.query(
      'INSERT INTO password_reset_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, user.email, code, expiresAt]
    );

    return {
      success: true,
      code,
      recipientName: user.name || user.email,
      userEmail: user.email,
    };
  } catch (error: any) {
    console.error('Error creating password reset code:', error);
    return { success: false, error: 'A apărut o eroare la trimiterea codului. Încearcă din nou.' };
  }
}

export async function verifyAndResetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanEmail || !cleanCode || !newPassword) {
    return { success: false, error: 'Toate câmpurile sunt obligatorii.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'Parola trebuie să aibă minim 6 caractere.' };
  }

  try {
    await ensurePasswordResetTable();

    const [rows]: any = await pool.query(
      'SELECT id, user_id FROM password_reset_codes WHERE LOWER(email) = LOWER(?) AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [cleanEmail, cleanCode]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Codul introdus este invalid sau a expirat. Solicită un cod nou.' };
    }

    const resetRecord = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update main MySQL user password
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRecord.user_id]);

    // Mark code as used
    await pool.query('UPDATE password_reset_codes SET used = 1 WHERE id = ?', [resetRecord.id]);

    // Sync local Prisma User password hash if exists
    try {
      await prisma.user.updateMany({
        where: { email: cleanEmail },
        data: { passwordHash },
      });
    } catch (prismaErr) {
      console.warn('Prisma local user password sync warning:', prismaErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'A apărut o eroare la salvarea noii parole. Te rugăm să încerci din nou.' };
  }
}

