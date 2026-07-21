import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { isAdminRoute, isProtectedRoute } from "@/app/lib/auth-routes";
import { connectDB } from "@/app/lib/mongodb";
import User from "@/app/models/User";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

// Constant-time string comparison to avoid leaking the admin password length or
// content through response-timing differences.
function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length === b.length ? 0 : 1;
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        autoLoginToken: { label: "Auto Login Token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        const autoLoginToken = credentials?.autoLoginToken?.toString().trim();

        if (!email) {
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (
          adminEmail &&
          adminPassword &&
          email === adminEmail &&
          typeof password === "string" &&
          constantTimeEqual(password, adminPassword)
        ) {
          return {
            id: "admin",
            name: "Admin",
            email: adminEmail,
            role: "admin",
          };
        }

        await connectDB();

        if (autoLoginToken) {
          const user = await User.findOne({ email, autoLoginToken });
          if (!user || !user.emailVerified) {
            return null;
          }

          user.autoLoginToken = undefined;
          await user.save();

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: "user",
          };
        }

        if (!password) {
          return null;
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return null;
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError("Please verify your email first.");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: "user",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (isAdminRoute(pathname)) {
        if (auth?.user?.role === "admin") {
          return true;
        }

        return Response.redirect(new URL("/admin", request.nextUrl));
      }

      if (!isProtectedRoute(pathname)) {
        return true;
      }

      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (user && "role" in user && typeof user.role === "string") {
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as string) ?? "user";
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
