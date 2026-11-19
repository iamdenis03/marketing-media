import { NextResponse } from 'next/server';
import { verifyAndResetPassword } from '@/lib/mainDb';
import { blockedFor, clearAttempts, clientIp, recordAttempt, waitMessage } from '@/lib/rateLimit';

const WINDOW = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { email, code, password, confirmPassword } = await req.json();

    if (!email || !code || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Toate câmpurile sunt obligatorii.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Parolele nu se potrivesc.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Parola trebuie să aibă minim 6 caractere.' },
        { status: 400 }
      );
    }

    // A 6-digit code can't be guessed if only 5 wrong tries per account (30 per IP) are allowed per 15 minutes
    const emailKey = `reset:email:${String(email).toLowerCase().trim()}`;
    const ipKey = `reset:ip:${clientIp(req.headers)}`;
    const wait = Math.max(blockedFor(emailKey, 5, WINDOW), blockedFor(ipKey, 30, WINDOW));
    if (wait > 0) {
      return NextResponse.json({ error: waitMessage(wait) }, { status: 429 });
    }

    const result = await verifyAndResetPassword(email, code, password);

    if (!result.success) {
      recordAttempt(emailKey, WINDOW);
      recordAttempt(ipKey, WINDOW);
      return NextResponse.json(
        { error: result.error || 'A apărut o eroare la salvarea noii parole.' },
        { status: 400 }
      );
    }

    clearAttempts(emailKey);
    return NextResponse.json({
      success: true,
      message: 'Parola ta a fost schimbată cu succes!',
    });
  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată.' },
      { status: 500 }
    );
  }
}
