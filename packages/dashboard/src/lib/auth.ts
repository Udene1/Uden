import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DEFAULT_ENGINE_URL } from '@ai-work-partner/shared';

const ENGINE_URL = process.env.ENGINE_URL || process.env.NEXT_PUBLIC_ENGINE_URL || DEFAULT_ENGINE_URL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'API Key',
      credentials: { apiKey: { label: 'API Key', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.apiKey) return null;
        try {
          const response = await fetch(`${ENGINE_URL}/api/v1/auth/session`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ apiKey: credentials.apiKey as string, client: 'web' }),
          });
          if (!response.ok) return null;
          const result = await response.json() as { tenant?: { id:string; name:string }; session_token?:string; expires_at?:string };
          if (!result.tenant || !result.session_token) return null;
          return { id: result.tenant.id, name: result.tenant.name, engineSessionToken: result.session_token, engineSessionExpiresAt: result.expires_at };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.engineSessionToken = (user as any).engineSessionToken;
        token.engineSessionExpiresAt = (user as any).engineSessionExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session as any).engineSessionToken = token.engineSessionToken;
        (session as any).engineSessionExpiresAt = token.engineSessionExpiresAt;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
