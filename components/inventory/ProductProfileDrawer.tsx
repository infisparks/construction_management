'use client';

import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Scale,
  MapPin,
  Tag,
  Sparkles,
  FileText
} from 'lucide-react';
import { ConstructionMaterial } from '@/lib/inventory/inventory-types';
import {
  fetchDropdownCategory,
  addCustomCategory,
} from '@/lib/supabase/category-services';

interface ProductProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: ConstructionMaterial) => void;
  existingCategories?: string[];
  existingStorageLocations?: string[];
  onAddStorageLocation?: (location: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Cement & Binders',
  'Steel & Rebar',
  'Aggregates & Sand',
  'Blocks & Masonry',
  'Concrete & RMC',
  'Formwork & Shuttering',
  'Chemicals & Waterproofing',
  'Plumbing & Drainage',
  'Electrical & Conduits',
  'Safety PPE',
  'Site Fuel & Machinery'
];

const DEFAULT_UNITS = [
  'Bags',
  'MT',
  'Kg',
  'Cu.Ft',
  'Cu.M',
  'Nos',
  'Sheets',
  'Liters',
  'Meters',
  'Coils',
  'Sets'
];

const BASE_STORAGE_LOCATIONS = [
  'Central Site Store #1',
  'Cement Godown Shed #2',
  'Steel Rebar Yard Bay #4',
  'Open Stacking Yard #3',
];

export const ProductProfileDrawer: React.FC<ProductProfileDrawerProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
  existingCategories = DEFAULT_CATEGORIES,
  existingStorageLocations = [],
  onAddStorageLocation,
}) => {
  // Storage Locations combined
  const allLocations = Array.from(new Set([...BASE_STORAGE_LOCATIONS, ...existingStorageLocations]));

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNITS[0]);
  const [customUnit, setCustomUnit] = useState('');
  const [minimumAlertStock, setMinimumAlertStock] = useState<number | ''>(20);
  const [storageLocation, setStorageLocation] = useState(allLocations[0] || 'Central Site Store #1');
  const [customStorageLocation, setCustomStorageLocation] = useState('');
  const [isCustomStorage, setIsCustomStorage] = useState(false);
  const [brand, setBrand] = useState('');
  const [gstRate, setGstRate] = useState<0 | 5 | 12 | 18 | 28>(0); // Default GST is 0%
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCategories, setDbCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  React.useEffect(() => {
    if (isOpen) {
      fetchDropdownCategory('material_category', DEFAULT_CATEGORIES).then((cats) => {
        if (cats && cats.length > 0) {
          setDbCategories(cats);
        }
      });
    }
  }, [isOpen]);

  // All categories combined
  const categoryOptions = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories, ...existingCategories]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const finalCategory = category === '__custom__' && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    if (category === '__custom__' && customCategory.trim()) {
      addCustomCategory('material_category', customCategory.trim(), categoryOptions);
    }

    const finalUnit = unit === '__custom__' && customUnit.trim()
      ? customUnit.trim()
      : unit;

    const finalStorage = isCustomStorage && customStorageLocation.trim()
      ? customStorageLocation.trim()
      : (storageLocation.trim() || 'Central Site Store #1');

    if (isCustomStorage && customStorageLocation.trim() && onAddStorageLocation) {
      onAddStorageLocation(customStorageLocation.trim());
    }

    const newCode = `MAT-${Math.floor(100 + Math.random() * 900)}`;

    const newProduct: ConstructionMaterial = {
      id: `mat-${Date.now()}`,
      code: newCode,
      name: name.trim(),
      description: description.trim() || undefined,
      category: finalCategory as any,
      unit: finalUnit as any,
      minimumAlertStock: typeof minimumAlertStock === 'number' ? minimumAlertStock : 10,
      currentStock: 0,
      averageUnitRate: 0,
      gstRate,
      storageLocation: finalStorage,
      brand: brand.trim() || undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    onSaveProduct(newProduct);
    setIsSubmitting(false);

    // Reset Form
    setName('');
    setDescription('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setCustomCategory('');
    setUnit(DEFAULT_UNITS[0]);
    setCustomUnit('');
    setMinimumAlertStock(20);
    setStorageLocation(allLocations[0] || 'Central Site Store #1');
    setCustomStorageLocation('');
    setIsCustomStorage(false);
    setBrand('');
    setGstRate(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Create Product Profile
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  New SKU
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Define material specifications, category, unit, and minimum stock threshold. Stock & unit rate are logged on purchase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Section 1: Basic Specifications */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Basic Information</span>
            </div>

            {/* Product Name (Compulsory) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Product / Material Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UltraTech Super Cement PPC (50kg)"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>

            {/* Product Description */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Product Description & Technical Specifications
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. High quality Portland Pozzolana Cement conforming to IS 1489 Part 1 for structural slab & RCC work."
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 resize-none"
              />
            </div>

            {/* Category & Unit (2-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Category...</option>
                </select>
                {category === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="w-full h-9 px-3 mt-1.5 rounded-lg border border-purple-300 bg-purple-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Standard Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                >
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Unit...</option>
                </select>
                {unit === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="e.g. Boxes, Barrels"
                    className="w-full h-9 px-3 mt-1.5 rounded-lg border border-purple-300 bg-purple-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600"
                  />
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Stock Control & Storage */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Stock Control & Storage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Minimum Stock Alert */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Min Stock Alert <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={minimumAlertStock}
                  onChange={(e) => setMinimumAlertStock(e.target.value === '' ? '' : Number(e.target.value))}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="20"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Alert threshold for reordering</span>
              </div>

              {/* Applicable GST Rate */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Default GST Rate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value) as any)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                >
                  <option value={0}>0% GST (Default / Exempt)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST (Standard)</option>
                  <option value={28}>28% GST (Cement / Heavy)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default is 0% • Editable during purchase</span>
              </div>
            </div>

            {/* Storage Location & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Storage Location / Shed <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={isCustomStorage ? '__custom__' : storageLocation}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomStorage(true);
                        setCustomStorageLocation('');
                      } else {
                        setIsCustomStorage(false);
                        setStorageLocation(e.target.value);
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  >
                    {allLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter New Storage Location...</option>
                  </select>

                  {isCustomStorage && (
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customStorageLocation}
                        onChange={(e) => setCustomStorageLocation(e.target.value)}
                        placeholder="Type new location (e.g. Godown Shed #3)"
                        className="w-full h-10 pl-8 pr-3 rounded-lg border border-purple-300 bg-purple-50/40 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-medium"
                      />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Created once, automatically appears in list from second time
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Brand / Manufacturer
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. UltraTech / Tata Tiscon"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* Purchase Note */}
            <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
              <span>Unit rate and stock count will be entered when materials are purchased (Inward GRN).</span>
            </div>
          </div>

          {/* Quick Summary Preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
            <div>
              <span className="font-bold text-slate-900">Live SKU Preview:</span>
              <p className="text-slate-600 mt-0.5">
                {name || 'New Material Name'} • {category} • Alert below {minimumAlertStock || 0} {unit}
              </p>
            </div>
            <span className="font-semibold text-purple-700 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs">
              Rate set on purchase
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Save Product Profile</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
