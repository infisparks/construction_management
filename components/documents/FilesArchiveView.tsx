'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderKanban, 
  Folder,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  HardHat,
  Camera,
  Search, 
  Upload, 
  Filter, 
  Grid, 
  List, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode, 
  Download, 
  Eye, 
  Trash2, 
  Star, 
  MoreVertical, 
  Building2, 
  Calendar, 
  User, 
  Tag, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  Layers,
  Sparkles,
  RefreshCw,
  FolderTree,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Link2,
  RotateCcw,
  AlertTriangle,
  Archive,
  Undo2,
  X,
  MessageCircle,
  Phone
} from 'lucide-react';
import { ProjectInfo, ProjectFile, FileCategory, FileType } from '@/lib/construction-planning/types';
import { 
  fetchProjectFiles, 
  softDeleteProjectFile,
  restoreProjectFile,
  permanentDeleteProjectFile,
  emptyRecycleBin,
  toggleStarProjectFile,
  fetchAvailableProjects,
  ProjectOption,
  resolveFileUrl
} from '@/lib/supabase/project-files';
import { UploadDocumentModal } from './UploadDocumentModal';
import { FilePreviewModal } from './FilePreviewModal';
import { WhatsAppShareModal, WhatsAppSharePayload } from '@/components/whatsapp/WhatsAppShareModal';
import { WhatsAppContactsManagerModal } from '@/components/whatsapp/WhatsAppContactsManagerModal';
import {
  fetchDropdownCategory,
  DEFAULT_DOCUMENT_CATEGORIES
} from '@/lib/supabase/category-services';
import { 
  DateFilterControl, 
  DateFilterState, 
  DEFAULT_DATE_FILTER, 
  matchesDateFilter, 
  isDateFilterActive 
} from '@/components/common/DateFilterControl';

interface FilesArchiveViewProps {
  project: ProjectInfo;
  projectId?: string;
  userEmail?: string;
  onOpenSitesManager?: () => void;
  initialCategory?: FileCategory | 'all';
  onCategoryChange?: (category: FileCategory | 'all') => void;
}

const BASE_CATEGORIES: { label: string; value: FileCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Architectural Drawings', value: 'Architectural drawings' },
  { label: 'Structural & RCC Drawings', value: 'Structural and RCC drawings' },
  { label: 'MEP Drawings', value: 'MEP drawings' },
  { label: 'Contracts & Agreements', value: 'Contracts and agreements' },
  { label: 'Legal & Statutory', value: 'Legal and statutory documents' },
  { label: 'BOQs & Estimates', value: 'BOQs and cost estimates' },
  { label: 'Quotations & POs', value: 'Quotations and purchase orders' },
  { label: 'Invoices & Bills', value: 'Bills, invoices and payment records' },
  { label: 'Site Photographs', value: 'Site photographs and reports' },
  { label: 'Meeting Minutes (MoM)', value: 'Meeting minutes and correspondence' },
  { label: 'Quality & Handover', value: 'Quality, safety and handover documents' },
  { label: 'Project Info', value: 'Project information' },
];

export const FilesArchiveView: React.FC<FilesArchiveViewProps> = ({
  project,
  projectId = 'f0e510da-9530-468f-bb09-59920070d55e',
  userEmail,
  onOpenSitesManager,
  initialCategory = 'all',
  onCategoryChange,
}) => {
  // Main tab: Active Vault vs Recycle Bin
  const [activeTab, setActiveTab] = useState<'vault' | 'bin'>('vault');

  const [activeFiles, setActiveFiles] = useState<ProjectFile[]>([]);
  const [deletedFiles, setDeletedFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Available Projects (Foreign Keys)
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>(projectId || 'all');

  // Dynamic Categories from Supabase category table
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(DEFAULT_DOCUMENT_CATEGORIES);

  useEffect(() => {
    fetchDropdownCategory('document_category', DEFAULT_DOCUMENT_CATEGORIES).then((cats) => {
      if (cats && cats.length > 0) {
        setDynamicCategories(cats);
      }
    });
  }, []);

  const categoryOptions = useMemo(() => {
    const list: { label: string; value: FileCategory | 'all' }[] = [
      { label: 'All Categories', value: 'all' }
    ];
    const seen = new Set<string>(['all']);

    BASE_CATEGORIES.forEach(c => {
      if (c.value !== 'all') {
        list.push(c);
        seen.add(c.value);
      }
    });

    dynamicCategories.forEach(cat => {
      if (!seen.has(cat)) {
        list.push({ label: cat, value: cat as FileCategory });
        seen.add(cat);
      }
    });

    activeFiles.forEach(f => {
      if (f.category && !seen.has(f.category)) {
        list.push({ label: f.category, value: f.category as FileCategory });
        seen.add(f.category);
      }
    });

    return list;
  }, [dynamicCategories, activeFiles]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>(initialCategory || 'all');
  const [selectedFileType, setSelectedFileType] = useState<FileType | 'all'>('all');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterState>(DEFAULT_DATE_FILTER);

  // Default to list / table format per user request
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'folder'>('table');
  const [activeFolderCategory, setActiveFolderCategory] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [folderFileType, setFolderFileType] = useState<FileType | 'all'>('all');

  // Sync selectedCategory whenever initialCategory prop changes from sidebar navigation
  useEffect(() => {
    if (initialCategory !== undefined) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleCategorySelect = (cat: FileCategory | 'all') => {
    setSelectedCategory(cat);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // WhatsApp Share & Contacts
  const [isWhatsAppShareOpen, setIsWhatsAppShareOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppSharePayload | null>(null);
  const [isContactsManagerOpen, setIsContactsManagerOpen] = useState(false);

  const handleShareToWhatsApp = (file: ProjectFile) => {
    const fullUrl = file.file_url ? resolveFileUrl(file.file_url) : '';
    setWhatsAppPayload({
      title: file.title,
      documentNo: file.document_no,
      category: file.category,
      projectName: project.name,
      mediaUrl: fullUrl,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      customSummary: file.description || undefined,
    });
    setIsWhatsAppShareOpen(true);
  };

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info'; undoAction?: () => void } | null>(null);

  // Active Dropdown Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Load available projects
  useEffect(() => {
    async function loadProjectsList() {
      const projs = await fetchAvailableProjects();
      setAvailableProjects(projs);
    }
    loadProjectsList();
  }, []);

  // Sync active project if prop changes
  useEffect(() => {
    if (projectId) {
      setProjectFilter(projectId);
    }
  }, [projectId]);

  // Load active and deleted files from Supabase
  const loadAllFiles = async () => {
    setIsLoading(true);
    try {
      const targetProj = projectFilter === 'all' ? undefined : projectFilter;
      const [actives, deleteds] = await Promise.all([
        fetchProjectFiles(targetProj, false),
        fetchProjectFiles(targetProj, true),
      ]);
      setActiveFiles(actives);
      setDeletedFiles(deleteds);
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllFiles();
  }, [projectFilter]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Star Toggle
  const handleToggleStar = async (id: string, isStarred: boolean) => {
    setActiveFiles(prev => prev.map(f => f.id === id ? { ...f, is_starred: isStarred } : f));
    await toggleStarProjectFile(id, isStarred);
  };

  // Move to Recycle Bin (Soft Delete)
  const handleSoftDelete = async (file: ProjectFile) => {
    setActiveFiles(prev => prev.filter(f => f.id !== file.id));
    setDeletedFiles(prev => [{ ...file, is_deleted: true, deleted_at: new Date().toISOString() }, ...prev]);
    setActiveMenuId(null);

    setToastMessage({
      text: `Moved "${file.title}" to Recycle Bin`,
      type: 'info',
      undoAction: () => handleRestoreFile(file),
    });

    try {
      await softDeleteProjectFile(file.id);
    } catch (err) {
      console.error('Failed to move to bin:', err);
      loadAllFiles();
    }
  };

  // Restore from Recycle Bin
  const handleRestoreFile = async (file: ProjectFile) => {
    setDeletedFiles(prev => prev.filter(f => f.id !== file.id));
    setActiveFiles(prev => [{ ...file, is_deleted: false, deleted_at: undefined }, ...prev]);

    setToastMessage({
      text: `Restored "${file.title}" back to project vault!`,
      type: 'success',
    });

    try {
      await restoreProjectFile(file.id);
    } catch (err) {
      console.error('Failed to restore file:', err);
      loadAllFiles();
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (file: ProjectFile) => {
    if (!window.confirm(`Permanently delete "${file.title}"? This action cannot be undone.`)) return;
    setDeletedFiles(prev => prev.filter(f => f.id !== file.id));

    setToastMessage({
      text: `Permanently deleted "${file.title}"`,
      type: 'info',
    });

    try {
      await permanentDeleteProjectFile(file.id, file.storage_path || file.file_url);
    } catch (err) {
      console.error('Failed to purge file:', err);
      loadAllFiles();
    }
  };

  // Empty entire bin
  const handleEmptyBin = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete all ${deletedFiles.length} items in the Recycle Bin?`)) return;
    setDeletedFiles([]);
    setToastMessage({
      text: 'Recycle Bin emptied successfully.',
      type: 'info',
    });
    try {
      await emptyRecycleBin(projectFilter === 'all' ? undefined : projectFilter);
    } catch (err) {
      console.error('Failed to empty bin:', err);
      loadAllFiles();
    }
  };

  // Current list based on activeTab
  const currentList = activeTab === 'vault' ? activeFiles : deletedFiles;

  // Filtered files
  const filteredFiles = useMemo(() => {
    return currentList.filter((file) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = file.title.toLowerCase().includes(query) || file.file_name.toLowerCase().includes(query);
        const matchesDocNo = file.document_no.toLowerCase().includes(query);
        const matchesProject = file.project?.name?.toLowerCase().includes(query) || false;
        const matchesContractor = file.contractor_name?.toLowerCase().includes(query);
        const matchesFloor = file.building_floor?.toLowerCase().includes(query);
        const matchesTags = file.tags?.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDocNo && !matchesProject && !matchesContractor && !matchesFloor && !matchesTags) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && file.category !== selectedCategory) {
        return false;
      }

      // File type filter
      if (selectedFileType !== 'all' && file.file_type !== selectedFileType) {
        return false;
      }

      // Starred filter
      if (onlyStarred && !file.is_starred) {
        return false;
      }

      // Universal Date Filter (Range or Particular Date)
      if (!matchesDateFilter(file.created_at, dateFilter)) {
        return false;
      }

      return true;
    });
  }, [currentList, searchQuery, selectedCategory, selectedFileType, onlyStarred, dateFilter]);

  // Storage calculation for active vault
  const totalStorageBytes = useMemo(() => {
    return activeFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [activeFiles]);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'dwg':
        return <FileCode className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const getCategoryFolderMeta = (categoryName: string) => {
    switch (categoryName) {
      case 'Architectural drawings':
        return { icon: Layers, tag: 'Architectural' };
      case 'Structural and RCC drawings':
        return { icon: HardHat, tag: 'Structural' };
      case 'MEP drawings':
        return { icon: Sparkles, tag: 'MEP Services' };
      case 'Site photographs and reports':
        return { icon: ImageIcon, tag: 'Site Photos' };
      case 'Contracts and agreements':
        return { icon: ShieldCheck, tag: 'Contracts' };
      case 'Legal and statutory documents':
        return { icon: FileText, tag: 'Compliance' };
      case 'BOQs and cost estimates':
        return { icon: FileSpreadsheet, tag: 'Commercial' };
      case 'Quotations and purchase orders':
        return { icon: FileSpreadsheet, tag: 'Procurement' };
      case 'Bills, invoices and payment records':
        return { icon: FileText, tag: 'Finance' };
      case 'Meeting minutes and correspondence':
        return { icon: User, tag: 'Meetings' };
      case 'Quality, safety and handover documents':
        return { icon: ShieldCheck, tag: 'Quality & Safety' };
      case 'Project information':
        return { icon: Building2, tag: 'Project Info' };
      default:
        return { icon: FolderKanban, tag: 'Documents' };
    }
  };

  // Category Folders for Desktop Folder View
  const categoryFolderList = useMemo(() => {
    const cats = categoryOptions.filter(c => c.value !== 'all');

    return cats.map(cat => {
      const allCategoryFiles = currentList.filter(f => {
        if (f.category !== cat.value) return false;
        if (onlyStarred && !f.is_starred) return false;
        if (!matchesDateFilter(f.created_at, dateFilter)) return false;
        return true;
      });

      const matchingFiles = searchQuery.trim()
        ? allCategoryFiles.filter(f => {
            const q = searchQuery.toLowerCase();
            return (
              f.title?.toLowerCase().includes(q) ||
              f.file_name?.toLowerCase().includes(q) ||
              f.document_no?.toLowerCase().includes(q) ||
              f.description?.toLowerCase().includes(q)
            );
          })
        : allCategoryFiles;

      const imageFiles = matchingFiles.filter(f => f.file_type === 'image' && f.file_url);
      const dwgFiles = matchingFiles.filter(f => f.file_type === 'dwg');
      const pdfFiles = matchingFiles.filter(f => f.file_type === 'pdf');
      const spreadsheetFiles = matchingFiles.filter(f => f.file_type === 'spreadsheet');

      const imageThumbnails = imageFiles.slice(0, 4).map(f => resolveFileUrl(f.file_url));
      const totalBytes = matchingFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);

      return {
        ...cat,
        files: matchingFiles,
        fileCount: matchingFiles.length,
        imageCount: imageFiles.length,
        dwgCount: dwgFiles.length,
        pdfCount: pdfFiles.length,
        spreadsheetCount: spreadsheetFiles.length,
        imageThumbnails,
        totalBytes,
      };
    }).filter(folder => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return folder.label.toLowerCase().includes(q) || folder.fileCount > 0;
      }
      return true;
    });
  }, [categoryOptions, currentList, searchQuery, onlyStarred, dateFilter]);

  // Active folder details when a category folder is opened
  const activeFolderData = useMemo(() => {
    if (!activeFolderCategory) return null;
    const folder = categoryFolderList.find(f => f.value === activeFolderCategory);
    if (!folder) {
      const files = currentList.filter(f => f.category === activeFolderCategory);
      const imageFiles = files.filter(f => f.file_type === 'image' && f.file_url);
      return {
        label: activeFolderCategory,
        value: activeFolderCategory,
        files,
        fileCount: files.length,
        imageCount: imageFiles.length,
        dwgCount: files.filter(f => f.file_type === 'dwg').length,
        pdfCount: files.filter(f => f.file_type === 'pdf').length,
        spreadsheetCount: files.filter(f => f.file_type === 'spreadsheet').length,
        imageThumbnails: imageFiles.slice(0, 4).map(f => resolveFileUrl(f.file_url)),
        totalBytes: files.reduce((acc, f) => acc + (f.file_size || 0), 0)
      };
    }
    return folder;
  }, [activeFolderCategory, categoryFolderList, currentList]);

  // Sub-filter inside open folder
  const activeFolderFilteredFiles = useMemo(() => {
    if (!activeFolderData) return [];
    let files = activeFolderData.files;

    if (folderSearchQuery.trim()) {
      const q = folderSearchQuery.toLowerCase();
      files = files.filter(f => 
        f.title?.toLowerCase().includes(q) ||
        f.file_name?.toLowerCase().includes(q) ||
        f.document_no?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
      );
    }

    if (folderFileType !== 'all') {
      files = files.filter(f => f.file_type === folderFileType);
    }

    return files;
  }, [activeFolderData, folderSearchQuery, folderFileType]);

  const handleDownloadFile = (file: ProjectFile) => {
    const targetUrl = resolveFileUrl(file.file_url);
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([`Document No: ${file.document_no}\nTitle: ${file.title}\nCategory: ${file.category}\nProject: ${file.project?.name || project.name}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.file_name || file.document_no}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const activeProjectDef = availableProjects.find(p => p.id === projectFilter);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F5F6F8] min-h-[calc(100vh-64px)] pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
          {toastMessage.undoAction && (
            <button
              type="button"
              onClick={toastMessage.undoAction}
              className="px-2 py-0.5 rounded bg-[#653ef1] hover:bg-[#592be8] text-white text-[11px] font-bold cursor-pointer"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Stats Section */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-6 w-full">
        <div className="w-full">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#653ef1]" />
                <span className="text-xs font-bold text-[#653ef1] uppercase tracking-wider">
                  Module 3 • Project Documents Vault
                </span>
                
                {/* Active Filter Project Pill */}
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/25">
                  <Link2 className="w-3 h-3 text-[#653ef1]" />
                  <span>
                    {activeProjectDef ? `Site #${activeProjectDef.serial_no} — ${activeProjectDef.name}` : 'All Projects (Multi-Site)'}
                  </span>
                </div>
              </div>

              <h1 className="text-22px md:text-24px font-bold text-slate-900 tracking-tight">
                Project Files & Documents Archive
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Centralized document repository with instant in-app preview, foreign key isolation, and recycle bin restore.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadAllFiles}
                className="p-2.5 text-slate-500 hover:text-[#653ef1] hover:bg-[#653ef1]/10 rounded-xl border border-slate-200/90 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Refresh Documents"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#653ef1]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsContactsManagerOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:bg-emerald-50/40 hover:text-emerald-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Manage WhatsApp Directory & Saved Contacts"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
                <span className="hidden sm:inline">WhatsApp Contacts</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] transition-all shadow-sm shadow-[#653ef1]/25 hover:shadow-md hover:shadow-[#653ef1]/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Upload className="w-4 h-4 stroke-[2.2]" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Documents</span>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{activeFiles.length}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Vault Storage</span>
              <div className="text-xl font-bold text-[#653ef1] font-mono mt-1 tabular-nums">
                {formatFileSize(totalStorageBytes)}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Drawings & Technical</span>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {activeFiles.filter(f => f.category.includes('drawings')).length}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">In Recycle Bin</span>
              <div className={`text-xl font-bold mt-1 tabular-nums ${deletedFiles.length > 0 ? 'text-rose-600 font-mono' : 'text-slate-400'}`}>
                {deletedFiles.length} files
              </div>
            </div>
          </div>

          {/* Vault vs Recycle Bin Tabs Switcher */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
            <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('vault')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'vault'
                    ? 'bg-white text-[#653ef1] shadow-2xs border border-[#653ef1]/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderKanban className={`w-3.5 h-3.5 ${activeTab === 'vault' ? 'text-[#653ef1]' : 'text-slate-400'}`} />
                <span>Active Vault ({activeFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bin')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'bin'
                    ? 'bg-white text-rose-600 shadow-2xs border border-rose-200/60 font-bold'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                <Trash2 className={`w-3.5 h-3.5 ${activeTab === 'bin' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Recycle Bin ({deletedFiles.length})</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area - 100% Full Width */}
      <div className="w-full px-4 sm:px-6 py-5 space-y-4">
        
        {/* Recycle Bin Notice Banner when on Bin Tab */}
        {activeTab === 'bin' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-900">Recycle Bin (Deleted Documents)</h3>
                <p className="text-[11px] text-rose-700">
                  Files deleted by the owner are saved here. You can click "Restore" to recover any file back to its project vault.
                </p>
              </div>
            </div>

            {deletedFiles.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyBin}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                Empty Recycle Bin
              </button>
            )}
          </div>
        )}

        {/* Controls: Search, Project Foreign Key Filter, Category & View Toggle Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* 1. Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name, doc code, project, tags..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 2. Project Foreign Key Selector Filter */}
          <div className="shrink-0">
            <div className="flex items-center gap-1.5 border border-[#653ef1]/20 bg-[#653ef1]/5 rounded-lg px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-[#653ef1] shrink-0" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-xs bg-transparent font-bold text-[#653ef1] focus:outline-none cursor-pointer"
                title="Filter documents by construction project foreign key"
              >
                <option value="all">🏢 All Projects (Vault)</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    Site #{p.serial_no} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Category Dropdown */}
          <div className="shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategorySelect(e.target.value as FileCategory | 'all')}
              className="w-full md:w-auto text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] cursor-pointer"
            >
              {categoryOptions.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3b. Universal Date Filter: Start & End Date (Range) + Particular Date */}
          <div className="shrink-0">
            <DateFilterControl
              value={dateFilter}
              onChange={setDateFilter}
              label="Upload Date"
            />
          </div>

          {/* 4. File Type Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {(['all', 'pdf', 'image', 'spreadsheet', 'dwg'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedFileType(type)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedFileType === type
                    ? 'bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {type === 'all' ? 'All Types' : type.toUpperCase()}
              </button>
            ))}

            {/* Starred Filter Button */}
            {activeTab === 'vault' && (
              <button
                type="button"
                onClick={() => setOnlyStarred(!onlyStarred)}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                  onlyStarred
                    ? 'bg-amber-50 text-amber-500 border-amber-200'
                    : 'text-slate-400 hover:text-slate-700 border-slate-200'
                }`}
                title="Starred Files Only"
              >
                <Star className={`w-4 h-4 ${onlyStarred ? 'fill-amber-400' : ''}`} />
              </button>
            )}
          </div>

          {/* 5. View Mode Toggle (Folder vs Grid vs Table) */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0 self-end md:self-auto gap-0.5">
            <button
              type="button"
              onClick={() => {
                setViewMode('folder');
                setActiveFolderCategory(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all cursor-pointer text-xs ${
                viewMode === 'folder'
                  ? 'bg-white text-[#653ef1] shadow-2xs font-bold border border-[#653ef1]/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Desktop Folders View"
            >
              <Folder className="w-3.5 h-3.5 text-[#653ef1]" />
              <span className="hidden sm:inline">Folders</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#653ef1] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid Cards View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#653ef1] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-[#653ef1]/20 border-t-[#653ef1] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading files from database...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && viewMode !== 'folder' && filteredFiles.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              {activeTab === 'bin' ? <Trash2 className="w-6 h-6 text-slate-400" /> : <FolderKanban className="w-6 h-6 text-[#653ef1]" />}
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'bin' ? 'Recycle Bin is Empty' : 'No Documents Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'bin' 
                ? 'There are no deleted files in the bin. Any files you delete will be kept here safely so you can restore them.'
                : 'No documents matched the selected filters. Click "+ Upload Document" to add files.'}
            </p>
            {activeTab === 'vault' && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] transition-all shadow-sm shadow-[#653ef1]/25 cursor-pointer mt-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        )}

        {/* 1. GRID CARDS VIEW - Full-Width Multi-Column Grid */}
        {!isLoading && viewMode === 'grid' && filteredFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 w-full">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden group relative ${
                  activeTab === 'bin' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-[#653ef1]/30 hover:shadow-md'
                }`}
              >
                {/* Card Top: Icon, Document No & Actions */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20 block truncate max-w-[130px]">
                          {file.document_no}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate font-mono">
                          {formatFileSize(file.file_size)} • {file.version}
                        </span>
                      </div>
                    </div>

                    {/* Star & Actions Menu for active vault */}
                    {activeTab === 'vault' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(file.id, !file.is_starred)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            file.is_starred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-600'
                          }`}
                          title={file.is_starred ? 'Starred' : 'Star'}
                        >
                          <Star className={`w-3.5 h-3.5 ${file.is_starred ? 'fill-amber-400' : ''}`} />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === file.id && (
                            <div 
                              className="absolute right-0 top-7 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFile(file);
                                  setIsPreviewOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Preview In-App</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadFile(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleShareToWhatsApp(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                                <span>Share on WhatsApp</span>
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={() => handleSoftDelete(file)}
                                className="w-full px-3 py-1.5 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Move to Bin</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Bin Actions: Restore
                      <button
                        type="button"
                        onClick={() => handleRestoreFile(file)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#653ef1]/10 hover:bg-[#653ef1]/20 text-[#653ef1] font-bold text-xs border border-[#653ef1]/20 transition-colors cursor-pointer"
                        title="Restore back to project vault"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>

                  {/* Relational Foreign Key Project Tag */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                      <Building2 className="w-3 h-3 text-[#653ef1] shrink-0" />
                      <span className="truncate">
                        {file.project ? `Site #${file.project.serial_no} • ${file.project.name}` : project.name}
                      </span>
                    </span>
                  </div>

                  {/* Title & Category */}
                  <h4 
                    onClick={() => {
                      setPreviewFile(file);
                      setIsPreviewOpen(true);
                    }}
                    className="text-xs font-bold text-slate-900 group-hover:text-[#653ef1] transition-colors cursor-pointer line-clamp-1 mb-1"
                    title={file.title}
                  >
                    {file.title}
                  </h4>

                  <span className="inline-block text-[10px] font-semibold text-[#653ef1] bg-[#653ef1]/10 border border-[#653ef1]/20 px-2 py-0.5 rounded-md truncate max-w-full">
                    {file.category}
                  </span>

                  {/* Image Preview Thumbnail if Image File */}
                  {file.file_type === 'image' && (
                    <div 
                      onClick={() => {
                        setPreviewFile(file);
                        setIsPreviewOpen(true);
                      }}
                      className="w-full h-36 bg-slate-100 rounded-lg overflow-hidden my-2 relative cursor-pointer border border-slate-200/60 flex items-center justify-center group/img"
                    >
                      <img 
                        src={resolveFileUrl(file.file_url)} 
                        alt={file.title} 
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Description preview */}
                  {file.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {file.description}
                    </p>
                  )}
                </div>

                {/* Card Footer: Metadata Chips & Preview / Restore Actions */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    {file.building_floor && (
                      <span className="truncate font-medium text-slate-600">
                        📍 {file.building_floor}
                      </span>
                    )}
                    {file.contractor_name && !file.building_floor && (
                      <span className="truncate font-medium text-slate-600">
                        👤 {file.contractor_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeTab === 'vault' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewFile(file);
                            setIsPreviewOpen(true);
                          }}
                          className="text-xs font-bold text-[#653ef1] hover:text-[#5022e3] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View In-App</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareToWhatsApp(file)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(file)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestoreFile(file)}
                          className="text-xs font-bold text-[#653ef1] hover:text-[#5022e3] flex items-center gap-1 bg-[#653ef1]/10 hover:bg-[#653ef1]/20 px-2 py-1 rounded-md border border-[#653ef1]/20 cursor-pointer transition-colors"
                          title="Restore back to project vault"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(file)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer p-1"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Purge</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. COMPACT TABLE VIEW */}
        {!isLoading && viewMode === 'table' && filteredFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Doc Code</th>
                    <th className="py-3 px-4">Project (FK)</th>
                    <th className="py-3 px-4">Document Title & File</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Linked Entity</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        setPreviewFile(file);
                        setIsPreviewOpen(true);
                      }}
                    >
                      {/* Doc No */}
                      <td className="py-3 px-4 font-mono font-bold text-[#653ef1]">
                        {file.document_no}
                      </td>

                      {/* Project Foreign Key */}
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20 font-mono">
                          <Building2 className="w-3 h-3 text-[#653ef1]" />
                          <span>{file.project ? `Site #${file.project.serial_no}` : 'Site #1'}</span>
                        </span>
                      </td>

                      {/* Title & File Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            {getFileIcon(file.file_type)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate group-hover:text-[#653ef1] transition-colors">
                              {file.title}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              {file.file_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                          {file.category}
                        </span>
                      </td>

                      {/* Linked Entity */}
                      <td className="py-3 px-4 text-slate-500">
                        {file.building_floor || file.contractor_name || file.task_code || '—'}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {formatFileSize(file.file_size)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full capitalize ${
                          file.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {file.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {activeTab === 'vault' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStar(file.id, !file.is_starred)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                file.is_starred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-600'
                              }`}
                              title="Star"
                            >
                              <Star className={`w-3.5 h-3.5 ${file.is_starred ? 'fill-amber-400' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file)}
                              className="p-1.5 text-slate-400 hover:text-[#653ef1] hover:bg-[#653ef1]/10 rounded-md transition-colors cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareToWhatsApp(file)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSoftDelete(file)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleRestoreFile(file)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#653ef1]/10 hover:bg-[#653ef1]/20 text-[#653ef1] font-bold text-xs border border-[#653ef1]/20 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(file)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Permanently Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. DESKTOP FOLDERS & ALBUMS VIEW */}
        {!isLoading && viewMode === 'folder' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Case A: Root Desktop Folders Grid */}
            {!activeFolderCategory ? (
              <div className="space-y-4">
                {/* Header Information Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#653ef1] flex items-center justify-center font-bold shadow-2xs border border-purple-100 shrink-0">
                      <Folder className="w-5 h-5 fill-[#653ef1]/20" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Desktop Folders & Categories</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20">
                          {categoryFolderList.length} Folders
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Double-click or select any desktop folder below to open and browse photos, blueprints, and files.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end sm:self-auto">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      {currentList.length} Total Files
                    </span>
                    <span className="bg-purple-50 text-[#653ef1] px-2.5 py-1 rounded-lg border border-purple-100 font-mono">
                      {formatFileSize(totalStorageBytes)}
                    </span>
                  </div>
                </div>

                {/* Empty Folders check (e.g. if search query matched 0 folders) */}
                {categoryFolderList.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <Folder className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No Folders Match Search</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No document folders or files match "{searchQuery}". Clear your search or reset filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#653ef1] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {categoryFolderList.map((folder) => {
                      const meta = getCategoryFolderMeta(folder.value);
                      const IconComponent = meta.icon;

                      return (
                        <div
                          key={folder.value}
                          onClick={() => {
                            setActiveFolderCategory(folder.value);
                            setFolderSearchQuery('');
                            setFolderFileType('all');
                          }}
                          className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#653ef1]/50 p-5 shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-between"
                        >
                          {/* Folder Top Glow on hover */}
                          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#653ef1]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Desktop Folder Icon Art with 3D Depth & Paper/Photo Peek */}
                          <div className="relative w-28 h-20 mb-4 mx-auto flex items-center justify-center">
                            {/* Realistic Folder Tab */}
                            <div className="absolute top-0 left-2 w-11 h-4 bg-gradient-to-r from-[#653ef1] to-[#7f5af8] rounded-t-lg shadow-2xs" />

                            {/* Back Folder Body */}
                            <div className="absolute top-2.5 inset-x-0 bottom-0 bg-gradient-to-br from-[#653ef1] via-[#5b32e6] to-[#4c24d4] rounded-2xl shadow-sm" />

                            {/* Paper / Image Sheets Peeking Out */}
                            <div className="absolute top-3.5 inset-x-2.5 h-10 bg-white rounded-t-md shadow-xs border border-white/90 transition-all duration-300 group-hover:-translate-y-3 flex items-center justify-center overflow-hidden">
                              {folder.imageThumbnails.length > 0 ? (
                                <img
                                  src={folder.imageThumbnails[0]}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full p-1.5 flex flex-col justify-center gap-1 bg-gradient-to-b from-slate-50 to-slate-100">
                                  <div className="w-10 h-1 bg-slate-300 rounded-full" />
                                  <div className="w-14 h-1 bg-slate-200 rounded-full" />
                                  <div className="w-8 h-1 bg-[#653ef1]/30 rounded-full" />
                                </div>
                              )}
                            </div>

                            {/* Second Peeking Image thumbnail if multiple images */}
                            {folder.imageThumbnails.length > 1 && (
                              <div className="absolute top-2 inset-x-3.5 h-8 bg-white/90 rounded-t-sm shadow-xs border border-white/80 transition-all duration-300 group-hover:-translate-y-4.5 -rotate-3 overflow-hidden opacity-90 group-hover:opacity-100">
                                <img
                                  src={folder.imageThumbnails[1]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            {/* Front Folder Flap with 3D Depth & Glossy Bevel */}
                            <div className="absolute top-7 inset-x-0 bottom-0 bg-gradient-to-b from-[#7e58f8] via-[#653ef1] to-[#552ee6] rounded-b-2xl rounded-t-md shadow-md transition-all duration-300 group-hover:scale-y-[0.96] flex items-center justify-center border-t border-white/30">
                              {/* Center category icon badge in frosted glass */}
                              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-2xs border border-white/20">
                                <IconComponent className="w-4 h-4 stroke-[2.2]" />
                              </div>
                            </div>

                            {/* File count pill badge */}
                            <span
                              className={`absolute -top-1 -right-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs tabular-nums ${
                                folder.fileCount > 0
                                  ? 'bg-[#653ef1] text-white border-white ring-2 ring-purple-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {folder.fileCount}
                            </span>
                          </div>

                          {/* Folder Info */}
                          <div className="text-center space-y-1 mt-1">
                            <h3
                              className="text-sm font-bold text-slate-900 group-hover:text-[#653ef1] transition-colors line-clamp-1"
                              title={folder.label}
                            >
                              {folder.label}
                            </h3>

                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                              <span>{folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-600">{formatFileSize(folder.totalBytes)}</span>
                            </div>

                            {/* Image previews peek row */}
                            {folder.imageThumbnails.length > 0 && (
                              <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400">Photos:</span>
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {folder.imageThumbnails.slice(0, 3).map((thumb, idx) => (
                                    <img
                                      key={idx}
                                      src={thumb}
                                      alt=""
                                      className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover shadow-2xs"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ))}
                                </div>
                                {folder.imageCount > 3 && (
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    +{folder.imageCount - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Folder Card Footer */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#653ef1] group-hover:text-[#5022e3]">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                              {meta.tag}
                            </span>
                            <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Open Folder</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Case B: Inside Active Category Folder */
              <div className="space-y-4">
                {/* Navigation Bar & Breadcrumb */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveFolderCategory(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#653ef1] hover:bg-purple-50 hover:border-purple-200 transition-all cursor-pointer shadow-2xs group"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>Back to All Folders</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="cursor-pointer hover:text-slate-800" onClick={() => setActiveFolderCategory(null)}>
                        Vault
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-[#653ef1]" />
                        <span>{activeFolderData?.label}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] transition-all shadow-sm shadow-[#653ef1]/25 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Upload to this Folder</span>
                    </button>
                  </div>
                </div>

                {/* Folder Header Banner */}
                <div className="bg-gradient-to-r from-[#653ef1]/10 via-[#653ef1]/5 to-white border border-[#653ef1]/20 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6e46f2] via-[#653ef1] to-[#592be8] text-white flex items-center justify-center font-bold shadow-md shadow-[#653ef1]/25 shrink-0">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {activeFolderData?.label}
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Browse, preview full-resolution images, download blueprints, and manage files stored in this category.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs tabular-nums">
                      {activeFolderFilteredFiles.length} {activeFolderFilteredFiles.length === 1 ? 'document' : 'documents'}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-[#653ef1] shadow-2xs tabular-nums">
                      {formatFileSize(activeFolderData?.totalBytes || 0)}
                    </span>
                  </div>
                </div>

                {/* In-Folder Filter Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder={`Search in ${activeFolderData?.label}...`}
                      className="w-full text-xs pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#653ef1]/20 focus:border-[#653ef1] transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* File Type Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {(['all', 'image', 'dwg', 'pdf', 'spreadsheet'] as const).map((type) => {
                      const count = type === 'all'
                        ? activeFolderData?.fileCount || 0
                        : type === 'image'
                        ? activeFolderData?.imageCount || 0
                        : type === 'dwg'
                        ? activeFolderData?.dwgCount || 0
                        : type === 'pdf'
                        ? activeFolderData?.pdfCount || 0
                        : activeFolderData?.spreadsheetCount || 0;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFolderFileType(type)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            folderFileType === type
                              ? 'bg-[#653ef1] text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <span>{type === 'all' ? 'All Files' : type.toUpperCase()}</span>
                          <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${
                            folderFileType === type ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Files & Photos Display inside Open Folder */}
                {activeFolderFilteredFiles.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#653ef1] flex items-center justify-center mx-auto">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No Documents in this Folder</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {folderSearchQuery.trim()
                        ? `No files match "${folderSearchQuery}" in this folder.`
                        : `This category folder currently has no files uploaded. Click below to add the first document or photo.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] transition-all shadow-sm shadow-[#653ef1]/25 cursor-pointer mt-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload to {activeFolderData?.label}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {activeFolderFilteredFiles.map((file) => {
                      const isImage = file.file_type === 'image' && Boolean(file.file_url);

                      return (
                        <div
                          key={file.id}
                          className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#653ef1]/40 shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group relative"
                        >
                          {/* Image or File Thumbnail Header */}
                          {isImage ? (
                            <div
                              onClick={() => {
                                setPreviewFile(file);
                                setIsPreviewOpen(true);
                              }}
                              className="w-full aspect-[4/3] bg-slate-100 relative overflow-hidden cursor-pointer group/thumb"
                            >
                              <img
                                src={resolveFileUrl(file.file_url)}
                                alt={file.title}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />

                              {/* Gradient vignette overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 opacity-60 group-hover/thumb:opacity-80 transition-opacity" />

                              {/* Top Pills */}
                              <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/50 text-white backdrop-blur-xs border border-white/20">
                                  {file.document_no}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-xs shadow-xs">
                                  {file.status || 'Approved'}
                                </span>
                              </div>

                              {/* Hover Quick Action Buttons */}
                              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/30 backdrop-blur-2xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFile(file);
                                    setIsPreviewOpen(true);
                                  }}
                                  className="w-9 h-9 rounded-xl bg-white text-[#653ef1] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                  title="Fullscreen Preview"
                                >
                                  <Eye className="w-4 h-4 stroke-[2.2]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(file);
                                  }}
                                  className="w-9 h-9 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareToWhatsApp(file);
                                  }}
                                  className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                  title="Send via WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStar(file.id, !file.is_starred);
                                  }}
                                  className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                                    file.is_starred ? 'text-amber-500' : 'text-slate-400'
                                  }`}
                                  title="Favorite"
                                >
                                  <Star className={`w-4 h-4 ${file.is_starred ? 'fill-amber-400' : ''}`} />
                                </button>
                              </div>

                              {/* Bottom caption on image */}
                              <div className="absolute bottom-2 inset-x-2.5 text-white pointer-events-none">
                                <span className="text-xs font-bold block truncate drop-shadow-sm">
                                  {file.title}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Non-image File Header */
                            <div className="p-4 pb-2">
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div className="w-11 h-11 rounded-xl bg-purple-50/80 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                  {getFileIcon(file.file_type)}
                                </div>
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20 truncate">
                                  {file.document_no}
                                </span>
                              </div>

                              <h4
                                onClick={() => {
                                  setPreviewFile(file);
                                  setIsPreviewOpen(true);
                                }}
                                className="text-xs font-bold text-slate-900 group-hover:text-[#653ef1] transition-colors cursor-pointer line-clamp-2 leading-snug"
                                title={file.title}
                              >
                                {file.title}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-mono block truncate mt-0.5">
                                {file.file_name}
                              </span>
                            </div>
                          )}

                          {/* Card Metadata & Actions Footer */}
                          <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                              <span>{formatFileSize(file.file_size)}</span>
                              {file.building_floor && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[90px]">{file.building_floor}</span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFile(file);
                                  setIsPreviewOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-[#653ef1] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="View In-App"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                className="p-1.5 text-slate-500 hover:text-[#653ef1] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleShareToWhatsApp(file)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Share via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              {activeTab === 'vault' ? (
                                <button
                                  type="button"
                                  onClick={() => handleSoftDelete(file)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Move to Recycle Bin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreFile(file)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Restore"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projectId={projectFilter === 'all' ? projectId : projectFilter}
        projectCode={project.code}
        projectName={project.name}
        userEmail={userEmail}
        defaultCategory={(activeFolderCategory as FileCategory) || undefined}
        onFileUploaded={(newFile) => {
          setActiveFiles(prev => [newFile, ...prev]);
          fetchDropdownCategory('document_category', DEFAULT_DOCUMENT_CATEGORIES).then(setDynamicCategories);
        }}
        onSiteCreated={async (newProj) => {
          const projs = await fetchAvailableProjects();
          setAvailableProjects(projs);
          setProjectFilter(newProj.id);
        }}
      />

      {/* File Preview Modal (Direct In-App Viewer) */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
        onToggleStar={handleToggleStar}
        onDeleteFile={(f) => {
          handleSoftDelete(f);
          setIsPreviewOpen(false);
        }}
        onRestoreFile={(f) => {
          handleRestoreFile(f);
          setIsPreviewOpen(false);
        }}
        onShareWhatsApp={handleShareToWhatsApp}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppShareOpen}
        onClose={() => {
          setIsWhatsAppShareOpen(false);
          setWhatsAppPayload(null);
        }}
        payload={whatsAppPayload}
        onSuccessToast={(msg) => {
          setToastMessage({ text: msg, type: 'success' });
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* WhatsApp Contacts Directory Manager Modal */}
      <WhatsAppContactsManagerModal
        isOpen={isContactsManagerOpen}
        onClose={() => setIsContactsManagerOpen(false)}
      />

    </div>
  );
};
