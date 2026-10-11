'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  Check, 
  AlertCircle,
  Tag,
  Building,
  User,
  ListTree,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { ProjectFile, FileCategory, FileType, FileStatus } from '@/lib/construction-planning/types';
import { 
  uploadFileToStorage, 
  createProjectFileRecord, 
  fetchAvailableProjects, 
  ProjectOption 
} from '@/lib/supabase/project-files';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  userEmail?: string;
  onFileUploaded: (file: ProjectFile) => void;
}

const CATEGORIES: FileCategory[] = [
  'Site photographs and reports',
  'Architectural drawings',
  'Structural and RCC drawings',
  'MEP drawings',
  'BOQs and cost estimates',
  'Contracts and agreements',
  'Bills, invoices and payment records',
  'Quotations and purchase orders',
  'Legal and statutory documents',
  'Meeting minutes and correspondence',
  'Quality, safety and handover documents',
  'Project information',
];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  projectId = 'f0e510da-9530-468f-bb09-59920070d55e',
  projectCode,
  projectName,
  userEmail,
  onFileUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projects list for foreign key linking
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId);

  // Required / Primary Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FileCategory>('Site photographs and reports');

  // Toggle for Optional advanced links
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Optional Fields
  const [documentNo, setDocumentNo] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [status, setStatus] = useState<FileStatus>('approved');
  const [buildingFloor, setBuildingFloor] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [taskCode, setTaskCode] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available projects on mount
  useEffect(() => {
    async function loadProjects() {
      const projs = await fetchAvailableProjects();
      setAvailableProjects(projs);
      if (projectId) {
        setSelectedProjectId(projectId);
      } else if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
      }
    }
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  // Auto pick title and category from selected file name
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);

    // 1. Auto-pick clean document title from file/image name
    const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const autoTitle = rawName
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    setTitle(autoTitle);

    // 2. Auto-detect category from file extension or keywords
    const lowerName = file.name.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) {
      setCategory('Site photographs and reports');
    } else if (lowerName.includes('arch') || lowerName.includes('floor') || lowerName.includes('plan')) {
      setCategory('Architectural drawings');
    } else if (lowerName.includes('rcc') || lowerName.includes('struct') || lowerName.includes('rebar')) {
      setCategory('Structural and RCC drawings');
    } else if (lowerName.includes('boq') || lowerName.includes('estimate') || ext === 'xlsx' || ext === 'xls') {
      setCategory('BOQs and cost estimates');
    } else if (lowerName.includes('bill') || lowerName.includes('invoice') || lowerName.includes('tax')) {
      setCategory('Bills, invoices and payment records');
    } else if (lowerName.includes('contract') || lowerName.includes('agreement')) {
      setCategory('Contracts and agreements');
    } else if (lowerName.includes('test') || lowerName.includes('cube') || lowerName.includes('cert')) {
      setCategory('Quality, safety and handover documents');
    }

    // 3. Auto-generate optional document code if blank
    if (!documentNo) {
      const prefix = category.substring(0, 3).toUpperCase();
      const randNum = Math.floor(100 + Math.random() * 900);
      setDocumentNo(`DOC-${prefix}-${randNum}`);
    }
  };

  const detectFileType = (file: File): FileType => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'spreadsheet';
    if (['dwg', 'dxf', 'cad'].includes(ext || '')) return 'dwg';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) return 'document';
    return 'other';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file or image to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a document title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const detectedType = detectFileType(selectedFile);
      const tags = tagsInput
        .split(',')
        .map(t => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean);

      let publicUrl = '';
      let filePath = '';

      try {
        const uploadResult = await uploadFileToStorage(selectedFile, selectedProjectId || 'general');
        publicUrl = uploadResult.publicUrl;
        filePath = uploadResult.filePath;
      } catch (uploadErr) {
        console.warn('Storage bucket upload fallback:', uploadErr);
        publicUrl = URL.createObjectURL(selectedFile);
      }

      // Auto-fallback for documentNo if empty
      const finalDocNo = documentNo.trim() || `DOC-${category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      // Find matching project code
      const currentProj = availableProjects.find(p => p.id === selectedProjectId);
      const finalProjectCode = currentProj ? `SITE-${currentProj.serial_no}` : (projectCode || 'SITE-1');

      const newRecord = await createProjectFileRecord({
        project_id: selectedProjectId,
        project_code: finalProjectCode,
        document_no: finalDocNo,
        title: title.trim(),
        file_name: selectedFile.name,
        description: description.trim() || undefined,
        category,
        file_type: detectedType,
        file_size: selectedFile.size,
        file_url: filePath || publicUrl,
        storage_path: filePath || undefined,
        uploaded_by: userEmail || 'admin@gmail.com',
        version: version.trim() || 'v1.0',
        status,
        tags,
        building_floor: buildingFloor.trim() || undefined,
        contractor_name: contractorName.trim() || undefined,
        task_code: taskCode.trim() || undefined,
        is_starred: false,
      });

      if (newRecord) {
        onFileUploaded(newRecord);
        onClose();
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Failed to save document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProjectName = availableProjects.find(p => p.id === selectedProjectId)?.name || projectName || 'Noori Crust Site';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Upload Project Document</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Site: <strong className="text-purple-700">{activeProjectName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Project Selector (Foreign Key) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Project Site *</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 cursor-pointer"
            >
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  Site #{p.serial_no} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Drag & Drop File / Image Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select or Drop File / Photo *
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-purple-500 bg-purple-50/40' 
                  : selectedFile 
                    ? 'border-emerald-400 bg-emerald-50/20' 
                    : 'border-slate-200 hover:border-purple-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to pick another file
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-7 h-7 mx-auto text-purple-600 mb-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to browse or drop document / site photo
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Auto-picks title from file name • PDF, JPG, PNG, Excel, Word (up to 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Document Title (Auto-picked from file name, user can edit) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Document Title *
              </label>
              {selectedFile && (
                <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto-picked from file name (Editable)
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ground Floor RCC Layout Plan"
              required
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all font-medium text-slate-900"
            />
          </div>

          {/* 4. Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Optional Advanced Details Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span>⚙️ Additional Details & Entity Links (Optional)</span>
              {showOptionalFields ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showOptionalFields && (
              <div className="p-3.5 mt-2 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-in fade-in duration-150">
                
                {/* Document Number / Code */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Document Code / Reference (Optional - auto-generated if blank)
                  </label>
                  <input
                    type="text"
                    value={documentNo}
                    onChange={(e) => setDocumentNo(e.target.value)}
                    placeholder="e.g. DOC-ARC-101"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Building / Floor Link & Contractor / Vendor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Building / Floor Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={buildingFloor}
                      onChange={(e) => setBuildingFloor(e.target.value)}
                      placeholder="e.g. 2nd Floor, Basement 1"
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Contractor / Vendor (Optional)
                    </label>
                    <input
                      type="text"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      placeholder="e.g. Al-Buraq Civil Works"
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Linked WBS Task Code & Revision */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Linked WBS Task Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={taskCode}
                      onChange={(e) => setTaskCode(e.target.value)}
                      placeholder="e.g. wp-1 (Substructure)"
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Revision Version (Optional)
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="v1.0"
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tags (Optional - comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="slab, rcc, foundation, certified"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Notes / Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Description & Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter any specific scope notes or details..."
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving to Vault...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Save Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
