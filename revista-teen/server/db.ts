import { eq, and, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  articles,
  categories,
  comments,
  events,
  subscribers,
  InsertUser,
  InsertArticle,
  InsertEvent,
  InsertComment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
        updateSet[field] = user[field] ?? null;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Articles
export async function getArticles() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(articles).orderBy(articles.createdAt);
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  return result[0] || null;
}

export async function getFeaturedArticles() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(articles)
    .where(eq(articles.featured, true))
    .limit(6);
}

export async function getArticlesByCategory(categorySlug: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(categories.slug, categorySlug))
    .orderBy(articles.createdAt);
}

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(data);
  return result;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(articles).where(eq(articles.id, id));
}

// Events
export async function getEvents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events).orderBy(events.date);
}

export async function getUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db
    .select()
    .from(events)
    .where(gte(events.date, now))
    .orderBy(events.date)
    .limit(10);
}

export async function searchEvents(filters: {
  neighborhood?: string;
  priceRange?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(events);

  if (filters.neighborhood) {
    query = query.where(eq(events.neighborhood, filters.neighborhood));
  }

  if (filters.priceRange) {
    const [min, max] = filters.priceRange.split("-").map(Number);
    query = query.where(and(gte(events.price, min), lte(events.price, max)));
  }

  return await query.orderBy(events.date);
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(events).values(data);
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(events).where(eq(events.id, id));
}

// Comments
export async function getCommentsByArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.articleId, articleId))
    .orderBy(comments.createdAt);
}

export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(comments).values(data);
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(comments).where(eq(comments.id, id));
}

// Newsletter
export async function subscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(subscribers).values({ email });
}

export async function getSubscribers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscribers);
}
