import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from 'lucide-react';

export default function AdvancedFilters({ isOpen, onClose, filters, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const categories = [
    'mode', 'beaute', 'electronique', 'maison', 
    'alimentation', 'artisanat', 'services', 'autre'
  ];

  const deliveryOptions = [
    { value: 'livraison_moto', label: '🏍️ Livraison moto' },
    { value: 'point_relais', label: '📍 Point relais' },
    { value: 'retrait_boutique', label: '🏪 Retrait en boutique' },
    { value: 'envoi_national', label: '📦 Envoi national' }
  ];

  const conditions = [
    { value: 'new', label: 'Neuf' },
    { value: 'like_new', label: 'Comme neuf' },
    { value: 'used', label: 'Occasion' }
  ];

  const maliRegions = [
    'Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Koulikoro', 'Gao', 'Tombouctou'
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Filtres avancés</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-3">Catégories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge
                  key={cat}
                  onClick={() => {
                    const cats = localFilters.categories || [];
                    setLocalFilters({
                      ...localFilters,
                      categories: cats.includes(cat)
                        ? cats.filter(c => c !== cat)
                        : [...cats, cat]
                    });
                  }}
                  className={`cursor-pointer ${
                    (localFilters.categories || []).includes(cat)
                      ? 'bg-orange-500'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold mb-3">Prix (FCFA)</h3>
            <div className="px-2">
              <Slider
                min={0}
                max={1000000}
                step={1000}
                value={localFilters.priceRange || [0, 1000000]}
                onValueChange={(value) => setLocalFilters({ ...localFilters, priceRange: value })}
              />
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>{(localFilters.priceRange?.[0] || 0).toLocaleString()}</span>
                <span>{(localFilters.priceRange?.[1] || 1000000).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="font-semibold mb-3">Note minimum</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => setLocalFilters({ ...localFilters, minRating: rating })}
                  className={`w-full flex items-center gap-2 p-2 rounded ${
                    localFilters.minRating === rating ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex">
                    {[...Array(rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm">et plus</span>
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3 className="font-semibold mb-3">État</h3>
            <div className="space-y-2">
              {conditions.map(cond => (
                <div key={cond.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={cond.value}
                    checked={(localFilters.conditions || []).includes(cond.value)}
                    onCheckedChange={(checked) => {
                      const conds = localFilters.conditions || [];
                      setLocalFilters({
                        ...localFilters,
                        conditions: checked
                          ? [...conds, cond.value]
                          : conds.filter(c => c !== cond.value)
                      });
                    }}
                  />
                  <Label htmlFor={cond.value} className="text-sm cursor-pointer">
                    {cond.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Options */}
          <div>
            <h3 className="font-semibold mb-3">Options de livraison</h3>
            <div className="space-y-2">
              {deliveryOptions.map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={opt.value}
                    checked={(localFilters.deliveryOptions || []).includes(opt.value)}
                    onCheckedChange={(checked) => {
                      const opts = localFilters.deliveryOptions || [];
                      setLocalFilters({
                        ...localFilters,
                        deliveryOptions: checked
                          ? [...opts, opt.value]
                          : opts.filter(o => o !== opt.value)
                      });
                    }}
                  />
                  <Label htmlFor={opt.value} className="text-sm cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Région Mali (CDC) */}
          <div>
            <h3 className="font-semibold mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              Région (Mali)
            </h3>
            <div className="flex flex-wrap gap-2">
              {maliRegions.map(region => (
                <Badge
                  key={region}
                  onClick={() => {
                    const regions = localFilters.regions || [];
                    setLocalFilters({
                      ...localFilters,
                      regions: regions.includes(region)
                        ? regions.filter(r => r !== region)
                        : [...regions, region]
                    });
                  }}
                  className={`cursor-pointer ${
                    (localFilters.regions || []).includes(region)
                      ? 'bg-orange-500'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div>
            <h3 className="font-semibold mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              Distance max (km)
            </h3>
            <Slider
              min={1}
              max={100}
              step={1}
              value={[localFilters.maxDistance || 100]}
              onValueChange={(value) => setLocalFilters({ ...localFilters, maxDistance: value[0] })}
            />
            <p className="text-sm text-gray-600 mt-2">{localFilters.maxDistance || 100} km</p>
          </div>

          {/* Brand */}
          <div>
            <h3 className="font-semibold mb-3">Marques populaires</h3>
            <div className="flex flex-wrap gap-2">
              {['Samsung', 'Apple', 'Nike', 'Adidas', 'Sony'].map(brand => (
                <Badge
                  key={brand}
                  onClick={() => {
                    const brands = localFilters.brands || [];
                    setLocalFilters({
                      ...localFilters,
                      brands: brands.includes(brand)
                        ? brands.filter(b => b !== brand)
                        : [...brands, brand]
                    });
                  }}
                  className={`cursor-pointer ${
                    (localFilters.brands || []).includes(brand)
                      ? 'bg-orange-500'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {brand}
                </Badge>
              ))}
            </div>
          </div>

          {/* Verified Sellers */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={localFilters.verifiedOnly || false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, verifiedOnly: checked })}
            />
            <Label htmlFor="verified" className="text-sm cursor-pointer">
              Vendeurs vérifiés uniquement
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setLocalFilters({});
                onApply({});
                onClose();
              }}
              className="flex-1"
            >
              Réinitialiser
            </Button>
            <Button
              onClick={() => {
                onApply(localFilters);
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
            >
              Appliquer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}