# Glass Budget v2

A professional, trustworthy budget management application built with Next.js 16, React, Material UI, and Prisma.

## Features

- **Modern Stack**: Next.js 16, React 19, TypeScript, Material UI
- **Database**: SQLite with Prisma ORM (easily upgradeable to PostgreSQL)
- **Authentication**: Secure authentication with NextAuth.js and bcrypt
- **State Management**: TanStack Query (React Query) for server state
- **Professional UI**: Material UI components with custom theme
- **Performance Focused**: Optimized for speed and reliability

## Key Features (In Development)

- Account Management (checking, savings, credit, loans)
- Transaction Tracking with reconciliation
- Bill Management and reminders
- Savings Goals tracking
- Budget vs Actual reporting
- Loan amortization calculations
- Data export (CSV, PDF)
- Audit logging for all changes

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd glass-budget
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and update the values
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run type-check  # Run TypeScript type checking
```

## Database

The application uses SQLite by default for easy setup. To use PostgreSQL in production:

1. Update `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/glass_budget"
```

2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:
```bash
npx prisma db push
```

## Project Structure

```
├── app/                    # Next.js 16 App Router
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── theme.ts          # Material UI theme
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Material UI v6
- **Language**: TypeScript
- **Database**: Prisma ORM with SQLite/PostgreSQL
- **Authentication**: NextAuth.js
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts (coming soon)

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT-based session management
- CSRF protection
- Input validation with Zod schemas
- Audit logging for all data changes

## v2 Improvements Over v1

1. **Modern Framework**: Migrated from Flask/Vanilla JS to Next.js/React
2. **Type Safety**: Full TypeScript coverage
3. **Component Library**: Material UI for professional, accessible UI
4. **Better State Management**: React Query for server state caching
5. **Enhanced Security**: Improved authentication and audit logging
6. **Reconciliation**: Transaction status tracking for bank reconciliation
7. **Performance**: Pagination, virtualization, and optimistic updates
8. **Data Export**: CSV and PDF export capabilities
9. **Testing**: Comprehensive test coverage (coming soon)
10. **Professional Design**: Focus on clarity and trust over visual effects

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
