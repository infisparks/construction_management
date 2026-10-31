'use client';

import React from 'react';
import { 
  Building2,
  Clock, 
  Calendar, 
  CalendarClock, 
  TrendingUp, 
  HardHat 
} from 'lucide-react';
import { ProjectInfo } from '@/lib/construction-planning/types';

export type SummaryFilterType = 'all' | 'completed' | 'in_progress' | 'not_started' | 'delayed' | 'critical';

interface ProjectSummaryCardsProps {
  metrics: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    delayed: number;
    atRisk: number;
    blocked: number;
    critical: number;
    overallProgress: number;
  };
  project?: Partial<ProjectInfo>;
  plannedCompletionDate?: string;
  forecastCompletionDate?: string;
  activeFilter: SummaryFilterType;
  onFilterChange: (filter: SummaryFilterType) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && month >= 0 && month < 12 && !isNaN(day)) {
        return `${day} ${MONTH_NAMES[month]} ${year}`;
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function calculateDurationDays(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '8 Days';
  try {
    const p1 = startDate.split('-').map(Number);
    const p2 = endDate.split('-').map(Number);
    if (p1.length === 3 && p2.length === 3) {
      const d1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
      const d2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
      const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} Days` : '8 Days';
    }
  } catch {
    // fallback
  }
  return '8 Days';
}

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  metrics,
  project,
  plannedCompletionDate,
  forecastCompletionDate,
  activeFilter,
  onFilterChange,
}) => {
  // Resolve dates & contractor info with sensible dynamic fallbacks
  const startDate = project?.plannedStartDate || '2026-07-01';
  const endDate = project?.plannedCompletionDate || plannedCompletionDate || '2026-07-09';
  const forecastDate = project?.forecastCompletionDate || forecastCompletionDate || '2026-11-07';
  const durationText = calculateDurationDays(startDate, endDate);
  const scheduleText = `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;
  const forecastText = formatDisplayDate(forecastDate);
  const varianceDays = project?.varianceDays !== undefined ? project.varianceDays : 12;
  const progressVal = metrics.overallProgress || project?.overallProgress || 67;
  const gcName = project?.generalContractor || 'Er. Shakir Sunsra ()';

  const cards = [
    {
      id: 'all' as SummaryFilterType,
      label: 'TOTAL ACTIVITIES',
      value: metrics.total,
      subtext: 'Across all work packages',
      imageSrc: '/timeline/Glossy Purple Clipboard Checklist Icon.png',
      bgGradient: 'bg-gradient-to-br from-[#faf7ff] via-[#f3eeff] to-[#ebe0ff]',
      borderColor: 'border-[#ddd3fe]',
      waveColor: '#c4b5fd',
      activeStyles: 'border-[#6e46f2] ring-2 ring-[#6e46f2]/30 shadow-md',
      inactiveStyles: 'hover:border-purple-300 hover:shadow-md',
      accentGradient: 'from-[#6e46f2] to-[#8b5cf6]',
      badge: { text: 'WBS Scope', color: 'bg-purple-100 text-[#6e46f2] border border-purple-200/90' },
    },
    {
      id: 'completed' as SummaryFilterType,
      label: 'COMPLETED TASKS',
      value: metrics.completed,
      subtext: `${Math.round((metrics.completed / (metrics.total || 1)) * 100)}% of scope done`,
      imageSrc: '/timeline/Glossy Green Check Mark Icon.png',
      bgGradient: 'bg-gradient-to-br from-[#f0fdf5] via-[#e6f9ee] to-[#d2f7e2]',
      borderColor: 'border-[#baf2cf]',
      waveColor: '#86efac',
      activeStyles: 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md',
      inactiveStyles: 'hover:border-emerald-300 hover:shadow-md',
      accentGradient: 'from-emerald-600 to-teal-600',
      badge: { text: 'Verified', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200/90' },
    },
    {
      id: 'not_started' as SummaryFilterType,
      label: 'NOT STARTED',
      value: metrics.notStarted,
      subtext: 'Upcoming work packages',
      imageSrc: '/timeline/Glossy Blue 3D Play Button.png',
      bgGradient: 'bg-gradient-to-br from-[#f2f8ff] via-[#e8f2ff] to-[#d9ebfe]',
      borderColor: 'border-[#bedbfe]',
      waveColor: '#93c5fd',
      activeStyles: 'border-blue-600 ring-2 ring-blue-500/30 shadow-md',
      inactiveStyles: 'hover:border-blue-300 hover:shadow-md',
      accentGradient: 'from-blue-600 to-sky-600',
      badge: { text: 'Queued', color: 'bg-blue-100 text-blue-800 border border-blue-200/90' },
    },
    {
      id: 'delayed' as SummaryFilterType,
      label: 'DELAYED ACTIVITIES',
      value: metrics.delayed,
      subtext: metrics.delayed > 0 ? `${metrics.delayed} tasks behind` : 'On track & on schedule',
      imageSrc: '/timeline/Glossy Pink Warning Triangle Icon.png',
      bgGradient: 'bg-gradient-to-br from-[#fff8f6] via-[#fff0ed] to-[#ffe2dc]',
      borderColor: 'border-[#fecaca]',
      waveColor: '#fca5a5',
      activeStyles: 'border-rose-600 ring-2 ring-rose-500/30 shadow-md',
      inactiveStyles: 'hover:border-rose-300 hover:shadow-md',
      accentGradient: 'from-rose-600 to-red-600',
      badge: metrics.delayed > 0 
        ? { text: 'Action Req.', color: 'bg-rose-100 text-rose-800 border border-rose-200/90 font-bold' }
        : { text: 'Healthy', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200/90' },
    },
    {
      id: 'critical' as SummaryFilterType,
      label: 'CRITICAL PATH CHAIN',
      value: metrics.critical,
      subtext: 'Zero float CPM chain',
      imageSrc: '/timeline/Glossy Golden Linked Chain Icon.png',
      bgGradient: 'bg-gradient-to-br from-[#fffdf5] via-[#fff5ea] to-[#ffe5d0]',
      borderColor: 'border-[#fed7aa]',
      waveColor: '#fdba74',
      activeStyles: 'border-amber-600 ring-2 ring-amber-500/30 shadow-md',
      inactiveStyles: 'hover:border-amber-300 hover:shadow-md',
      accentGradient: 'from-amber-600 to-orange-600',
      badge: { text: 'P0 Float', color: 'bg-amber-100 text-amber-800 border border-amber-200/90' },
    },
    {
      id: null,
      label: 'OVERALL PROGRESS',
      value: `${metrics.overallProgress}%`,
      subtext: 'Aggregate project progress',
      imageSrc: '/timeline/Glossy Purple Target with Blue Dart.png',
      bgGradient: 'bg-gradient-to-br from-[#faf7ff] via-[#f3eeff] to-[#ebe0ff]',
      borderColor: 'border-[#ddd3fe]',
      waveColor: '#c4b5fd',
      activeStyles: 'border-[#6e46f2] ring-2 ring-[#6e46f2]/30 shadow-md',
      inactiveStyles: 'hover:border-purple-300 hover:shadow-md',
      accentGradient: 'from-[#6e46f2] to-[#8b5cf6]',
      badge: { text: 'Target 50%', color: 'bg-purple-100 text-[#6e46f2] border border-purple-200/90' },
      isProgressBar: true,
    },
  ];

  return (
    <div className="w-full space-y-3.5 sm:space-y-4">
      {/* 1. Executive Timeline & Work Management Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden p-4 sm:p-5 lg:p-6 transition-all">
        {/* Soft Decorative Ambient Gradients & Aurora Wave Lines */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-200/15 rounded-full blur-2xl pointer-events-none" />
        
        {/* Abstract Smooth Wavy Ribbons in background */}
        <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-25 overflow-hidden">
          <svg viewBox="0 0 800 300" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,150 C200,80 350,220 500,120 C650,20 750,180 850,100 L850,300 L0,300 Z"
              fill="url(#purpleRibbon)"
            />
            <defs>
              <linearGradient id="purpleRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.35" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5">
          {/* Left Column: Title & Info Ribbon */}
          <div className="flex-1 min-w-0 space-y-3 sm:space-y-3.5">
            {/* Header: Blueprint/Building Icon + Heading */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-50 text-[#6e46f2] border border-purple-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  Project <span className="bg-gradient-to-r from-[#6e46f2] to-[#592be8] bg-clip-text text-transparent">Timeline</span> & Work Management
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed truncate">
                  Plan, track and manage construction activities, progress, and project timelines in one place.
                </p>
              </div>
            </div>

            {/* Bottom Info Ribbon with 5 Modern Pill Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
              {/* Duration */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 shadow-2xs transition-colors">
                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Duration: <strong className="text-slate-900 font-bold">{durationText}</strong></span>
              </div>

              {/* Schedule */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 shadow-2xs transition-colors">
                <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Schedule: <strong className="text-slate-900 font-bold">{scheduleText}</strong></span>
              </div>

              {/* Forecast */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 shadow-2xs transition-colors">
                <CalendarClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Forecast: <strong className="text-slate-900 font-bold">{forecastText}</strong></span>
                {varianceDays > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200/80">
                    +{varianceDays}d delay
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200/80">
                    On track
                  </span>
                )}
              </div>

              {/* Progress */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 shadow-2xs transition-colors">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Progress: <strong className="text-purple-700 font-bold">{progressVal}%</strong></span>
                <div className="w-14 sm:w-18 h-2 bg-purple-100 rounded-full overflow-hidden shrink-0">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6e46f2] to-[#592be8] rounded-full transition-all duration-500 shadow-xs" 
                    style={{ width: `${progressVal}%` }} 
                  />
                </div>
              </div>

              {/* General Contractor */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600 shadow-2xs transition-colors">
                <HardHat className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>GC: <strong className="text-slate-900 font-bold">{gcName}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Column: Vibrant 3D Construction Scene Art */}
          <div className="shrink-0 self-center lg:self-auto flex items-center justify-center">
            <img
              src="/timeline/Vibrant 3D Construction Progress Scene.png"
              alt="Construction Timeline Management"
              className="h-24 sm:h-28 md:h-32 lg:h-36 w-auto object-contain drop-shadow-xl select-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Six High-Fidelity Pastel Tinted KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
        {cards.map((card, idx) => {
          const isClickable = card.id !== null;
          const isSelected = isClickable && activeFilter === card.id;

          return (
            <div
              key={idx}
              onClick={() => {
                if (isClickable && card.id) {
                  onFilterChange(card.id === activeFilter && card.id !== 'all' ? 'all' : card.id);
                }
              }}
              className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[114px] sm:min-h-[124px] ${card.bgGradient} ${card.borderColor} ${
                isSelected ? card.activeStyles : card.inactiveStyles
              } ${
                isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md active:translate-y-0' : ''
              }`}
            >
              {/* Top Accent Line for Selected Filter */}
              {isSelected && (
                <span className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accentGradient} rounded-t-full shadow-xs z-20`} />
              )}

              {/* Card Body: Left 3D Icon, Right Metric Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
                {/* 3D Glossy Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-13 lg:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src={card.imageSrc}
                    alt={card.label}
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Metric Info Column */}
                <div className="flex-1 min-w-0">
                  <span 
                    className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate"
                    title={card.label}
                  >
                    {card.label}
                  </span>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-numeric">
                      {card.value}
                    </span>
                    {card.badge && (
                      <span className={`text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap ${card.badge.color}`}>
                        {card.badge.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Optional Progress Bar and Subtext */}
              <div className="mt-2 pt-1 relative z-10">
                {card.isProgressBar && (
                  <div className="w-full h-1.5 bg-purple-100 rounded-full mb-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6e46f2] to-[#592be8] rounded-full transition-all duration-500 shadow-xs" 
                      style={{ width: `${metrics.overallProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight truncate" title={card.subtext}>
                  {card.subtext}
                </p>
              </div>

              {/* Organic Bottom-Right Corner Wave Accent */}
              <div className="absolute -bottom-2 -right-2 w-20 sm:w-24 h-10 sm:h-12 pointer-events-none opacity-40 overflow-hidden z-0">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,50 Q40,15 70,35 T100,0 L100,50 Z" fill={card.waveColor} />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
