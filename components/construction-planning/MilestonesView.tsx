'use client';

import React from 'react';
import { 
  Milestone as MilestoneIcon, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Flag 
} from 'lucide-react';
import { ConstructionTask } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';

interface MilestonesViewProps {
  milestones: ConstructionTask[];
  onSelectMilestone: (milestone: ConstructionTask) => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  milestones,
  onSelectMilestone,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <MilestoneIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Contractual & Structural Project Milestones
            </h3>
            <p className="text-xs text-slate-500">
              Zero-duration key control dates monitored by the construction owner and PMC.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
          {milestones.length} Milestones Tracked
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Milestone</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Planned Target</th>
              <th className="py-3 px-3">Actual Achieved</th>
              <th className="py-3 px-3">Current Forecast</th>
              <th className="py-3 px-3">Variance</th>
              <th className="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {milestones.map((m) => {
              const isCompleted = m.status === 'completed';
              const isDelayed = m.varianceDays > 0;

              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectMilestone(m)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rotate-45 border-2 shrink-0 ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-600' 
                          : isDelayed
                            ? 'bg-rose-500 border-rose-600'
                            : 'bg-amber-500 border-amber-600'
                      }`} />
                      <span className="font-mono font-semibold text-slate-500">{m.code}</span>
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600">
                        {m.name}
                      </span>
                      {m.isCritical && (
                        <span title="On Critical Path" className="shrink-0">
                          <Flame className="w-3.5 h-3.5 text-purple-600" />
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    {m.floor || 'Tower Level'}
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-800">
                    {formatDisplayDate(m.plannedEndDate)}
                  </td>

                  <td className="py-3 px-3">
                    {m.actualEndDate ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {formatDisplayDate(m.actualEndDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending execution</span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-medium text-slate-800">
                    {formatDisplayDate(m.forecastEndDate)}
                  </td>

                  <td className="py-3 px-3 font-mono">
                    {m.varianceDays > 0 ? (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        +{m.varianceDays} Days Late
                      </span>
                    ) : m.varianceDays < 0 ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {m.varianceDays} Days Ahead
                      </span>
                    ) : (
                      <span className="text-slate-600">0 Days (On Target)</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800' :
                      isDelayed ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
