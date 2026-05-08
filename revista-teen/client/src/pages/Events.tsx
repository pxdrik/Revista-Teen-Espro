import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";

const NEIGHBORHOODS = [
  "Centro",
  "Vila Mariana",
  "Pinheiros",
  "Vila Madalena",
  "Consolação",
  "Bom Retiro",
  "Liberdade",
  "Bela Vista",
];

export default function Events() {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: events, isLoading } = trpc.events.search.useQuery({
    neighborhood: selectedNeighborhood || undefined,
    priceRange: priceFilter === "free" ? "0-0" : priceFilter === "low" ? "0-100" : undefined,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-black">Eventos em São Paulo</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um bairro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os bairros</SelectItem>
              {NEIGHBORHOODS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por preço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="free">Gratuito</SelectItem>
              <SelectItem value="low">Baixo custo (até R$ 100)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events?.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img
                  src={event.coverImage}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-3">{event.title}</h3>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.neighborhood}
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {event.isFree ? "Gratuito" : `R$ ${event.price}`}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{event.description}</p>

                  {event.externalLink && (
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500"
                    >
                      <a href={event.externalLink} target="_blank" rel="noopener noreferrer">
                        Saiba Mais
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
