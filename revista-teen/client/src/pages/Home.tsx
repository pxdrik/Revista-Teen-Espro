import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, Sparkles, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { id: 1, name: "Esportes", slug: "esportes", color: "from-pink-300 to-rose-300" },
  { id: 2, name: "Música", slug: "musica", color: "from-purple-300 to-pink-300" },
  { id: 3, name: "Moda", slug: "moda", color: "from-yellow-300 to-orange-300" },
  { id: 4, name: "Entretenimento", slug: "entretenimento", color: "from-blue-300 to-cyan-300" },
  { id: 5, name: "Assuntos Gerais", slug: "assuntos-gerais", color: "from-green-300 to-emerald-300" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const { data: featuredArticles } = trpc.articles.featured.useQuery();
  const { data: upcomingEvents } = trpc.events.upcoming.useQuery();
  const subscribeNewsletter = trpc.newsletter.subscribe.useMutation();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor, insira seu email");
      return;
    }

    setSubscribing(true);
    try {
      await subscribeNewsletter.mutateAsync({ email });
      toast.success("Obrigado por se inscrever!");
      setEmail("");
    } catch (error) {
      toast.error("Erro ao se inscrever. Tente novamente.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-yellow-50 to-blue-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-6">
                Entretenimento para sua geração
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                Descubra as últimas tendências em música, moda, esportes e entretenimento. Sua revista digital de confiança.
              </p>
              <div className="flex gap-4">
                <Link href="/artigos">
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-6 text-lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Explorar artigos
                  </Button>
                </Link>
                <Link href="/eventos">
                  <Button variant="outline" className="px-8 py-6 text-lg border-2">
                    <Calendar className="mr-2 h-5 w-5" />
                    Buscar eventos
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="/manus-storage/revista-teen-logo-copilot_a1b2c3d4.png"
                alt="Revista Teen"
                className="max-w-md w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-12 text-center text-black">Categorias</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={`/artigos?categoria=${cat.slug}`}>
                <Card className={`bg-gradient-to-br ${cat.color} p-6 cursor-pointer hover:shadow-lg transition-shadow`}>
                  <h3 className="font-bold text-lg text-gray-800">{cat.name}</h3>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-12 text-black">Artigos em Destaque</h2>
          {featuredArticles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.map((article) => (
                <Link key={article.id} href={`/artigos/${article.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <img src={article.coverImage} alt={article.title} className="w-full h-48 object-cover" />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{article.title}</h3>
                      <p className="text-gray-600 text-sm">{article.excerpt}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-12 text-black">Eventos Próximos</h2>
          {upcomingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.slice(0, 4).map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <img src={event.coverImage} alt={event.title} className="w-full h-40 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{event.location}</p>
                    <p className="text-sm font-semibold text-pink-600">
                      {event.isFree ? "Gratuito" : `R$ ${event.price}`}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">Fique por dentro</h2>
          <p className="text-white mb-8">Receba as melhores notícias direto no seu email</p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={subscribing}
              className="bg-white text-pink-600 hover:bg-gray-100"
            >
              {subscribing ? <Loader2 className="animate-spin h-4 w-4" /> : "Inscrever"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
