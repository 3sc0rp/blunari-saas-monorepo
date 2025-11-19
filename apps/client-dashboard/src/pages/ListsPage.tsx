import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLUNARI_LISTS } from "@/data/atlanta-guide";

const ListsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40">
              <Sparkles className="h-3 w-3" />
              Curated lists
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Blunari Lists · Atlanta
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Hand-picked collections to help you decide where to eat, drink,
              and celebrate around the city.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BLUNARI_LISTS.map((list, index) => (
            <motion.button
              key={list.slug}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/lists/${list.slug}`)}
              className="group h-full text-left"
            >
              <Card className="h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm transition-colors group-hover:border-amber-500/70">
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={list.coverImageUrl}
                    alt={list.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      Atlanta · Dining Guide
                    </Badge>
                    <span className="text-[11px] text-slate-500">
                      {list.restaurants.length} places
                    </span>
                  </div>
                  <h2 className="line-clamp-2 text-sm font-semibold text-white">
                    {list.title}
                  </h2>
                  <p className="line-clamp-2 text-xs text-slate-400">
                    {list.description}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                      View list
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListsPage;


