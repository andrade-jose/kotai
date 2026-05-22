import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import db from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email;
      const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
      if (!email || !allowed.includes(email)) return false;

      const existing = db.prepare('SELECT id FROM admins WHERE google_id = ?').get(profile!.sub!);
      if (!existing) {
        db.prepare('INSERT INTO admins (google_id, email, name, avatar) VALUES (?, ?, ?, ?)').run(
          profile!.sub,
          email,
          profile!.name || '',
          (profile as any).picture || ''
        );
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};