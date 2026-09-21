// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema/users";
import { organizationMembers } from "@/db/schema/organizations";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // DrizzleAdapter ships a union type that doesn't perfectly match custom
  // schema tables — we pass them as-is and let NextAuth read columns at runtime.
  adapter: DrizzleAdapter(db, {
    usersTable: users as never,
    accountsTable: accounts as never,
    sessionsTable: sessions as never,
    verificationTokensTable: verificationTokens as never,
  }),
  providers: [
    Credentials({
      name: "Email (Invite-only demo)",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        if (typeof email !== "string" || !email.includes("@")) return null;
        const normalized = email.trim().toLowerCase();

        // 🔐 INVITE-ONLY: the account must already exist...
        const user = await db.query.users.findFirst({
          where: eq(users.email, normalized),
        });
        if (!user) return null;

        // 🔐 ...AND must be an active member of a workspace.
        // No auto-provisioning: strangers can never obtain a session.
        const membership = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, user.id),
            eq(organizationMembers.isActive, true)
          ),
        });
        if (!membership) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        (token as { id?: string }).id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as { id?: string };
      if (session.user && t.id) {
        (session.user as { id?: string }).id = t.id;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});