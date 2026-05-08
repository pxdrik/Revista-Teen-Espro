import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, Link } from "wouter";
import { Loader2, Share2, Twitter, MessageCircle, Instagram } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const { data: article, isLoading } = trpc.articles.bySlug.useQuery({ slug: slug || "" });
  const { data: comments } = trpc.comments.byArticle.useQuery({ articleId: article?.id || 0 });
  const createComment = trpc.comments.create.useMutation();

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/artigos/" + slug);
      return;
    }

    if (!comment.trim()) {
      toast.error("Por favor, escreva um comentário");
      return;
    }

    setSubmittingComment(true);
    try {
      await createComment.mutateAsync({
        articleId: article?.id || 0,
        content: comment,
      });
      setComment("");
      toast.success("Comentário publicado!");
    } catch (error) {
      toast.error("Erro ao publicar comentário");
    } finally {
      setSubmittingComment(false);
    }
  };

  const shareUrl = `${window.location.origin}/artigos/${slug}`;
  const shareText = `Confira este artigo na Revista Teen: ${article?.title}`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Artigo não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/artigos">
          <Button variant="ghost" className="mb-6">← Voltar</Button>
        </Link>

        <article>
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />

          <h1 className="text-4xl font-bold mb-4 text-black">{article.title}</h1>

          <div className="flex items-center justify-between mb-8 pb-8 border-b">
            <p className="text-gray-600">
              {new Date(article.createdAt).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                    "_blank"
                  );
                }}
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
                    "_blank"
                  );
                }}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(
                    `https://instagram.com/?url=${encodeURIComponent(shareUrl)}`,
                    "_blank"
                  );
                }}
              >
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="prose max-w-none mb-12">
            <p className="text-lg text-gray-700 whitespace-pre-wrap">{article.content}</p>
          </div>
        </article>

        <div className="mt-12 pt-12 border-t">
          <h2 className="text-2xl font-bold mb-8">Comentários</h2>

          {isAuthenticated ? (
            <form onSubmit={handleComment} className="mb-8">
              <Textarea
                placeholder="Deixe seu comentário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-4"
              />
              <Button type="submit" disabled={submittingComment} className="w-full">
                {submittingComment ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : null}
                Publicar Comentário
              </Button>
            </form>
          ) : (
            <Card className="p-6 mb-8 bg-blue-50">
              <p className="mb-4">Faça login para deixar um comentário</p>
              <Button onClick={() => (window.location.href = getLoginUrl())}>
                Fazer Login
              </Button>
            </Card>
          )}

          <div className="space-y-4">
            {comments?.map((c) => (
              <Card key={c.id} className="p-4">
                <p className="font-semibold mb-2">{c.userName || "Anônimo"}</p>
                <p className="text-gray-700">{c.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
