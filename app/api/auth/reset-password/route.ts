import { NextResponse } from 'next/server';
import { verifyAndResetPassword } from '@/lib/mainDb';

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

    const result = await verifyAndResetPassword(email, code, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'A apărut o eroare la salvarea noii parole.' },
        { status: 400 }
      );
    }

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
