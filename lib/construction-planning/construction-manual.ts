export interface ManualEntry {
  id: string;
  term: string;
  shortBadge: string;
  category: 'Task Types' | 'Dependencies' | 'Calculations' | 'Site Execution' | 'Schedule Health';
  keywords: string[];
  shortDefinition: string;
  simpleExplanation: string;
  siteExample: string;
  howSoftwareWorks: string[];
  proTip: string;
}

export const CONSTRUCTION_MANUAL: ManualEntry[] = [
  {
    id: 'pkg',
    term: 'PKG (Work Package / Parent)',
    shortBadge: 'PKG',
    category: 'Task Types',
    keywords: ['pkg', 'package', 'work package', 'folder', 'group', 'heading', 'summary', 'parent', 'rollup'],
    shortDefinition: 'A master folder or group header that holds related construction subtasks.',
    simpleExplanation: 'A Work Package is NOT physical work you do directly. It is a container (like a folder) that groups activities together for a floor, zone, or major construction trade. You cannot manually type duration or % into a PKG—it updates itself automatically.',
    siteExample: 'Example: "1st Floor RCC Frame" is a PKG. Inside it are 4 subtasks: Column Rebar, Shuttering, Beam Steel, and Concrete Pouring. When those 4 subtasks finish, the PKG automatically becomes 100%.',
    howSoftwareWorks: [
      'The software automatically finds the earliest subtask start date and sets that as the PKG start date.',
      'It finds the latest subtask end date and sets that as the PKG end date.',
      'Progress % is dynamically rolled up as the weighted average of all child activities.',
      'Quick action buttons (Start/Log/Done) are disabled on PKG rows to avoid human data entry errors.'
    ],
    proTip: 'Always organize your multi-storey building by floor or trade PKGs (e.g., Substructure, Ground Floor RCC, 1st Floor Masonry). This keeps your 100+ tasks clean and collapsible.'
  },
  {
    id: 'task',
    term: 'Task (Standard Activity)',
    shortBadge: 'TASK',
    category: 'Task Types',
    keywords: ['task', 'activity', 'work', 'physical work', 'labor', 'boq', 'subtask'],
    shortDefinition: 'Actual physical construction work performed on site by labor and machinery.',
    simpleExplanation: 'This is real physical work on the ground that takes days, requires labor, uses materials, and produces measurable physical output (like cubic meters of concrete or square meters of brickwork).',
    siteExample: 'Example: "Internal Brick Masonry - 2nd Floor (1,250 sq.m)". Requires 12 masons + 14 helpers, planned for 9 days.',
    howSoftwareWorks: [
      'Site engineers can click "Start" to stamp the real-world actual start date.',
      'Supervisors use "Log Progress" to enter daily output (BOQ quantities, worker counts, delay reasons, and photo proofs).',
      'If the task takes longer than planned, the software flags it as delayed and recalculates the finish date.'
    ],
    proTip: 'Keep task durations between 2 to 14 days. If a task takes longer than 2 weeks, break it into smaller subtasks like "East Wing" and "West Wing" for better supervision.'
  },
  {
    id: 'milestone',
    term: 'MS (Milestone - 0 Days)',
    shortBadge: 'MS',
    category: 'Task Types',
    keywords: ['ms', 'milestone', 'target', 'deadline', 'payment', 'handover', 'zero days', '0d'],
    shortDefinition: 'A key contractual target date with 0 duration used for tracking project deadlines.',
    simpleExplanation: 'A Milestone is NOT a physical job that takes days. It is a critical target date or milestone flag on the calendar (Duration = 0 Days). It is used to prove to clients, banks, and directors whether major commitments are met on time.',
    siteExample: 'Example: "Foundation Casting Complete", "Building Structure Top-Out Ceremony", "Handover to Client".',
    howSoftwareWorks: [
      'Has exactly 0 days duration.',
      'Renders as a diamond icon on the Gantt chart and appears in the Contractual Milestones tab.',
      'If any predecessor task gets delayed, the milestone date automatically shifts and flags contractual delay penalties.'
    ],
    proTip: 'Tie milestones to your client contract payment billing stages (e.g. "Release 10% mobilization payment upon Substructure Milestone").'
  },
  {
    id: 'inspection',
    term: 'QC (Inspection / Quality Gate)',
    shortBadge: 'QC',
    category: 'Task Types',
    keywords: ['qc', 'inspection', 'quality', 'approval', 'consultant', 'testing', 'sign off'],
    shortDefinition: 'A mandatory engineering inspection or approval gate before the next step is allowed to begin.',
    simpleExplanation: 'In high-rise construction, you are legally forbidden from pouring concrete or closing walls until a structural consultant or municipal engineer inspects the steel reinforcement, cover blocks, and electrical conduit sleeves.',
    siteExample: 'Example: "Consultant Rebar & Conduit Inspection before Slab Pouring".',
    howSoftwareWorks: [
      'Acts as a quality hold-point.',
      'Connected with Finish-to-Start (FS) links to prevent concrete pouring from starting until QC is officially approved and signed off.',
      'Logged with inspector names and approval notes in the audit trail.'
    ],
    proTip: 'Always schedule QC inspections at least 24 hours before concrete batching plant orders to prevent costly truck standby charges.'
  },
  {
    id: 'pre-suc',
    term: 'Pre / Suc (Predecessors & Successors)',
    shortBadge: 'PRE/SUC',
    category: 'Dependencies',
    keywords: ['pre', 'suc', 'predecessor', 'successor', 'sub', 'pub', 'dependency', 'link', 'relationship'],
    shortDefinition: 'Task linking that defines the logical order of site execution (who comes before & after).',
    simpleExplanation: 'Predecessor (PRE) = The task that MUST finish first.\nSuccessor (SUC) = The task waiting for the predecessor before it can start.\nTogether, they form the construction domino chain so the software can recalculate dates automatically.',
    siteExample: 'Example: You cannot paint a wall before plastering, and you cannot plaster before brickwork.\n- Predecessor to Plastering = Brick Masonry\n- Successor to Plastering = Primer & Paint',
    howSoftwareWorks: [
      'The software enforces prerequisite rules: if Task A is delayed by 3 days, Task B automatically moves 3 days forward.',
      'If an engineer tries to click "Start" on a task whose predecessors are incomplete, the software warns them with an override confirmation dialog.',
      'Prevents circular loops (e.g. Task A -> Task B -> Task A) using graph cycle detection.'
    ],
    proTip: 'The "Pre / Suc" column shows numbers like "2 / 1", meaning this task has 2 predecessors it depends on, and 1 successor task waiting behind it.'
  },
  {
    id: 'link-types',
    term: 'FS, SS, FF, SF (Dependency Link Types)',
    shortBadge: 'LINKS',
    category: 'Dependencies',
    keywords: ['fs', 'ss', 'ff', 'sf', 'link', 'dependency type', 'finish to start', 'start to start'],
    shortDefinition: 'The 4 mathematical rules that connect tasks together in a project schedule.',
    simpleExplanation: '1. FS (Finish-to-Start): Most common (95%). Task B starts ONLY after Task A finishes completely.\n2. SS (Start-to-Start): Fast-tracking. Task B can start at the same time Task A starts (parallel execution).\n3. FF (Finish-to-Finish): Task B cannot finish until Task A finishes.\n4. SF (Start-to-Finish): Rare. Task B cannot finish until Task A starts.',
    siteExample: '- FS Example: Complete Column Rebar -> Then start Column Shuttering.\n- SS Example: Start Electrical Conduit Sleeves at the same time Beam Shuttering starts (with 1-day lead).\n- FF Example: Electrical wiring and false ceiling framing must finish together.',
    howSoftwareWorks: [
      'Calculates exact calendar start dates for all downstream activities based on the selected relationship.',
      'Allows adding Lag (e.g., FS + 7 days for concrete curing).',
      'Used by the Recovery Plan simulator to switch FS links to SS for schedule acceleration.'
    ],
    proTip: 'Use Start-to-Start (SS) with a 2-day lag when you are behind schedule to fast-track trades without risking site safety.'
  },
  {
    id: 'lag',
    term: 'Lag (+Days Waiting Time)',
    shortBadge: 'LAG',
    category: 'Dependencies',
    keywords: ['lag', 'curing', 'drying', 'waiting', 'lead', 'gap', 'delay'],
    shortDefinition: 'An intentional waiting or curing delay between two linked tasks.',
    simpleExplanation: 'In construction, some tasks need waiting time where no workers are active, but physical chemical processes must happen—such as concrete curing to reach 28-day compressive strength or plaster drying before primer paint.',
    siteExample: 'Example: "Cast 2nd Floor Slab" -> [Lag: +7 Days Curing] -> "Remove Props & Start Masonry".',
    howSoftwareWorks: [
      'Adds calendar days between the finish of the predecessor and the start of the successor without adding labor costs.',
      'Prevents false scheduling where masonry is mistakenly scheduled the morning after a fresh concrete pour.'
    ],
    proTip: 'Never set Lag to 0 between concrete pouring and heavy masonry loading; building codes mandate curing periods.'
  },
  {
    id: 'forecast-finish',
    term: 'Forecast Finish (Live Reality Date)',
    shortBadge: 'FORECAST',
    category: 'Calculations',
    keywords: ['forecast', 'forecast finish', 'estimated completion', 'finish date', 'projected finish', 'variance'],
    shortDefinition: 'The live calculated completion date based on actual site execution speed.',
    simpleExplanation: 'Planned Finish is what you promised on paper months ago. Forecast Finish is reality: it looks at actual site start dates, recorded daily progress percentages, and remaining work to forecast when the activity will ACTUALLY finish.',
    siteExample: 'Planned Finish: 14 Apr 2026.\nSite was delayed by rain for 3 days.\nForecast Finish automatically recalculates to: 17 Apr 2026 (+3d).',
    howSoftwareWorks: [
      'Calculated as: Forecast Date = (Actual Date or Today) + (Remaining Work / Daily Production Rate).',
      'Highlights in RED with a badge (+4d) if running late.',
      'Highlights in GREEN (-2d) if work finished early.',
      'Cascades downstream to show exact impact on the final project handover date.'
    ],
    proTip: 'Review your Forecast Finish every Monday morning with subcontractors to catch small 2-day delays before they turn into 2-month crises.'
  },
  {
    id: 'float',
    term: 'Float / Slack (Buffer Safety Days)',
    shortBadge: 'FLOAT',
    category: 'Calculations',
    keywords: ['float', 'slack', 'total float', 'free float', 'buffer', 'cushion', 'flexibility'],
    shortDefinition: 'The number of days an activity can be delayed without pushing the project completion deadline.',
    simpleExplanation: 'Float is your "safety cushion" or breathing room. If a task has 6 days of Float, it means labor can be delayed or stopped for 6 days and the project will STILL finish on time. If a task has 0 Float, even a 1-day delay pushes the whole building deadline!',
    siteExample: 'Example: Installing boundary wall fence has 30 days of Float. It doesn\'t matter if it finishes in March or April—the main tower opening in December won\'t be affected.',
    howSoftwareWorks: [
      'Calculated via Critical Path Method (CPM): Total Float = Late Start - Early Start.',
      'Float = 0 days: Critical activity (Flame icon, dark green border).',
      'Float > 0 days: Non-critical activity with flexible scheduling room.'
    ],
    proTip: 'When labor shortages strike, pull workers from high-float tasks (like landscaping) and move them to zero-float critical tasks (like slab shuttering).'
  },
  {
    id: 'critical-path',
    term: 'Critical Path (CPM / Zero Float Chain)',
    shortBadge: 'CPM',
    category: 'Schedule Health',
    keywords: ['critical', 'critical path', 'cpm', 'bottleneck', 'deadline driver', 'zero float', 'flame'],
    shortDefinition: 'The longest unbroken chain of tasks with zero float that dictates the final project completion date.',
    simpleExplanation: 'The Critical Path is the master backbone of your project. Every single task on this path has 0 days of float. A 1-day delay on ANY critical path activity causes a 1-day delay to the ENTIRE building delivery.',
    siteExample: 'Excavation -> Foundation Raft -> G.F Columns -> 1st Floor Slab -> 2nd Floor Slab... This chain is the Critical Path. Painting or gardening is not.',
    howSoftwareWorks: [
      'Tasks on the critical path are marked with a dark green border and flame icon.',
      'The top header Schedule Health card monitors critical path delay directly.',
      'The "Critical Path" view filters out all distraction tasks so project directors see only the bottleneck chain.'
    ],
    proTip: 'Never allow a subcontractor on the critical path to take unauthorized leave; daily monitoring is mandatory.'
  },
  {
    id: 'wbs',
    term: 'WBS (Work Breakdown Structure)',
    shortBadge: 'WBS',
    category: 'Task Types',
    keywords: ['wbs', 'hierarchy', 'tree', 'code', 'structure', 'breakdown', 'levels'],
    shortDefinition: 'The hierarchical breakdown of a project into phases, floors, systems, and individual tasks.',
    simpleExplanation: 'WBS organizes a massive multi-million dollar tower into clean, manageable levels with codes like 1.0, 1.1, 1.1.1:\n- Level 0: Whole Project\n- Level 1: Phase (e.g. Substructure, Superstructure, MEP)\n- Level 2: Floor / Location (e.g. 1st Floor, 2nd Floor)\n- Level 3: Individual Task (e.g. Shuttering, Concrete Pour)',
    siteExample: 'WBS 2.1: 1st Floor RCC\n- WBS 2.1.1: Column Reinforcement\n- WBS 2.1.2: Beam & Slab Shuttering\n- WBS 2.1.3: Concrete Pouring',
    howSoftwareWorks: [
      'Renders the table as an interactive, expandable/collapsible tree.',
      'Calculates parent summaries dynamically.',
      'Search filters filter through codes, floor names, and activity descriptions.'
    ],
    proTip: 'Use consistent WBS numbering across all your projects so estimators, site engineers, and accountants speak the same language.'
  },
  {
    id: 'boq',
    term: 'BOQ (Bill of Quantities / Daily Output)',
    shortBadge: 'BOQ',
    category: 'Site Execution',
    keywords: ['boq', 'quantity', 'output', 'daily progress', 'sqm', 'cum', 'metric'],
    shortDefinition: 'Physical units of work executed on site (e.g., cubic meters of concrete, sq.m of plaster).',
    simpleExplanation: 'Construction is not measured in vague feelings—it is measured in physical quantities! BOQ tracking records exactly how many cubic meters of concrete were poured today, how many bricks were laid, and compares it to the total target.',
    siteExample: 'Total Target: 120 cu.m of concrete.\nToday\'s pour: 40 cu.m.\nProgress: 33.3% complete with 80 cu.m remaining.',
    howSoftwareWorks: [
      'In the "Record Daily Progress" modal, entering today\'s completed quantity auto-calculates the new task percentage.',
      'Logs labor counts and materials consumed.',
      'Preserves an immutable audit history with date, supervisor name, and site notes.'
    ],
    proTip: 'Daily BOQ entries give you legal evidence in case a client or subcontractor disputes billing quantities.'
  },
  {
    id: 'recovery-plan',
    term: 'Recovery Plan (Fast-Tracking / Crashing)',
    shortBadge: 'RECOVERY',
    category: 'Schedule Health',
    keywords: ['recovery', 'recovery plan', 'crashing', 'fast tracking', 'catch up', 'schedule compression'],
    shortDefinition: 'An actionable strategy to pull back a delayed schedule through parallel work or extra shifts.',
    simpleExplanation: 'When rain or material delays push your project 15 days behind, a Recovery Plan shows you how to catch up without moving the final handover date:\n1. Fast-Tracking: Running tasks in parallel (e.g. start masonry while upper floor concrete cures).\n2. Schedule Crashing: Adding second shifts, overtime, or extra formwork sets.',
    siteExample: 'Instead of waiting for the full 7th floor slab to cure before starting electrical piping, you start conduit work in the completed south half on Day 3 (parallel execution).',
    howSoftwareWorks: [
      'The "Recovery Plan" drawer identifies the exact bottleneck tasks causing the delay.',
      'Simulates different fast-tracking scenarios (e.g. converting Finish-to-Start to Start-to-Start).',
      'Provides a 1-click button to apply the recovery schedule directly to the master project plan.'
    ],
    proTip: 'Always check if the recovery plan increases site safety risks or congestion before adding night shift crews.'
  },
  {
    id: 'audit-log',
    term: 'Audit Log & Daily Site Register',
    shortBadge: 'AUDIT',
    category: 'Site Execution',
    keywords: ['audit', 'log', 'history', 'daily report', 'tamper proof', 'record', 'supervision'],
    shortDefinition: 'A permanent historical timeline of all daily site entries, worker counts, and approvals.',
    simpleExplanation: 'Every time an engineer records progress, starts an activity, or logs a site delay reason (like weather or power cut), it is saved in a permanent chronological audit log with timestamp and username.',
    siteExample: 'Log Entry on 14 Feb 2026: "Poured 45 cu.m slab concrete. 18 workers on site. Delay note: 2 hours rain delay in afternoon. Logged by Tariq Engineer".',
    howSoftwareWorks: [
      'Accessible in the Task Details Drawer under the "Daily Progress" and "Audit Log" tabs.',
      'Preserves original entries for contract dispute resolution and progress claims.',
      'Tracks variances between initial plans and actual field performance.'
    ],
    proTip: 'Audit logs protect contractors from unfair liquidated damage penalties by documenting third-party delays (e.g. municipal water cuts or design drawing delays).'
  }
];
