import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { api } from './api';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'API Key',
      credentials: {
        apiKey: { label: 'API Key', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) return null;
        try {
          const result = await api.getCurrentTenant(credentials.apiKey as string);
          const tenant = result.tenant;
          if (!tenant) return null;
          return {
            id: tenant.id,
            name: tenant.name,
            apiKey: credentials.apiKey,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.apiKey = (user as any).apiKey;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session as any).apiKey = token.apiKey;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
});
