import { NextResponse } from 'next/server';
import { createPasswordResetCode } from '@/lib/mainDb';
import { sendPasswordResetCodeEmail } from '@/lib/mailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Adresa de email este obligatorie.' },
        { status: 400 }
      );
    }

    const res = await createPasswordResetCode(email);

    if (!res.success) {
      return NextResponse.json(
        { error: res.error || 'A apărut o eroare la trimiterea codului.' },
        { status: 500 }
      );
    }

    // If user was found, send the email asynchronously
    if (res.code && res.userEmail) {
      sendPasswordResetCodeEmail(res.userEmail, res.code, res.recipientName).catch((err) =>
        console.error('Error sending reset email:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dacă adresa există în sistem, am trimis un cod de securitate de 6 cifre pe email. Verifică și folderul Spam.',
    });
  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată.' },
      { status: 500 }
    );
  }
}
