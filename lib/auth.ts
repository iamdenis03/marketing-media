import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { findMainDbUserByEmail } from '@/lib/mainDb';
import { Role } from '@prisma/client';
import { blockedFor, clearAttempts, clientIp, recordAttempt, waitMessage } from '@/lib/rateLimit';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;
const BAD_LOGIN = 'Email sau parolă incorectă.';

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET must be set in .env');
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'nume@vvrobots.ro' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Vă rugăm să introduceți email-ul și parola.');
        }

        const cleanEmail = credentials.email.toLowerCase().trim();
        const emailKey = `login:email:${cleanEmail}`;
        const ipKey = `login:ip:${clientIp(req?.headers as any)}`;

        // Stop password guessing: max 5 wrong tries per account and 20 per IP every 15 minutes
        const wait = Math.max(
          blockedFor(emailKey, MAX_FAILS_PER_EMAIL, LOGIN_WINDOW_MS),
          blockedFor(ipKey, MAX_FAILS_PER_IP, LOGIN_WINDOW_MS)
        );
        if (wait > 0) {
          throw new Error(waitMessage(wait));
        }

        // Query main VVRobots database exclusively for user authentication
        const mainUser = await findMainDbUserByEmail(cleanEmail);
        const isValid = mainUser ? await bcrypt.compare(credentials.password, mainUser.password_hash) : false;

        if (!mainUser || !isValid) {
          recordAttempt(emailKey, LOGIN_WINDOW_MS);
          recordAttempt(ipKey, LOGIN_WINDOW_MS);
          // Same message for unknown email and wrong password, so accounts can't be discovered
          throw new Error(BAD_LOGIN);
        }
        clearAttempts(emailKey);

        // Check or provision local user in marketing-media DB for role management
        let localUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!localUser) {
          // Determine initial default role based on main DB role / department / email
          let initialRole: Role = Role.VIEWER;
          // Only real admins of the main platform become admins here (not anyone whose email contains "admin")
          if (mainUser.role === 'admin') {
            initialRole = Role.ADMIN;
          } else if (mainUser.department === 'Marketing') {
            initialRole = Role.EDITOR;
          }

          localUser = await prisma.user.create({
            data: {
              name: mainUser.name || mainUser.email.split('@')[0],
              email: cleanEmail,
              passwordHash: mainUser.password_hash,
              role: initialRole,
            },
          });
        } else {
          // Keep passwordHash in sync if changed on main platform
          if (localUser.passwordHash !== mainUser.password_hash) {
            localUser = await prisma.user.update({
              where: { email: cleanEmail },
              data: { passwordHash: mainUser.password_hash },
            });
          }
        }

        return {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
