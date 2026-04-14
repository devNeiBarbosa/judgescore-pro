import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    organizationId: string | null;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      organizationId: string | null;
      actingOrganizationId: string | null;
      isSuperAdmin: boolean;
      isImpersonating: boolean;
      mustChangePassword: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId: string | null;
    mustChangePassword: boolean;
  }
}
