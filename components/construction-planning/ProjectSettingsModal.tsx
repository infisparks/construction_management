'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Building2, Calendar, Clock, Check } from 'lucide-react';
import { ProjectInfo } from '@/lib/construction-planning/types';
import { calculateDurationDetails } from '@/lib/construction-planning/schedule-utils';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectInfo;
  onSave: (updatedProject: ProjectInfo) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [type, setType] = useState(project.type);
  const [durationMonths, setDurationMonths] = useState(project.durationMonths);
  const [plannedStartDate, setPlannedStartDate] = useState(project.plannedStartDate);
  const [plannedCompletionDate, setPlannedCompletionDate] = useState(project.plannedCompletionDate);
  const [clientName, setClientName] = useState(project.clientName);
  const [generalContractor, setGeneralContractor] = useState(project.generalContractor);

  useEffect(() => {
    setName(project.name);
    setCode(project.code);
    setType(project.type);
    setDurationMonths(project.durationMonths);
    setPlannedStartDate(project.plannedStartDate);
    setPlannedCompletionDate(project.plannedCompletionDate);
    setClientName(project.clientName);
    setGeneralContractor(project.generalContractor);
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...project,
      name: name.trim(),
      code: code.trim(),
      type: type.trim(),
      durationMonths: Number(durationMonths) || 18,
      plannedStartDate,
      plannedCompletionDate,
      clientName: clientName.trim(),
      generalContractor: generalContractor.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Project Baseline Settings
              </h3>
              <p className="text-xs text-slate-500">
                Manage contract master schedule dates and project parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Project Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Planned Duration (Months) *</label>
              <input
                type="number"
                min={1}
                required
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono"
              />
              <p className="text-[10px] text-purple-600 font-semibold mt-1">
                Calculated: {calculateDurationDetails(plannedStartDate, plannedCompletionDate).formatted}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Master Planned Start *</label>
              <input
                type="date"
                required
                value={plannedStartDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlannedStartDate(val);
                  const d = calculateDurationDetails(val, plannedCompletionDate);
                  setDurationMonths(d.months > 0 ? d.months : 1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Master Planned Finish *</label>
              <input
                type="date"
                required
                value={plannedCompletionDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlannedCompletionDate(val);
                  const d = calculateDurationDetails(plannedStartDate, val);
                  setDurationMonths(d.months > 0 ? d.months : 1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Client / Owner Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">General Contractor (EPC/PMC)</label>
            <input
              type="text"
              value={generalContractor}
              onChange={(e) => setGeneralContractor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Project Settings</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
