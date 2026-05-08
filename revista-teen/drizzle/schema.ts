import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  datetime,
  longtext,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: longtext("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: varchar("coverImage", { length: 500 }),
  categoryId: int("categoryId").notNull(),
  authorId: int("authorId").notNull(),
  featured: boolean("featured").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: longtext("description"),
  location: varchar("location", { length: 255 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  date: datetime("date"),
  price: decimal("price", { precision: 10, scale: 2 }),
  isFree: boolean("isFree").default(false),
  coverImage: varchar("coverImage", { length: 500 }),
  externalLink: varchar("externalLink", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  content: text("content").notNull(),
  articleId: int("articleId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
});

export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  subject: varchar("subject", { length: 255 }),
  status: mysqlEnum("status", ["sent", "failed"]),
  sentAt: timestamp("sentAt").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
