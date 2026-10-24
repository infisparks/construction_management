'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  BarChart3, 
  PauseCircle,
  TrendingUp
} from 'lucide-react';

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
  plannedCompletionDate?: string;
  forecastCompletionDate?: string;
  activeFilter: SummaryFilterType;
  onFilterChange: (filter: SummaryFilterType) => void;
}

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  metrics,
  activeFilter,
  onFilterChange,
}) => {
  const cards = [
    {
      id: 'all' as SummaryFilterType,
      label: 'Total Activities',
      value: metrics.total,
      subtext: 'Across all work packages',
      icon: BarChart3,
      iconContainer: 'bg-purple-100/90 text-[#653ef1] border border-purple-200/80',
      activeStyles: 'border-[#653ef1] ring-2 ring-[#653ef1]/25 bg-gradient-to-br from-purple-50/70 via-white to-white shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-md',
      accentGradient: 'from-[#653ef1] to-[#8b5cf6]',
      badge: { text: 'WBS Scope', color: 'bg-purple-100 text-[#653ef1] border border-purple-200' },
    },
    {
      id: 'completed' as SummaryFilterType,
      label: 'Completed Tasks',
      value: metrics.completed,
      subtext: `${Math.round((metrics.completed / (metrics.total || 1)) * 100)}% of scope done`,
      icon: CheckCircle2,
      iconContainer: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/80',
      activeStyles: 'border-emerald-600 ring-2 ring-emerald-500/25 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md',
      accentGradient: 'from-emerald-600 to-teal-600',
      badge: { text: 'Verified', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    },
    {
      id: 'not_started' as SummaryFilterType,
      label: 'Not Started',
      value: metrics.notStarted,
      subtext: 'Upcoming work packages',
      icon: PauseCircle,
      iconContainer: 'bg-slate-100 text-slate-600 border border-slate-200',
      activeStyles: 'border-slate-600 ring-2 ring-slate-400/25 bg-gradient-to-br from-slate-50 via-white to-white shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md',
      accentGradient: 'from-slate-600 to-slate-700',
      badge: { text: 'Queued', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
    },
    {
      id: 'delayed' as SummaryFilterType,
      label: 'Delayed Activities',
      value: metrics.delayed,
      subtext: metrics.delayed > 0 ? `${metrics.delayed} tasks behind` : 'On track & on schedule',
      icon: AlertTriangle,
      iconContainer: 'bg-rose-100/80 text-rose-700 border border-rose-200/80',
      activeStyles: 'border-rose-600 ring-2 ring-rose-500/25 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-rose-300 hover:shadow-md',
      accentGradient: 'from-rose-600 to-red-600',
      badge: metrics.delayed > 0 
        ? { text: 'Action Req.', color: 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse font-bold' }
        : { text: 'Healthy', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    },
    {
      id: 'critical' as SummaryFilterType,
      label: 'Critical Path Chain',
      value: metrics.critical,
      subtext: 'Zero float CPM chain',
      icon: Flame,
      iconContainer: 'bg-amber-100/80 text-amber-700 border border-amber-200/80',
      activeStyles: 'border-amber-600 ring-2 ring-amber-500/25 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-md',
      accentGradient: 'from-amber-600 to-orange-600',
      badge: { text: 'P0 Float', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
    },
    {
      id: null,
      label: 'Overall Progress',
      value: `${metrics.overallProgress}%`,
      subtext: 'Aggregate project progress',
      icon: TrendingUp,
      iconContainer: 'bg-purple-100/90 text-[#653ef1] border border-purple-200/80',
      activeStyles: 'border-[#653ef1] ring-2 ring-[#653ef1]/25 shadow-md',
      inactiveStyles: 'border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-md',
      accentGradient: 'from-[#653ef1] to-[#8b5cf6]',
      badge: { text: 'Target 50%', color: 'bg-purple-100 text-[#653ef1] border border-purple-200' },
      isProgressBar: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
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
            className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex flex-col justify-between relative overflow-hidden group min-h-[110px] sm:min-h-[120px] ${
              isSelected ? card.activeStyles : card.inactiveStyles
            } ${
              isClickable ? 'cursor-pointer hover:-translate-y-1 active:translate-y-0' : ''
            }`}
          >
            {/* Top Accent Line for Selected State */}
            {isSelected && (
              <span className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.accentGradient} rounded-t-full shadow-xs`} />
            )}

            <div>
              {/* Card Header: Label & Icon */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span 
                  className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate"
                  title={card.label}
                >
                  {card.label}
                </span>
                <div className={`w-7 h-7 rounded-lg ${card.iconContainer} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs`}>
                  <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
              </div>

              {/* Card Metrics Value & Status Badge */}
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-numeric">
                  {card.value}
                </span>
                {card.badge && (
                  <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs whitespace-nowrap ${card.badge.color}`}>
                    {card.badge.text}
                  </span>
                )}
              </div>

              {/* Optional Progress Bar for Overall Progress */}
              {card.isProgressBar && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#653ef1] to-[#8b5cf6] rounded-full transition-all duration-500" 
                    style={{ width: `${metrics.overallProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Subtext description - compact and clean */}
            <p className="text-[11px] text-slate-500 mt-2 font-medium leading-snug line-clamp-2" title={card.subtext}>
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
