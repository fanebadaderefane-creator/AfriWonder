import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  GraduationCap, Wrench, Paintbrush, Home, Laptop, Heart,
  Car, UtensilsCrossed, Camera, Music, Scissors, Dumbbell
} from "lucide-react";

const ICON_MAP = {
  GraduationCap, Wrench, Paintbrush, Home, Laptop, Heart,
  Car, UtensilsCrossed, Camera, Music, Scissors, Dumbbell
};

const GRADIENT_COLORS = [
  "from-blue-500 to-blue-600",
  "from-green-500 to-emerald-600",
  "from-blue-400 to-indigo-500",
  "from-indigo-400 to-blue-500",
  "from-purple-400 to-violet-500",
  "from-teal-400 to-cyan-500",
  "from-sky-400 to-blue-500",
  "from-blue-400 to-indigo-500",
];

export default function CategoryGrid({ categories }) {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Catégories de Services</h2>
          <p className="mt-3 text-muted-foreground">Explorez nos catégories populaires</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat, i) => {
            const IconComp = ICON_MAP[cat.icon] || Wrench;
            const gradient = GRADIENT_COLORS[i % GRADIENT_COLORS.length];

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={createPageUrl("Search") + `?category=${cat.id}`}
                  className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-border/50 hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComp className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground text-center">{cat.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
