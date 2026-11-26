'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Trash2, Plus, Loader2, RefreshCw } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  isAction?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  allowClear?: boolean;
  required?: boolean;
  onDeleteOption?: (value: string) => void;
  onCreateOption?: (newLabel: string) => void;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onRetry?: () => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No matching options found',
  disabled = false,
  className = '',
  triggerClassName = '',
  id,
  allowClear = false,
  required = false,
  onDeleteOption,
  onCreateOption,
  loading = false,
  loadingMessage = 'Loading...',
  error = null,
  onRetry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((opt) => {
      if (opt.isAction) return true; // Always keep action options visible
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subtitle ? opt.subtitle.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, query]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full text-xs ${className}`}>
      {/* Hidden input if required for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          required={required}
          className="absolute opacity-0 pointer-events-none w-0 h-0 -bottom-1"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 rounded-lg border bg-white flex items-center justify-between gap-2 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-purple-600 ring-1 ring-purple-600'
            : 'border-slate-200 hover:border-slate-300'
        } ${triggerClassName}`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-semibold text-slate-900">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    selectedOption.badgeColor || 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin shrink-0" />
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-purple-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu with Search */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-full min-w-[260px] max-w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-98 duration-100">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = query.trim();
                    const exactMatch = options.find(
                      (o) => !o.isAction && o.label.toLowerCase() === trimmed.toLowerCase()
                    );
                    if (exactMatch) {
                      handleSelect(exactMatch.value);
                    } else if (onCreateOption && trimmed) {
                      onCreateOption(trimmed);
                      setIsOpen(false);
                    } else if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0].value);
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-7 bg-white rounded-md border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options Scrollable List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {loading && (
              <div className="px-2.5 py-2.5 flex items-center gap-2 text-xs text-purple-700 bg-purple-50/70 rounded-lg mb-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-purple-600" />
                <span className="font-medium">{loadingMessage}</span>
              </div>
            )}

            {!loading && error && (
              <div className="px-2.5 py-2 flex items-center justify-between gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg mb-1">
                <span className="truncate">{error}</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Quick Add New from Search Input if not exists */}
            {onCreateOption && query.trim() && !options.some((o) => !o.isAction && o.label.toLowerCase() === query.trim().toLowerCase()) && (
              <div className="p-1 pb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onCreateOption(query.trim());
                    setIsOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left transition-colors cursor-pointer text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold border border-dashed border-purple-300"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate text-xs">Add & Save &ldquo;{query.trim()}&rdquo;</span>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 shrink-0">
                    Press Enter
                  </span>
                </button>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                if (opt.isAction) {
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className="w-full px-2.5 py-2.5 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer text-purple-700 bg-purple-50/60 hover:bg-purple-100/80 font-bold border-t border-purple-100"
                    >
                      <span className="text-xs truncate">{opt.label}</span>
                    </button>
                  );
                }

                return (
                  <div
                    key={opt.value}
                    className={`group/opt w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-purple-50 text-purple-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              opt.badgeColor || 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                          {opt.subtitle}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      )}
                      {onDeleteOption && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteOption(opt.value);
                          }}
                          title={`Delete "${opt.label}"`}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
