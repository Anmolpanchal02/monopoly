import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createId } from "@/lib/utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim().slice(0, 24);
        if (!username || username.length < 2) return null;

        const guestId = `guest_${createId()}`;

        // Try persist guest when DB is available
        try {
          const { prisma } = await import("@/lib/prisma");
          const user = await prisma.user.create({
            data: {
              id: guestId,
              name: username,
              username,
              isGuest: true,
              avatar: "🎩",
              email: `${guestId}@guest.local`,
            },
          });
          await prisma.playerStats.create({ data: { userId: user.id } }).catch(() => null);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar,
          };
        } catch {
          // Offline / no-DB demo mode
          return {
            id: guestId,
            name: username,
            email: `${guestId}@guest.local`,
            image: "🎩",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me",
});
