'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Calendar, 
  BarChart3, 
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { formatDisplayDate, calculateDaysBetween, formatDelayReadable } from '@/lib/construction-planning/schedule-utils';

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
  forecastCompletionDate: string;
  activeFilter: SummaryFilterType;
  onFilterChange: (filter: SummaryFilterType) => void;
}

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({
  metrics,
  plannedCompletionDate = '2027-06-30',
  forecastCompletionDate,
  activeFilter,
  onFilterChange,
}) => {
  const varianceDays = calculateDaysBetween(plannedCompletionDate, forecastCompletionDate);
  const readableDelay = formatDelayReadable(varianceDays);
  const cards = [
    {
      id: 'all' as SummaryFilterType,
      label: 'Total Activities',
      value: metrics.total,
      subtext: 'across all packages',
      icon: BarChart3,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      borderColor: activeFilter === 'all' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200',
      badge: null,
    },
    {
      id: 'completed' as SummaryFilterType,
      label: 'Completed',
      value: metrics.completed,
      subtext: `${Math.round((metrics.completed / (metrics.total || 1)) * 100)}% of total scope`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      borderColor: activeFilter === 'completed' ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200',
      badge: { text: 'Verified', color: 'bg-emerald-100 text-emerald-800' },
    },
    {
      id: 'in_progress' as SummaryFilterType,
      label: 'In Progress',
      value: metrics.inProgress,
      subtext: 'active on site today',
      icon: PlayCircle,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      borderColor: activeFilter === 'in_progress' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200',
      badge: { text: 'Parallel', color: 'bg-indigo-100 text-indigo-800' },
    },
    {
      id: 'not_started' as SummaryFilterType,
      label: 'Not Started',
      value: metrics.notStarted,
      subtext: 'upcoming work packages',
      icon: PauseCircle,
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-100',
      borderColor: activeFilter === 'not_started' ? 'border-slate-500 ring-2 ring-slate-100' : 'border-slate-200',
      badge: null,
    },
    {
      id: 'delayed' as SummaryFilterType,
      label: 'Delayed Activities',
      value: metrics.delayed,
      subtext: metrics.delayed > 0 ? `${metrics.delayed} tasks behind schedule` : 'On track',
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      borderColor: activeFilter === 'delayed' ? 'border-rose-600 ring-2 ring-rose-100' : 'border-slate-200',
      badge: { text: 'Action Req.', color: 'bg-rose-100 text-rose-800 font-bold' },
    },
    {
      id: 'critical' as SummaryFilterType,
      label: 'Critical Activities',
      value: metrics.critical,
      subtext: 'Zero float (CPM chain)',
      icon: Flame,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      borderColor: activeFilter === 'critical' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-slate-200',
      badge: { text: 'P0 Impact', color: 'bg-purple-100 text-purple-800' },
    },
    {
      id: null,
      label: 'Overall Progress',
      value: `${metrics.overallProgress}%`,
      subtext: 'aggregate weighted',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      borderColor: 'border-slate-200',
      badge: { text: 'Target 50%', color: 'bg-blue-100 text-blue-800' },
    },
    {
      id: null,
      label: 'Forecast Completion',
      value: formatDisplayDate(forecastCompletionDate),
      subtext: readableDelay,
      icon: Calendar,
      iconColor: varianceDays > 0 ? 'text-amber-600' : 'text-emerald-600',
      iconBg: varianceDays > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      borderColor: 'border-slate-200',
      badge: varianceDays > 0 
        ? { text: `+${varianceDays}d Delay`, color: 'bg-rose-100 text-rose-800 font-semibold' }
        : varianceDays < 0 
          ? { text: `${Math.abs(varianceDays)}d Ahead`, color: 'bg-emerald-100 text-emerald-800 font-semibold' }
          : { text: 'On Time', color: 'bg-slate-100 text-slate-700 font-semibold' },
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
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
            className={`bg-white rounded-xl p-3 border transition-all duration-150 flex flex-col justify-between ${
              card.borderColor
            } ${
              isClickable ? 'cursor-pointer hover:shadow-sm hover:border-slate-300' : ''
            } ${isSelected ? 'bg-slate-50/70 shadow-xs' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
                  {card.label}
                </span>
                <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor} shrink-0`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </span>
                {card.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${card.badge.color}`}>
                    {card.badge.text}
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 truncate">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
