import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getArticles,
  getArticleBySlug,
  getFeaturedArticles,
  getArticlesByCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  getEvents,
  getUpcomingEvents,
  searchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getCommentsByArticle,
  createComment,
  deleteComment,
  subscribeNewsletter,
  getSubscribers,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  articles: router({
    all: publicProcedure.query(() => getArticles()),
    featured: publicProcedure.query(() => getFeaturedArticles()),
    byCategory: publicProcedure
      .input(z.object({ categorySlug: z.string() }))
      .query(({ input }) => getArticlesByCategory(input.categorySlug)),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getArticleBySlug(input.slug)),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          content: z.string(),
          excerpt: z.string(),
          categoryId: z.number(),
          coverImage: z.string(),
          featured: z.boolean().optional(),
        })
      )
      .mutation(({ input, ctx }) =>
        createArticle({
          ...input,
          authorId: ctx.user?.id || 0,
        })
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          coverImage: z.string().optional(),
          featured: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => updateArticle(input.id, input)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteArticle(input.id)),
  }),

  events: router({
    all: publicProcedure.query(() => getEvents()),
    upcoming: publicProcedure.query(() => getUpcomingEvents()),
    search: publicProcedure
      .input(
        z.object({
          neighborhood: z.string().optional(),
          priceRange: z.string().optional(),
        })
      )
      .query(({ input }) => searchEvents(input)),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string(),
          location: z.string(),
          neighborhood: z.string(),
          date: z.date(),
          price: z.number(),
          isFree: z.boolean(),
          coverImage: z.string(),
          externalLink: z.string().optional(),
        })
      )
      .mutation(({ input }) => createEvent(input)),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
          neighborhood: z.string().optional(),
          date: z.date().optional(),
          price: z.number().optional(),
          isFree: z.boolean().optional(),
          coverImage: z.string().optional(),
          externalLink: z.string().optional(),
        })
      )
      .mutation(({ input }) => updateEvent(input.id, input)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteEvent(input.id)),
  }),

  comments: router({
    byArticle: publicProcedure
      .input(z.object({ articleId: z.number() }))
      .query(({ input }) => getCommentsByArticle(input.articleId)),
    create: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          content: z.string().min(1).max(500),
        })
      )
      .mutation(({ input, ctx }) =>
        createComment({
          ...input,
          userId: ctx.user?.id || 0,
        })
      ),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteComment(input.id)),
  }),

  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(({ input }) => subscribeNewsletter(input.email)),
    subscribers: protectedProcedure.query(() => getSubscribers()),
  }),
});

export type AppRouter = typeof appRouter;
