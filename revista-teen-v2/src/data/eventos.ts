/**
 * AGENDA - apenas eventos reais e verificáveis, todos presentes na pauta editorial.
 *
 * Regras:
 *  - `officialUrl` aponta sempre para o site do organizador. Nada de example.com,
 *    placeholder ou link inventado.
 *  - `image` reaproveita a foto da matéria do MESMO evento, então a imagem sempre
 *    corresponde ao assunto.
 *  - Preço não é informado de propósito: varia por lote e setor, e a revista não
 *    publica número que não pode sustentar. O leitor vai à fonte oficial.
 */
export interface EventItem {
  id: number;
  name: string;
  description: string;
  venue: string;
  city: string;
  country: string;
  /** ISO do primeiro dia. */
  startDate: string;
  /** ISO do último dia. */
  endDate: string;
  /** Texto exibido, já formatado. */
  dateLabel: string;
  image: string;
  imageAlt: string;
  officialUrl: string;
  /** Precisa ser um slug existente em categoryStyles. */
  category: string;
}

export const eventos: EventItem[] = [
  {
    id: 1,
    name: "Rock in Rio 2026",
    description:
      "O maior festival de música do Brasil volta à Cidade do Rock, no Parque Olímpico, para sete dias divididos em dois fins de semana, com line-up que atravessa pop, rock, rap e eletrônica.",
    venue: "Parque Olímpico, Cidade do Rock",
    city: "Rio de Janeiro",
    country: "Brasil",
    startDate: "2026-09-04",
    endDate: "2026-09-13",
    dateLabel: "4 a 7 e 11 a 13 de setembro de 2026",
    image: "/images/artigos/rock-in-rio-2026-lineup.jpg",
    imageAlt: "Logotipo do Rock in Rio iluminado sobre o palco do festival",
    officialUrl: "https://rockinrio.com/rio/pt-br/",
    category: "musica",
  },
  {
    id: 2,
    name: "CCXP26",
    description:
      "A Comic Con Experience ocupa o São Paulo Expo com painéis, artistas, estandes de estúdios e o Artists Valley, no maior encontro de cultura pop do país.",
    venue: "São Paulo Expo",
    city: "São Paulo",
    country: "Brasil",
    startDate: "2026-12-03",
    endDate: "2026-12-06",
    dateLabel: "3 a 6 de dezembro de 2026",
    image: "/images/artigos/ccxp-2026.jpg",
    imageAlt: "Logotipo da CCXP 2026 em painel do evento",
    officialUrl: "https://ccxp.com.br/",
    category: "cultura-pop",
  },
  {
    id: 3,
    name: "Tomorrowland 2026",
    description:
      "O maior festival de música eletrônica do mundo ocupa o parque De Schorre, em Boom, por dois fins de semana, reunindo dezenas de palcos e público de mais de 200 países.",
    venue: "De Schorre",
    city: "Boom",
    country: "Bélgica",
    startDate: "2026-07-17",
    endDate: "2026-07-26",
    dateLabel: "17 a 19 e 24 a 26 de julho de 2026",
    image: "/images/artigos/tomorrowland-2026-datas.jpg",
    imageAlt: "Palco principal do Tomorrowland iluminado durante apresentação noturna",
    officialUrl: "https://www.tomorrowland.com/",
    category: "musica",
  },
  {
    id: 4,
    name: "Lollapalooza Brasil 2026",
    description:
      "Três dias no Autódromo de Interlagos com quatro palcos simultâneos, reunindo pop, rock, eletrônica e música urbana em uma das maiores edições do festival no país.",
    venue: "Autódromo de Interlagos",
    city: "São Paulo",
    country: "Brasil",
    startDate: "2026-03-20",
    endDate: "2026-03-22",
    dateLabel: "20 a 22 de março de 2026",
    image: "/images/artigos/lollapalooza-brasil-2026-confirmacoes.jpg",
    imageAlt: "Público reunido diante do palco do Lollapalooza Brasil",
    officialUrl: "https://www.lollapaloozabr.com/",
    category: "musica",
  },
];
