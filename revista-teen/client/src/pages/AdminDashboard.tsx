import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useNavigate } from "wouter";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"articles" | "events">("articles");

  if (isAuthenticated && user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: articles, isLoading: articlesLoading } = trpc.articles.all.useQuery();
  const { data: events, isLoading: eventsLoading } = trpc.events.all.useQuery();

  const deleteArticle = trpc.articles.delete.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();

  const handleDeleteArticle = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este artículo?")) {
      try {
        await deleteArticle.mutateAsync({ id });
        toast.success("Artículo deletado");
      } catch (error) {
        toast.error("Erro ao deletar artículo");
      }
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este evento?")) {
      try {
        await deleteEvent.mutateAsync({ id });
        toast.success("Evento deletado");
      } catch (error) {
        toast.error("Erro ao deletar evento");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "articles" ? "default" : "outline"}
            onClick={() => setTab("articles")}
          >
            Artículos
          </Button>
          <Button
            variant={tab === "events" ? "default" : "outline"}
            onClick={() => setTab("events")}
          >
            Eventos
          </Button>
        </div>

        {tab === "articles" && (
          <div>
            <div className="mb-6">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Artículo
              </Button>
            </div>

            {articlesLoading ? (
              <div className="flex justify-center">
                <Loader2 className="animate-spin h-8 w-8" />
              </div>
            ) : (
              <div className="space-y-4">
                {articles?.map((article) => (
                  <Card key={article.id} className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{article.title}</h3>
                      <p className="text-sm text-gray-600">{article.excerpt}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteArticle(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "events" && (
          <div>
            <div className="mb-6">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
            </div>

            {eventsLoading ? (
              <div className="flex justify-center">
                <Loader2 className="animate-spin h-8 w-8" />
              </div>
            ) : (
              <div className="space-y-4">
                {events?.map((event) => (
                  <Card key={event.id} className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.location}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
