'use client';

import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Layers, 
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { RecoveryScenario, ProjectInfo } from '@/lib/construction-planning/types';
import { formatDisplayDate } from '@/lib/construction-planning/schedule-utils';

interface RecoveryPlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: RecoveryScenario[];
  project: ProjectInfo;
  onApplyScenario: (scenario: RecoveryScenario) => void;
}

export const RecoveryPlanDrawer: React.FC<RecoveryPlanDrawerProps> = ({
  isOpen,
  onClose,
  scenarios,
  project,
  onApplyScenario,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || '');
  const [simulatedActive, setSimulatedActive] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleSimulate = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    setSimulatedActive(true);
  };

  const handleApply = () => {
    if (currentScenario) {
      onApplyScenario(currentScenario);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-amber-50/70 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Schedule Recovery & Fast-Tracking Studio
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 uppercase">
                  Illustrative Estimate
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Model parallel work streams, additional shift hours, and prefabrication to compress critical path delays.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Baseline vs Current Delay Warning */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Approved Baseline Target:</span>
              <strong className="text-slate-900 font-mono text-sm">{formatDisplayDate(project.plannedCompletionDate)}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Current Unmitigated Forecast:</span>
              <strong className="text-rose-700 font-mono text-sm">{formatDisplayDate(project.forecastCompletionDate)} (+3d)</strong>
            </div>
          </div>

          {/* Scenario Selection Cards */}
          <div className="space-y-3">
            <label className="block text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              Available Recovery Strategies:
            </label>

            {scenarios.map((scenario) => {
              const isSelected = selectedScenarioId === scenario.id;

              return (
                <div
                  key={scenario.id}
                  onClick={() => handleSimulate(scenario.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">{scenario.name}</h4>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Recovers {scenario.recoveredDays} Days
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs mb-3">{scenario.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block">Affected WBS Codes:</span>
                      <strong className="text-slate-700 font-mono">{scenario.affectedTaskCodes.join(', ')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Simulated New Finish:</span>
                      <strong className="text-emerald-700 font-mono">
                        {formatDisplayDate(scenario.simulatedForecastDate)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Breakdown for Selected Scenario */}
          {currentScenario && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Simulation Impact & Assumptions ({currentScenario.name})</span>
              </div>

              {/* Assumptions */}
              <div>
                <span className="font-bold text-slate-700 block mb-1 text-[11px]">Key Prerequisites & Assumptions:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  {currentScenario.assumptions.map((ass, idx) => (
                    <li key={idx}>{ass}</li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div>
                <span className="font-bold text-slate-700 block mb-1 text-[11px]">Identified Trade-offs & Risks:</span>
                <ul className="list-disc list-inside space-y-1 text-rose-700 text-[11px]">
                  {currentScenario.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Applying this simulation will adjust current mock forecast dates to demonstrate how parallel shifts protect the contractual completion milestone.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulate(selectedScenarioId)}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-xs"
            >
              Simulate Recovery
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Demo Plan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
