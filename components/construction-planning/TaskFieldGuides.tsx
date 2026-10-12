import React from 'react';
import { X, CheckCircle2, Zap, BookOpen } from 'lucide-react';

export interface FieldGuideInfo {
  id: string;
  label: string;
  whatToWrite: string;
  whatHappens: string;
  examples: [string, string, string, string];
}

export const FIELD_GUIDES: Record<string, FieldGuideInfo> = {
  name: {
    id: 'name',
    label: 'Activity Name',
    whatToWrite: 'Enter the specific, physical construction work item or trade activity to be executed on site.',
    whatHappens: 'Sets the primary activity label across WBS schedule, Gantt timeline, supervisor daily progress reporting, and subcontractor measurement books (MB).',
    examples: [
      '4th Floor Slab & Beam Shuttering Work',
      'Bulk Earth Excavation for Raft Foundation',
      'Internal Double-Coat Sand-Faced Cement Plastering',
      'HVAC Chilled Water Pipe Hydro-Testing',
    ],
  },
  code: {
    id: 'code',
    label: 'WBS Code',
    whatToWrite: 'Hierarchical Work Breakdown Structure numbering code indicating the project phase, work package, and task sequence (e.g. 3.4.1).',
    whatHappens: 'Controls sorting order in the schedule tree, establishes parent-child indentation, and standardizes cost coding and accounting audits.',
    examples: [
      '3.4.1 (Floor 4 beam rebar under Phase 3 RCC)',
      '2.1 (Primary foundation earthwork item)',
      '5.2.3 (Firefighting wet riser pipe fitting)',
      '10.1.2 (Final electrical load testing before handover)',
    ],
  },
  type: {
    id: 'type',
    label: 'Activity Type',
    whatToWrite: 'Select whether this item is a Standard Task, Work Package folder, Milestone (0 days), or QC Inspection item.',
    whatHappens: 'Milestones lock to 0 duration; Work Packages roll up child progress and dates; Standard Tasks calculate CPM schedule float.',
    examples: [
      'Standard Activity (Task) — Physical labor like rebar tying or blockwork',
      'Work Package (PKG Folder) — Phase group like "Phase 3: RCC Superstructure"',
      'Milestone (MS - 0 Days) — Contractual target like "Plinth Completion Certificate"',
      'QC / Inspection — Signoff hold point like "Third-Party Concrete Cube Test Approval"',
    ],
  },
  parentTaskId: {
    id: 'parentTaskId',
    label: 'Parent Work Package',
    whatToWrite: 'The master phase or work package folder under which this specific activity belongs.',
    whatHappens: 'Builds the hierarchical WBS tree. Its progress and schedule automatically aggregate into the parent package rollups.',
    examples: [
      '3.0 RCC Superstructure Frame (G+7 Floors)',
      '2.0 Foundation & Substructure Works',
      '5.0 MEP Services: Plumbing, Firefighting & Electrical',
      'None (Top-Level Phase) — for creating a brand new master stage',
    ],
  },
  floor: {
    id: 'floor',
    label: 'Location / Floor',
    whatToWrite: 'The exact physical level, gridline reference, building wing, or site zone.',
    whatHappens: 'Enables supervisors to filter tasks by floor, track floor-by-floor turnaround cycles, and avoid trade clashes in the same zone.',
    examples: [
      '3rd Typical Floor (Flat 301 to 304)',
      'Basement 2 (Pump Room & STP Zone)',
      'Podium Level 1 (Commercial Lobby)',
      'Terrace & Overhead Water Tank (OHT)',
    ],
  },
  dates: {
    id: 'dates',
    label: 'Planned Schedule & Duration',
    whatToWrite: 'Planned mobilization start date, expected execution duration in days, and target completion date.',
    whatHappens: 'Sets the baseline project schedule. Drives Critical Path Method (CPM) calculations, float buffer, and delay variance alerts.',
    examples: [
      'Start: 01/09/2026, Duration: 14 Days, End: 15/09/2026 (Slab casting cycle)',
      'Start: 10/10/2026, Duration: 21 Days, End: 31/10/2026 (External plastering)',
      'Start: 15/11/2026, Duration: 7 Days, End: 22/11/2026 (Lift pit waterproofing)',
      'Start: 05/01/2027, Duration: 30 Days, End: 04/02/2027 (Living room vitrified tiling)',
    ],
  },
  dependency: {
    id: 'dependency',
    label: 'Predecessor Dependency',
    whatToWrite: 'The prior task that must finish or start before this work can begin, along with logic relationship (FS, SS, FF, SF) and lag days.',
    whatHappens: 'Constructs the CPM schedule network. If the predecessor is delayed on site, this task and its downstream successors auto-shift.',
    examples: [
      'Predecessor: Column Casting → FS (Finish to Start, 1d lag for curing)',
      'Predecessor: Block Masonry → SS (Start to Start, 3d lag for conduit grooving)',
      'Predecessor: Plastering → FF (Finish to Finish, 0d lag before primer paint)',
      'No Predecessor — For parallel work streams that can proceed independently',
    ],
  },
  critical: {
    id: 'critical',
    label: 'Critical Path Priority & Float',
    whatToWrite: 'Choose Critical (0d Float) if delay will delay the whole project, or Non-Critical if safety buffer days are available.',
    whatHappens: 'Critical tasks show the Purple Flame 🔥 icon. Any 1-day delay on a critical task immediately increases project delay (+d delay).',
    examples: [
      'Critical (0d Float) — Raft Foundation Casting (delays the whole tower)',
      'Critical (0d Float) — Main Electrical Substation Room Commissioning',
      'Non-Critical (Buffer: 7 days) — Internal Bedroom 1st Coat Primer Paint',
      'Non-Critical (Buffer: 14 days) — Site Boundary Compound Wall Fabrication',
    ],
  },
  responsible: {
    id: 'responsible',
    label: 'Site Incharge / Engineer',
    whatToWrite: 'The full name and designation of the engineer or supervisor accountable for supervising this activity.',
    whatHappens: 'Assigns execution responsibility, displays on daily progress logs, and routes delay blocker escalations.',
    examples: [
      'Er. Amit Verma (Senior Structural Engineer)',
      'Er. Rajesh Kulkarni (Project Site Manager)',
      'Er. Imran Shaikh (MEP Site Lead)',
      'Mr. Sandeep Patil (RCC Formwork Contractor)',
    ],
  },
  boq: {
    id: 'boq',
    label: 'Target BOQ Quantity & Unit',
    whatToWrite: 'The estimated Bill of Quantities work volume to be executed and its standard measurement unit (cu.m, sq.m, MT, nos, etc.).',
    whatHappens: 'Enables physical quantity tracking alongside percentage, measures daily labor productivity, and validates subcontractor MB bills.',
    examples: [
      'Quantity: 520, Unit: "cu.m" (M30 Concrete casting volume)',
      'Quantity: 1850, Unit: "sq.m" (Internal gypsum wall plaster)',
      'Quantity: 45, Unit: "MT" (Fe550 TMT steel reinforcement rebar)',
      'Quantity: 240, Unit: "Rmt" (Underground stormwater drainage line)',
    ],
  },
  notes: {
    id: 'notes',
    label: 'Notes / Technical Specs',
    whatToWrite: 'Material specifications, concrete mix design codes, curing durations, inspection hold points, or safety guidelines.',
    whatHappens: 'Displays in the task specifications panel for site foremen, aids quality audits, and attaches to QA signoff records.',
    examples: [
      'M30 grade RMC with silica fume. Cube testing mandatory at 7 & 28 days.',
      'Minimum 14 days continuous pond curing required prior to de-shuttering.',
      '2-coat SBS bitumen membrane with 100mm overlaps sealed with hot torch.',
      'Full body safety harness mandatory for all workers on scaffolding above 2m.',
    ],
  },
};

interface FieldGuideCardProps {
  guide: FieldGuideInfo;
  onClose?: () => void;
}

export const FieldGuideCard: React.FC<FieldGuideCardProps> = ({ guide, onClose }) => {
  return (
    <div className="w-full max-w-full p-4 rounded-xl bg-purple-50/95 border border-purple-200 text-slate-800 shadow-sm animate-in fade-in duration-150 space-y-3 my-2.5 text-xs overflow-hidden">
      <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            i
          </span>
          <span className="font-bold text-purple-950 text-xs sm:text-sm truncate">
            Field Guide: {guide.label}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-purple-100/60 transition-colors cursor-pointer shrink-0"
            title="Dismiss guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>What to write:</span>
        </div>
        <p className="text-[11px] text-slate-700 leading-relaxed pl-5 break-words">
          {guide.whatToWrite}
        </p>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>What happens in the system:</span>
        </div>
        <p className="text-[11px] text-slate-700 leading-relaxed pl-5 break-words">
          {guide.whatHappens}
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-purple-200/60">
        <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>4 Practical Construction Examples:</span>
          </span>
          <span className="text-[10px] text-purple-600 font-semibold font-mono bg-purple-100/80 px-2 py-0.5 rounded-full">
            Jobsite cases
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {guide.examples.map((ex, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-white border border-purple-200/80 flex items-start gap-2 text-[11px] shadow-2xs min-w-0 overflow-hidden"
            >
              <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="text-slate-800 leading-snug break-words min-w-0 flex-1">
                {ex}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
