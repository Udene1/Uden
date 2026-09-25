import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { api } from './api';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Uden account',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const result = await api.login(String(credentials.email), String(credentials.password));
          return { id: result.tenant.id, name: result.tenant.name, email: result.tenant.email, sessionToken: result.session_token };
        } catch { return null; }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.sessionToken = (user as any).sessionToken; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id as string; (session as any).sessionToken = token.sessionToken; }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
