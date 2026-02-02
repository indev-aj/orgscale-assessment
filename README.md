# OrgScale Assessment

This repository contains solutions for multiple assessment problems.

## Prerequisites

- Node.js (use the version required by this project)
- npm
- (Problem 5) PostgreSQL running locally

---

## Problem 4: Three Ways to Sum to N

### Run

```bash
npm install
npm run build
npm run problem:4
```

---

## Problem 5: A Crude Server (API + Client)

This problem includes:
- An Express + TypeScript backend API
- A React + Vite client UI
- PostgreSQL persistence via Prisma

### 1) Configure PostgreSQL

1. Ensure PostgreSQL is running on your machine.
2. Create a database (example name: `orgscale`).
3. Create a `.env` file in the project root (if it does not exist).
4. Add `DATABASE_URL` to the `.env` file:

```env
DATABASE_URL="postgresql://postgres@localhost:5432/orgscale?schema=public"
```

If your PostgreSQL user requires a password, use:

```env
DATABASE_URL="postgresql://postgres:<PASSWORD>@localhost:5432/orgscale?schema=public"
```

Notes:
- Replace `postgres` with your PostgreSQL username if different.
- Replace `<PASSWORD>` with your password if required.

### 2) Install dependencies

```bash
npm install
```

### 3) Create database tables (Prisma)

For local development / first-time setup:

```bash
npx prisma migrate dev
npx prisma generate
```

If you already have migrations and only want to apply them (commonly used in CI/production):

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4) Build and start the backend server

```bash
npm run build
npm run start
```

Backend should be available at:

```
http://localhost:3000
```

### 5) Start the frontend client (Vite)

In a separate terminal:

```bash
npm run client
```

Open the UI at:

```
http://localhost:5173/
```
