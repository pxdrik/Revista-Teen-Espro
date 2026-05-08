import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
  { id: 1, name: "Esportes", slug: "esportes" },
  { id: 2, name: "Música", slug: "musica" },
  { id: 3, name: "Moda", slug: "moda" },
  { id: 4, name: "Entretenimento", slug: "entretenimento" },
  { id: 5, name: "Assuntos Gerais", slug: "assuntos-gerais" },
];

export default function Articles() {
  const search = useSearch();
  const categorySlug = new URLSearchParams(search).get("categoria");
  const selectedCategory = CATEGORIES.find((c) => c.slug === categorySlug);

  const { data: articles, isLoading } = trpc.articles.byCategory.useQuery({
    categorySlug: categorySlug || "esportes",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-black">
          {selectedCategory?.name || "Artigos"}
        </h1>

        {/* Category Filter */}
        <div className="flex gap-2 mb-12 overflow-x-auto pb-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={`/artigos?categoria=${cat.slug}`}>
              <Button
                variant={selectedCategory?.id === cat.id ? "default" : "outline"}
                className="whitespace-nowrap"
              >
                {cat.name}
              </Button>
            </Link>
          ))}
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles?.map((article) => (
              <Link key={article.id} href={`/artigos/${article.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{article.excerpt}</p>
                    <p className="text-xs text-gray-500 mt-4">
                      {new Date(article.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
