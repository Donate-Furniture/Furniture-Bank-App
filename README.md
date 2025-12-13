🏡 Furniture Exchange MVP

A community-based platform designed to facilitate the donation of furniture, vehicles, antiques, and books, helping donors obtain accurate tax receipts. Built with Next.js, TypeScript, and PostgreSQL, the platform features a smart pricing algorithm for tax value estimation, secure authentication (Social & Email), and an integrated messaging system for donor-recipient coordination.

🏗️ Project Architecture & Features

Tech Stack

Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS.

Backend: Next.js Route Handlers (API), Node.js.

Database: PostgreSQL (Relational Data), Prisma ORM.

Authentication: NextAuth.js v4 (Supports Email/Password & OAuth).

File Storage: Vercel Blob (for image uploads).

Core Data Models

User: Extended profile (Address, Phone), linked to NextAuth Accounts/Sessions.

Listing: Item details, Pricing Algorithm fields (originalPrice, purchaseYear, condition), Valuation status (isValuated), Logistics (collectionDeadline).

Message: Real-time chat system linking Sender, Recipient, and Listing context.

Key Features

Smart Pricing Algorithm: Auto-calculates estimated tax value based on item age and condition. Enforces professional valuation for items > $999.

Secure Authentication: Hybrid system supporting Social Login (Google, Facebook, Apple, Twitter) and Custom Credentials with hashed passwords.

Real-Time Messaging: Integrated Inbox and Chat Window with polling-based updates and "Unread" notification badges.

Listing Management: Full CRUD (Create, Read, Update, Delete) capabilities. Owners can manage their items; Buyers can browse with filters (Category, Price, Search).

Image Handling: Secure, direct-to-cloud uploads using Vercel Blob with support for multiple item photos and receipt verification.

Security & Safety

Role-Based Access: API routes protected via getServerSession.

Ownership Verification: Backend logic ensures only item owners can Edit/Delete their listings.

Type Safety: Centralized TypeScript definitions (lib/types.ts) and NextAuth module augmentation (next-auth.d.ts).