generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // hashed; use bcrypt in production
  role      String   // "admin" | "client"
  clientId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
}

model Client {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  ga4PropertyId     String?
  youtubeChannelId  String?
  metaAdAccountId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  users     User[]
  locations Location[]
  requests  Request[]
  snapshots KpiSnapshot[]
}

model Location {
  id        String   @id @default(cuid())
  clientId  String
  gbpId     String   // Google Business Profile location ID
  name      String
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model Request {
  id        String   @id @default(cuid())
  clientId  String
  source    String   // e.g. "request-center"
  payload   String   // JSON string of form data
  createdAt DateTime @default(now())

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

period String @default("daily")

model KpiSnapshot {
  id        String         @id @default(cuid())
  clientId  String
  period    SnapshotPeriod
  date      DateTime       // snapshot date (day or month start)
  metrics   String         // JSON: { ga4?: {...}, youtube?: {...}, meta?: {...}, gbp?: {...} }
  createdAt DateTime       @default(now())

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([clientId, period, date])
  @@index([clientId, period, date])
}
