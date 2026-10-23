'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  FileText,
  SlidersHorizontal,
  Info,
  RotateCcw,
  ArchiveRestore
} from 'lucide-react';
import {
  ProfileProduct,
  fetchProfileProducts,
  fetchDeletedProfileProducts,
  createProfileProduct,
  updateProfileProduct,
  deleteProfileProduct,
  restoreProfileProduct,
} from '@/lib/supabase/profile-services';

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
  'Site Fuel & Machinery',
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
  'Sets',
];

interface ProductProfileViewProps {
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProductProfileView: React.FC<ProductProfileViewProps> = ({
  showToast,
}) => {
  const [products, setProducts] = useState<ProfileProduct[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<ProfileProduct[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'bin'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBin, setIsLoadingBin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProfileProduct | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNITS[0]);
  const [customUnit, setCustomUnit] = useState('');
  const [brand, setBrand] = useState('');
  const [storageLocation, setStorageLocation] = useState('Central Site Store #1');
  const [minimumAlertStock, setMinimumAlertStock] = useState<number | ''>(20);
  const [hsnCode, setHsnCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load from Supabase profile_product table
  const loadProducts = async () => {
    setIsLoading(true);
    const data = await fetchProfileProducts();
    setProducts(data);
    setIsLoading(false);
  };

  const loadDeletedProducts = async () => {
    setIsLoadingBin(true);
    const data = await fetchDeletedProfileProducts();
    setDeletedProducts(data);
    setIsLoadingBin(false);
  };

  useEffect(() => {
    loadProducts();
    loadDeletedProducts();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.storage_location && p.storage_location.toLowerCase().includes(q));

      const matchesCat =
        categoryFilter === 'all' || p.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, categoryFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(`MAT-${Math.floor(100 + Math.random() * 900)}`);
    setCategory(DEFAULT_CATEGORIES[0]);
    setCustomCategory('');
    setUnit(DEFAULT_UNITS[0]);
    setCustomUnit('');
    setBrand('');
    setStorageLocation('Central Site Store #1');
    setMinimumAlertStock(20);
    setHsnCode('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ProfileProduct) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    if (DEFAULT_CATEGORIES.includes(p.category)) {
      setCategory(p.category);
      setCustomCategory('');
    } else {
      setCategory('__custom__');
      setCustomCategory(p.category);
    }
    if (DEFAULT_UNITS.includes(p.unit)) {
      setUnit(p.unit);
      setCustomUnit('');
    } else {
      setUnit('__custom__');
      setCustomUnit(p.unit);
    }
    setBrand(p.brand || '');
    setStorageLocation(p.storage_location || '');
    setMinimumAlertStock(p.minimum_alert_stock ?? 0);
    setHsnCode(p.hsn_code || '');
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const finalCategory =
      category === '__custom__' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const finalUnit =
      unit === '__custom__' && customUnit.trim() ? customUnit.trim() : unit;

    const payload = {
      name: name.trim(),
      code: code.trim() || `MAT-${Math.floor(100 + Math.random() * 900)}`,
      category: finalCategory,
      unit: finalUnit,
      brand: brand.trim() || undefined,
      storage_location: storageLocation.trim() || undefined,
      minimum_alert_stock:
        typeof minimumAlertStock === 'number' ? minimumAlertStock : 0,
      hsn_code: hsnCode.trim() || undefined,
      description: description.trim() || undefined,
    };

    if (editingProduct) {
      const { data, error } = await updateProfileProduct(editingProduct.id, payload);
      if (!error && data) {
        setProducts((prev) =>
          prev.map((item) => (item.id === editingProduct.id ? data : item))
        );
        showToast?.('Product profile updated successfully!', 'success');
      } else {
        showToast?.('Failed to update product profile', 'error');
      }
    } else {
      const { data, error } = await createProfileProduct(payload);
      if (!error && data) {
        setProducts((prev) => [data, ...prev]);
        showToast?.('Product profile created successfully in Supabase!', 'success');
      } else {
        showToast?.('Failed to create product profile', 'error');
      }
    }

    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? It will be moved to the Recycle Bin and can be restored anytime.`)) {
      return;
    }
    const { error } = await deleteProfileProduct(id);
    if (!error) {
      showToast?.(`Product "${productName}" moved to Recycle Bin.`, 'info');
      await Promise.all([loadProducts(), loadDeletedProducts()]);
    } else {
      showToast?.('Failed to delete product profile', 'error');
    }
  };

  const handleRestore = async (id: string, productName: string) => {
    const { error } = await restoreProfileProduct(id);
    if (!error) {
      showToast?.(`Product "${productName}" restored to Active Catalog!`, 'success');
      await Promise.all([loadProducts(), loadDeletedProducts()]);
    } else {
      showToast?.('Failed to restore product profile', 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Header Card (Compact & Professional) */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Package className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Products Master Directory
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filteredProducts.length} Products
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Item codes, categories, units, and storage specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadProducts}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
              title="Refresh from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* View Mode Toggle: Active Products vs Recycle Bin */}
        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'active'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Active Catalog ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('bin');
              loadDeletedProducts();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'bin'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin ({deletedProducts.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {viewMode === 'active' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search product profile by name, code, brand, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-colors"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-purple-600"
            >
              <option value="all">All Categories</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Stock & Alerts KPI Strip - only on active mode */}
      {viewMode === 'active' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Profiles</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{products.length}</span>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                profile_product
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Configured material profiles</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Current Stock Units</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">
                {products.reduce((acc, p) => acc + (Number(p.current_stock) || 0), 0).toLocaleString()}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Indexed Direct
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Live balance across all profiles</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Low Stock Alerts</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-700">
                {products.filter((p) => (Number(p.current_stock) || 0) <= (Number(p.minimum_alert_stock) || 0)).length}
              </span>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Reorder Needed
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Items at or below alert buffer</span>
          </div>
        </div>
      )}

      {/* 2. Main Content: Active Catalog OR Recycle Bin */}
      {viewMode === 'active' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Code & Material Profile</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Brand / Manufacturer</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Alert Buffer</th>
                  <th className="py-3 px-4">HSN Code</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      <p className="font-semibold text-slate-600">Loading product profiles from Supabase...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No product profiles found</p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold hover:bg-purple-100 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add your first product profile</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-mono font-bold text-xs shrink-0">
                            {p.category ? p.category[0] : 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {p.name}
                            </div>
                            <div className="text-[11px] font-mono text-purple-600 font-medium">
                              {p.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[11px]">
                          {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.brand ? (
                          <span className="font-medium text-slate-800">{p.brand}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.storage_location ? (
                          <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.storage_location}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                          (Number(p.current_stock) || 0) <= (Number(p.minimum_alert_stock) || 0)
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {(Number(p.current_stock) || 0) <= (Number(p.minimum_alert_stock) || 0) && (
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                          {Number(p.current_stock) || 0} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-slate-700">
                          {p.minimum_alert_stock ?? 0} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {p.hsn_code || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                            title="Edit profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Recycle Bin View */
        <div className="space-y-3">
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold text-rose-900">Recycle Bin (Soft Deleted Products)</span>
                <p className="text-[11px] text-rose-700">
                  Products in the bin have <code className="font-mono bg-rose-100/80 px-1 py-0.5 rounded text-rose-800">is_deleted = true</code> in Supabase. They are hidden from active inventory movements but can be restored anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDeletedProducts}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingBin ? 'animate-spin' : ''}`} />
              <span>Refresh Bin</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Code & Material Profile</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Brand / Manufacturer</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBin ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <p className="font-semibold text-slate-600">Loading deleted products from Recycle Bin...</p>
                      </td>
                    </tr>
                  ) : deletedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">Recycle Bin is empty</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No products have been deleted.</p>
                      </td>
                    </tr>
                  ) : (
                    deletedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-mono font-bold text-xs shrink-0">
                              {p.category ? p.category[0] : 'P'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {p.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 font-medium">
                                {p.code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                            {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.brand ? (
                            <span className="font-medium text-slate-800">{p.brand}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {p.storage_location ? (
                            <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{p.storage_location}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            Deleted (In Bin)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRestore(p.id, p.name)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Restore product to active catalog"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            <span>Restore Product</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Product Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Package className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingProduct ? 'Edit Product Profile' : 'New Product Profile'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Table: profile_product (Profile details only, no financial amounts)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Product Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product / Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraTech 53 Grade PPC Cement"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MAT-101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-purple-700 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Category</option>
                  </select>
                  {category === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Enter new category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full h-9 px-3 rounded-lg border border-purple-200 bg-purple-50/30 text-xs text-purple-900"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Unit of Measure <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Unit</option>
                  </select>
                  {unit === '__custom__' && (
                    <input
                      type="text"
                      placeholder="e.g. Drums / Tonnes"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="mt-2 w-full h-9 px-3 rounded-lg border border-purple-200 bg-purple-50/30 text-xs text-purple-900"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Brand & Storage Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata Steel, Astral"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Storage Yard / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Godown A - Shed 2, Open Rebar Yard"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Minimum Alert Stock & HSN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Alert Stock Buffer
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minimumAlertStock}
                    onChange={(e) =>
                      setMinimumAlertStock(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="e.g. 20"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Alert threshold when store inventory drops below this quantity
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 252329"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technical Specifications / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Material grade, IS code specifications, testing requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Notice: Only profile data is stored in <code className="text-purple-700 font-bold">profile_product</code>. Rate, purchase history, and amounts are managed in billing registers.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{editingProduct ? 'Update Profile' : 'Save Profile'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
