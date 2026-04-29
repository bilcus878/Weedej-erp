import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditService'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',  type: 'email'    },
        password: { label: 'Heslo', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Step 1: verify credentials against the base User table (always safe)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        // Step 2: load RBAC data — guarded separately so login survives missing tables
        let roles: string[]       = []
        let permissions: string[] = []
        try {
          const userWithRoles = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: { include: { permission: true } },
                    },
                  },
                },
              },
            },
          })
          if (userWithRoles) {
            roles = userWithRoles.userRoles.map(ur => ur.role.name)
            permissions = [
              ...new Set(
                userWithRoles.userRoles.flatMap(ur =>
                  ur.role.rolePermissions.map(rp => rp.permission.name)
                )
              ),
            ]
          }
        } catch {
          // RBAC tables not yet migrated — login still succeeds with empty roles/permissions
        }

        // Audit: successful login (fire-and-forget)
        const ip =
          (req as any)?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
          (req as any)?.headers?.['x-real-ip'] ??
          null

        createAuditLog({
          userId:     user.id,
          username:   user.email,
          role:       roles[0] ?? null,
          actionType: 'LOGIN',
          module:     'auth',
          ipAddress:  ip,
        }).catch(() => {})

        return {
          id:          user.id,
          email:       user.email,
          name:        user.name,
          roles,
          permissions,
        }
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hodin
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id          = user.id
        token.roles       = (user as any).roles       ?? []
        token.permissions = (user as any).permissions ?? []
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id          = token.id
        ;(session.user as any).roles       = token.roles       ?? []
        ;(session.user as any).permissions = token.permissions ?? []
      }
      return session
    },
  },

  events: {
    async signOut({ token }) {
      if (!token?.id) return
      createAuditLog({
        userId:     token.id as string,
        username:   token.email as string | null,
        role:       ((token.roles as string[]) ?? [])[0] ?? null,
        actionType: 'LOGOUT',
        module:     'auth',
      }).catch(() => {})
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
