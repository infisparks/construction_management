'use client';

import React, { useState, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Flame, 
  Milestone as MilestoneIcon, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Calendar,
  Clock
} from 'lucide-react';
import { ConstructionTask, TaskType } from '@/lib/construction-planning/types';
import { TaskNode } from '@/lib/construction-planning/task-utils';
import { formatDisplayDate, calculateDaysBetween } from '@/lib/construction-planning/schedule-utils';

interface GanttTimelineProps {
  tasks: TaskNode[];
  allTasks: ConstructionTask[];
  expandedIds: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onSelectTask: (task: ConstructionTask) => void;
}

type ZoomLevel = 'month' | 'week' | 'day';

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  tasks,
  allTasks,
  expandedIds,
  onToggleExpand,
  onSelectTask,
}) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');

  // Overall timeline bounds: from Jan 2026 to July 2027 (~18 months)
  const timelineStart = useMemo(() => new Date('2026-01-01'), []);
  const timelineEnd = useMemo(() => new Date('2027-07-31'), []);
  const totalDays = useMemo(() => {
    return Math.max(1, Math.round((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
  }, [timelineStart, timelineEnd]);

  // Today marker (simulated October 2026 for realistic mid-schedule demo)
  const simulatedToday = '2026-08-29';
  const todayDaysFromStart = calculateDaysBetween('2026-01-01', simulatedToday);
  const todayLeftPercent = Math.max(0, Math.min(100, (todayDaysFromStart / totalDays) * 100));

  // Generate timeline column markers based on zoom
  const monthMarkers = useMemo(() => {
    const markers: { label: string; date: Date; leftPercent: number }[] = [];
    let current = new Date('2026-01-01');
    while (current <= timelineEnd) {
      const days = Math.round((current.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
      const left = (days / totalDays) * 100;
      markers.push({
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        date: new Date(current),
        leftPercent: left,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [timelineStart, timelineEnd, totalDays]);

  // Helper to convert date to percentage of timeline
  const getPositionPercent = (dateStr?: string | null): number => {
    if (!dateStr) return 0;
    const days = calculateDaysBetween('2026-01-01', dateStr);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  };

  const getWidthPercent = (startStr: string, endStr: string): number => {
    const days = Math.max(1, calculateDaysBetween(startStr, endStr));
    return Math.max(0.5, Math.min(100, (days / totalDays) * 100));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Timeline Controls Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Interactive Gantt Schedule Timeline
          </span>
          <span className="text-slate-400">|</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded bg-slate-300" />
              Planned Baseline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded bg-indigo-600" />
              Actual / Forecast
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded bg-purple-600" />
              Critical Path
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rotate-45 bg-amber-500" />
              Milestone
            </span>
          </div>
        </div>

        {/* Zoom selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Timeline Zoom:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(['month', 'week', 'day'] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-all ${
                  zoomLevel === level
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Split View */}
      <div className="flex overflow-hidden divide-x divide-slate-200 min-h-[460px]">
        
        {/* Left Column: Fixed WBS List */}
        <div className="w-[300px] sm:w-[360px] shrink-0 overflow-y-auto bg-white">
          <div className="h-10 bg-slate-50 border-b border-slate-200 px-3 flex items-center font-semibold text-[11px] text-slate-500 uppercase tracking-wider sticky top-0 z-10">
            WBS Activity Hierarchy
          </div>
          <div className="divide-y divide-slate-100">
            {tasks.map((node) => {
              const hasChildren = node.children && node.children.length > 0;
              const isWorkPackage = node.type === 'work_package';
              const isMilestone = node.type === 'milestone';
              const indentPadding = Math.min(node.level * 16, 64);

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectTask(node)}
                  className={`h-11 px-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                    isWorkPackage ? 'font-bold bg-slate-50/50' : 'font-normal'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate" style={{ paddingLeft: `${indentPadding}px` }}>
                    {hasChildren ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpand(node.id);
                        }}
                        className="p-0.5 text-slate-500 hover:text-slate-800"
                      >
                        {expandedIds.has(node.id) ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0 inline-block" />
                    )}

                    {node.isCritical && (
                      <Flame className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    )}

                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {node.code}
                    </span>
                    <span className="truncate text-slate-800" title={node.name}>
                      {node.name}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-slate-400 shrink-0 pl-1">
                    {isMilestone ? 'MS' : `${node.plannedDurationDays}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scrollable Gantt Chart Bars */}
        <div className="flex-1 overflow-x-auto relative bg-slate-50/20">
          
          {/* Scrollable Container with defined min-width */}
          <div className="min-w-[900px] relative">
            
            {/* Header: Months / Weeks */}
            <div className="h-10 bg-slate-50 border-b border-slate-200 relative flex items-center sticky top-0 z-10">
              {monthMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute text-[11px] font-semibold text-slate-600 font-mono border-l border-slate-200 pl-1.5 py-2"
                  style={{ left: `${marker.leftPercent}%` }}
                >
                  {marker.label}
                </div>
              ))}
            </div>

            {/* Today Marker Red Vertical Line */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none border-l-2 border-rose-500"
              style={{ left: `${todayLeftPercent}%` }}
            >
              <span className="absolute -top-0 -left-6 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                Today
              </span>
            </div>

            {/* Grid Background Columns */}
            <div className="absolute inset-0 pointer-events-none">
              {monthMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-l border-slate-200/50"
                  style={{ left: `${marker.leftPercent}%` }}
                />
              ))}
            </div>

            {/* Task Bar Rows */}
            <div className="divide-y divide-slate-100 relative z-0">
              {tasks.map((node) => {
                const isMilestone = node.type === 'milestone';
                const isWorkPackage = node.type === 'work_package';
                
                const plannedStartLeft = getPositionPercent(node.plannedStartDate);
                const plannedWidth = getWidthPercent(node.plannedStartDate, node.plannedEndDate);
                
                const forecastStartLeft = getPositionPercent(node.forecastStartDate || node.plannedStartDate);
                const forecastWidth = getWidthPercent(
                  node.forecastStartDate || node.plannedStartDate,
                  node.forecastEndDate || node.plannedEndDate
                );

                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectTask(node)}
                    className="h-11 relative flex items-center hover:bg-slate-100/50 cursor-pointer"
                  >
                    {/* Milestone Diamond Rendering */}
                    {isMilestone ? (
                      <div
                        className="absolute z-10 flex items-center gap-1 group"
                        style={{ left: `${plannedStartLeft}%` }}
                      >
                        <div className={`w-4 h-4 rotate-45 border-2 shadow-xs transition-transform group-hover:scale-125 ${
                          node.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-600'
                            : node.isCritical
                              ? 'bg-purple-600 border-purple-700'
                              : 'bg-amber-500 border-amber-600'
                        }`} />
                        <span className="text-[10px] font-semibold text-slate-700 whitespace-nowrap pl-1">
                          {formatDisplayDate(node.forecastEndDate)}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* 1. Planned Baseline Bar (Light background) */}
                        <div
                          className="absolute h-2.5 rounded bg-slate-200/80 border border-slate-300 top-2"
                          style={{
                            left: `${plannedStartLeft}%`,
                            width: `${plannedWidth}%`,
                          }}
                          title={`Planned Baseline: ${formatDisplayDate(node.plannedStartDate)} to ${formatDisplayDate(node.plannedEndDate)}`}
                        />

                        {/* 2. Forecast / Execution Bar */}
                        <div
                          className={`absolute h-4 rounded-md shadow-xs top-4 overflow-hidden border transition-all ${
                            node.isCritical
                              ? 'bg-purple-500 border-purple-600 text-white'
                              : node.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-600 text-white'
                                : node.status === 'delayed'
                                  ? 'bg-rose-500 border-rose-600 text-white'
                                  : isWorkPackage
                                    ? 'bg-slate-700 border-slate-800 text-white'
                                    : 'bg-indigo-600 border-indigo-700 text-white'
                          }`}
                          style={{
                            left: `${forecastStartLeft}%`,
                            width: `${forecastWidth}%`,
                          }}
                          title={`${node.name} (${node.progress}% Complete)`}
                        >
                          {/* Inner Progress Fill */}
                          <div
                            className="h-full bg-white/20 transition-all"
                            style={{ width: `${node.progress}%` }}
                          />
                        </div>

                        {/* Text Label alongside the bar */}
                        <div
                          className="absolute text-[10px] font-medium text-slate-600 whitespace-nowrap top-4.5"
                          style={{ left: `calc(${forecastStartLeft}% + ${forecastWidth}% + 6px)` }}
                        >
                          {node.progress > 0 && <span className="font-bold">{node.progress}%</span>}
                          {node.varianceDays > 0 && (
                            <span className="text-rose-600 font-bold ml-1">+{node.varianceDays}d</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
