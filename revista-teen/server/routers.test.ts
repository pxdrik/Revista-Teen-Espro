import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("tRPC Routers", () => {
  it("should list articles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const articles = await caller.articles.all();
    expect(Array.isArray(articles)).toBe(true);
  });

  it("should get featured articles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const featured = await caller.articles.featured();
    expect(Array.isArray(featured)).toBe(true);
  });

  it("should search events", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const events = await caller.events.search({});
    expect(Array.isArray(events)).toBe(true);
  });

  it("should get upcoming events", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const upcoming = await caller.events.upcoming();
    expect(Array.isArray(upcoming)).toBe(true);
  });

  it("should get comments by article", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const comments = await caller.comments.byArticle({ articleId: 1 });
    expect(Array.isArray(comments)).toBe(true);
  });
});
