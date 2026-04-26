import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    sessionToken?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
    };
    sessionToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    sessionToken?: string;
    archivedCheckedAt?: number;
  }
}
