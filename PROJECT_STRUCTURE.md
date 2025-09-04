# NumGate Project Structure

## Directory Organization

```
numgate/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   │   ├── register/
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   └── token/
│   │   └── tenant/       # Tenant management
│   ├── dashboard/        # Protected dashboard
│   ├── register/         # Registration page
│   ├── login/           # Login page
│   └── page.tsx         # Home page
├── components/           # Reusable components
│   ├── dashboard/       # Dashboard components
│   └── layout/          # Layout components
├── lib/                 # Core utilities
│   ├── auth/           # Authentication logic
│   │   ├── jwt.ts      # JWT token management
│   │   ├── password.ts # Password hashing
│   │   └── token-transfer.ts # Cross-app token transfer
│   └── supabase/       # Database clients
│       ├── client.ts   # Browser client
│       └── server.ts   # Server client (with service key)
├── types/              # TypeScript definitions
│   └── database.ts     # Database models
├── supabase/           # Database schema
│   ├── schema.sql
│   └── rls-policies.sql
└── middleware.ts       # Route protection

```

## Authentication Flow

1. **Registration**: Creates tenant + owner user
2. **Login**: Validates credentials, generates JWT
3. **Dashboard**: Protected route showing tenant apps
4. **Cross-App Navigation**: Passes JWT token to other apps

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_KEY` - Service role key (server only)
- `JWT_SECRET` - Secret for signing JWTs
- `NEXT_PUBLIC_GATEWAY_URL` - Gateway app URL
- `NEXT_PUBLIC_PAGE_BUILDER_URL` - Page Builder app URL

## Key Files

- `middleware.ts` - Protects routes and validates JWT
- `lib/auth/jwt.ts` - JWT generation and validation
- `app/api/auth/*` - Authentication endpoints
- `app/dashboard/page.tsx` - Main dashboard UI