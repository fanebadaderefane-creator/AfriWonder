import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Flame, Clock } from 'lucide-react';

export default function FlashSaleCard({ flashSale }) {
  const [timeLeft, setTimeLeft] = useState({});
  const [_progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(flashSale.end_date);
      const diff = end - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft({ expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes });

      // Calculer la progression
      const start = new Date(flashSale.start_date);
      const totalDuration = end - start;
      const elapsed = now - start;
      setProgress(Math.min(100, (elapsed / totalDuration) * 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [flashSale.end_date, flashSale.start_date]);

  const totalAvailable = flashSale.products.reduce((sum, p) => sum + p.quantity_available, 0);
  const totalSold = flashSale.products.reduce((sum, p) => sum + p.quantity_sold, 0);
  const soldPercentage = totalAvailable > 0 ? (totalSold / totalAvailable) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600">
          {flashSale.banner_image && (
            <img
              src={flashSale.banner_image}
              alt={flashSale.title}
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-_t from-black/40 to-transparent" />
          
          <Badge className="absolute top-3 left-3 bg-red-600 text-white">
            <Flame className="w-3 h-3 mr-1" />
            Flash Sale
          </Badge>

          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-bold text-lg">{flashSale.title}</h3>
            <p className="text-sm opacity-90">{flashSale.discount_value}% OFF</p>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <Clock className="w-4 h-4" />
            {timeLeft.expired ? (
              <span className="text-red-600">Expirée</span>
            ) : (
              <span>
                {timeLeft.days}j {timeLeft.hours}h {timeLeft.minutes}m
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-1">Produits vendus</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${soldPercentage}%` }}
                transition={{ duration: 1 }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">{totalSold} / {totalAvailable} vendus</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {flashSale.products.slice(0, 2).map((product, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded">
                <p className="font-semibold truncate">{product.product_id}</p>
                <p className="text-blue-600 font-bold">{product.sale_price.toLocaleString()} XOF</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}