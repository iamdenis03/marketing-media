import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { findMainDbUserByEmail } from '@/lib/mainDb';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'nume@vvrobots.ro' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Vă rugăm să introduceți email-ul și parola.');
        }

        const cleanEmail = credentials.email.toLowerCase().trim();

        // Query main VVRobots database exclusively for user authentication
        const mainUser = await findMainDbUserByEmail(cleanEmail);

        if (!mainUser) {
          throw new Error('Utilizatorul nu există în baza de date VVRobots.');
        }

        // Verify password against main database hash
        const isValidPassword = await bcrypt.compare(credentials.password, mainUser.password_hash);
        if (!isValidPassword) {
          throw new Error('Parolă incorectă.');
        }

        // Check or provision local user in marketing-media DB for role management
        let localUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!localUser) {
          // Determine initial default role based on main DB role / department / email
          let initialRole: Role = Role.VIEWER;
          if (
            cleanEmail.includes('admin') ||
            cleanEmail.includes('denis') ||
            mainUser.role === 'admin'
          ) {
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
  secret: process.env.NEXTAUTH_SECRET || 'vvrobots-marketing-media-super-secret-key-2026',
};
