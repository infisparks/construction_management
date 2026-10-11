'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  X, 
  HelpCircle, 
  Sparkles, 
  Lightbulb, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { CONSTRUCTION_MANUAL, ManualEntry } from '@/lib/construction-planning/construction-manual';

export const SoftwareManualSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ManualEntry | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter entries based on user input
  const filteredEntries = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Default top suggestions when focused with no query
      return CONSTRUCTION_MANUAL.slice(0, 6);
    }
    return CONSTRUCTION_MANUAL.filter(item => {
      return (
        item.term.toLowerCase().includes(trimmed) ||
        item.shortBadge.toLowerCase().includes(trimmed) ||
        item.keywords.some(k => k.toLowerCase().includes(trimmed)) ||
        item.shortDefinition.toLowerCase().includes(trimmed) ||
        item.category.toLowerCase().includes(trimmed)
      );
    });
  }, [query]);

  // Handle opening modal on selection
  const handleSelect = (entry: ManualEntry) => {
    setSelectedEntry(entry);
    setIsOpen(false);
  };

  return (
    <>
      {/* Search Bar in Header */}
      <div ref={searchContainerRef} className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search terms, WBS codes, help..."
            className="w-full pl-9 pr-9 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs font-medium"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-2.5 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1 rounded">
                Manual
              </span>
            </div>
          )}
        </div>

        {/* Dropdown Suggestions List */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Header / Guide */}
            <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>{query ? `Results for "${query}"` : 'Construction Manual & Guide'}</span>
              </div>
              <span className="text-[10px] text-slate-400">{filteredEntries.length} topics</span>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/70 transition-colors flex items-start gap-3 group"
                  >
                    <span className="shrink-0 mt-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-800 border border-slate-200 transition-colors">
                      {item.shortBadge}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                          {item.term}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 px-1 rounded bg-slate-50 border border-slate-200 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 group-hover:text-slate-600">
                        {item.shortDefinition}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <HelpCircle className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">No matching construction terms found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try searching for PKG, Pre/Suc, Float, Critical Path, or BOQ.</p>
                </div>
              )}
            </div>

            {/* Quick Keyword Pills footer */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-400 font-medium">Quick terms:</span>
              {['PKG', 'Pre / Suc', 'Forecast Finish', 'Float', 'Critical Path'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    const match = CONSTRUCTION_MANUAL.find(m => m.term.toLowerCase().includes(tag.toLowerCase()) || m.keywords.includes(tag.toLowerCase()));
                    if (match) handleSelect(match);
                  }}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-700 transition-colors font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Detail Modal Popup */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold font-mono text-xs shadow-2xs">
                  {selectedEntry.shortBadge}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedEntry.term}
                    </h2>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      {selectedEntry.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEntry.shortDefinition}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              
              {/* 1. Simple Plain English Explanation */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1.5 text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>In Very Simple Words</span>
                </div>
                <p className="text-slate-800 leading-relaxed font-normal whitespace-pre-line text-xs sm:text-sm">
                  {selectedEntry.simpleExplanation}
                </p>
              </div>

              {/* 2. Real Construction Site Example */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1.5 text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real Construction Site Example</span>
                </div>
                <p className="text-emerald-900 leading-relaxed text-xs sm:text-sm font-medium whitespace-pre-line">
                  {selectedEntry.siteExample}
                </p>
              </div>

              {/* 3. How this Software Calculates & Handles It */}
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-2.5 text-xs uppercase tracking-wide">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>How This Software Calculates It</span>
                </div>
                <ul className="space-y-2 bg-white rounded-xl border border-slate-200 p-3.5 divide-y divide-slate-100">
                  {selectedEntry.howSoftwareWorks.map((step, idx) => (
                    <li key={idx} className={`flex items-start gap-2.5 text-xs text-slate-700 ${idx > 0 ? 'pt-2' : ''}`}>
                      <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Pro Site Tip */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900 block text-xs">Site Engineer Pro Tip</span>
                  <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                    {selectedEntry.proTip}
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer with Related Terms */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Browse other terms:</span>
                <div className="flex items-center gap-1">
                  {CONSTRUCTION_MANUAL.filter(m => m.id !== selectedEntry.id).slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEntry(item)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 font-medium text-[11px] transition-colors"
                    >
                      {item.shortBadge}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
