import React, { useEffect, useRef, useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertTriangle, 
  Filter, 
  Layers, 
  Database, 
  FileCheck, 
  Check, 
  X, 
  FileText, 
  ShieldAlert, 
  ChevronRight, 
  ShieldCheck, 
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Lock,
  Info
} from 'lucide-react';
import { BrandGuideline, TerminologyEntry, ApprovedFact, KnowledgeSource, FindingSeverity } from '../../types';
import { api } from '../../services/apiClient';
import { useDemoProfile } from '../../context/DemoProfileContext';

interface BrandIntelligenceViewProps {
  guidelines: BrandGuideline[];
  terminology: TerminologyEntry[];
  facts: ApprovedFact[];
  sources: KnowledgeSource[];
  onDataChanged: () => void;
  focusRecordId?: string | null;
  onFocusHandled?: () => void;
}

type KnowledgeCategory = 'all' | 'guidelines' | 'terminology' | 'facts' | 'sources';
type EntryType = 'guideline' | 'term' | 'fact' | 'source';

export const BrandIntelligenceView: React.FC<BrandIntelligenceViewProps> = ({
  guidelines,
  terminology,
  facts,
  sources,
  onDataChanged,
  focusRecordId,
  onFocusHandled,
}) => {
  const { currentUser, isAdmin } = useDemoProfile();

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<{ type: string; data: any } | null>(null);
  const [recentlyApprovedRecord, setRecentlyApprovedRecord] = useState<{ id: string; type: 'fact' | 'guideline' } | null>(null);
  const focusedKnowledgeRowRef = useRef<HTMLTableRowElement | null>(null);
  
  useEffect(() => {
    if (!focusRecordId) return;
    const approvedFact = facts.find(fact => fact.id === focusRecordId);
    const approvedGuideline = guidelines.find(guideline => guideline.id === focusRecordId);
    if (!approvedFact && !approvedGuideline) return;

    const type = approvedFact ? 'fact' : 'guideline';
    const record = approvedFact || approvedGuideline!;
    setSelectedCategory(type === 'fact' ? 'facts' : 'guidelines');
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedRecord({ type, data: record });
    setRecentlyApprovedRecord({ id: record.id, type });

    const clearHighlight = window.setTimeout(() => setRecentlyApprovedRecord(null), 9000);
    return () => window.clearTimeout(clearHighlight);
  }, [focusRecordId, facts, guidelines]);

  useEffect(() => {
    if (!focusRecordId || !recentlyApprovedRecord || !focusedKnowledgeRowRef.current) return;
    const expectedCategory = recentlyApprovedRecord.type === 'fact' ? 'facts' : 'guidelines';
    if (selectedCategory !== expectedCategory) return;
    const frame = window.requestAnimationFrame(() => {
      focusedKnowledgeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onFocusHandled?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRecordId, selectedCategory, facts.length, guidelines.length, recentlyApprovedRecord, onFocusHandled]);

  // Modals for CRUD
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: string; data: any } | null>(null);
  const [entryType, setEntryType] = useState<EntryType>('guideline');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');
  const [toastIsError, setToastIsError] = useState(false);

  // New Guideline Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<any>('tone_of_voice');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<FindingSeverity>('high');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newProhibitedExample, setNewProhibitedExample] = useState('');
  const [newApprovedExample, setNewApprovedExample] = useState('');
  const [newGuidelineStatus, setNewGuidelineStatus] = useState<BrandGuideline['status']>('active');

  // New Terminology Form State
  const [newPreferredTerm, setNewPreferredTerm] = useState('');
  const [newRestrictedTerm, setNewRestrictedTerm] = useState('');
  const [newTermExplanation, setNewTermExplanation] = useState('');
  const [newTermCategory, setNewTermCategory] = useState<any>('product_naming');
  const [newTermPriority, setNewTermPriority] = useState<NonNullable<TerminologyEntry['priority']>>('medium');
  const [newApprovedAlternative, setNewApprovedAlternative] = useState('');
  const [newTermStatus, setNewTermStatus] = useState<TerminologyEntry['status']>('active');

  // New Fact Form State
  const [newFactTitle, setNewFactTitle] = useState('');
  const [newFactStatement, setNewFactStatement] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<any>('compliance_security');
  const [newFactSource, setNewFactSource] = useState('');
  const [newFactStatus, setNewFactStatus] = useState<ApprovedFact['verificationStatus']>('approved');

  // New Knowledge Source Form State
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceType, setNewSourceType] = useState<KnowledgeSource['type']>('document');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceDescription, setNewSourceDescription] = useState('');
  const [newSourceStatus, setNewSourceStatus] = useState<NonNullable<KnowledgeSource['status']>>('active');

  // Priority styling helper (Requirement 6 & 12)
  const getPriorityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return {
          dot: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Critical',
          rowBorder: 'border-l-rose-500',
        };
      case 'high':
        return {
          dot: 'bg-orange-500',
          badge: 'bg-orange-50 text-orange-700 border-orange-200',
          label: 'High',
          rowBorder: 'border-l-orange-500',
        };
      case 'medium':
        return {
          dot: 'bg-amber-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Medium',
          rowBorder: 'border-l-amber-500',
        };
      case 'low':
        return {
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Low',
          rowBorder: 'border-l-emerald-500',
        };
      case 'informational':
      default:
        return { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Informational', rowBorder: 'border-l-slate-300' };
    }
  };

  // Resource status styling helper (Requirement 6 & 12)
  const getResourceStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'verified':
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending_review':
      case 'provisional':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'needs_revalidation':
      case 'draft':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'archived':
      case 'deprecated':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'needs_review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };
  const getSourceStatusStyle = (status: string) => status === 'under_review'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : getResourceStatusStyle(status);
  const getStatusLabel = (status: string) => ({ verified: 'Approved', approved: 'Approved', provisional: 'Pending Review', pending_review: 'Pending Review', needs_revalidation: 'Under Review', under_review: 'Under Review', rejected: 'Rejected' } as Record<string, string>)[status] || status.replace(/_/g, ' ');

  const handleStartEdit = (type: string, data: any) => {
    if (!isAdmin) {
      alert('Administrator permissions required to edit brand knowledge.');
      return;
    }
    resetForm();
    setEditingItem({ type, data });
    setEntryType(type as EntryType);
    if (type === 'guideline') {
      setNewTitle(data.title);
      setNewCategory(data.category);
      setNewDescription(data.description);
      setNewSeverity(data.severity);
      setNewSourceRef(data.sourceReference);
      setNewGuidelineStatus(data.status);
      setNewProhibitedExample(data.examples?.prohibited || '');
      setNewApprovedExample(data.examples?.approved || '');
    } else if (type === 'term') {
      setNewPreferredTerm(data.preferredTerm);
      setNewRestrictedTerm(data.restrictedTerm);
      setNewApprovedAlternative(data.approvedAlternative);
      setNewTermExplanation(data.explanation);
      setNewTermCategory(data.category);
      setNewTermPriority(data.priority || ((data.category === 'product_naming' || data.category === 'capability_claim') ? 'critical' : 'high'));
      setNewTermStatus(data.status);
    } else if (type === 'fact') {
      setNewFactTitle(data.title);
      setNewFactStatement(data.statement);
      setNewFactCategory(data.category);
      setNewFactSource(data.source);
      setNewFactStatus(data.verificationStatus);
    } else if (type === 'source') {
      setNewSourceTitle(data.title);
      setNewSourceType(data.type);
      setNewSourceUrl(data.url || '');
      setNewSourceDescription(data.description);
      setNewSourceStatus(data.status || 'active');
    }
    setShowAddModal(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isSaving) return;
    setSaveError('');
    const type = (editingItem?.type || entryType) as EntryType;
    const requiredValues: Record<EntryType, string[]> = {
      guideline: [newTitle, newDescription, newSourceRef],
      term: [newPreferredTerm, newApprovedAlternative, newRestrictedTerm, newTermExplanation],
      fact: [newFactTitle, newFactStatement, newFactSource],
      source: [newSourceTitle, newSourceUrl, newSourceDescription],
    };
    if (requiredValues[type].some(value => !value.trim())) {
      setSaveError('Complete all required fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      let saved: any;
      if (type === 'guideline') {
        const payload = {
          title: newTitle.trim(), category: newCategory, description: newDescription.trim(),
          severity: newSeverity, sourceReference: newSourceRef.trim(), status: newGuidelineStatus,
          lastUpdated: new Date().toISOString().slice(0, 10),
          examples: { prohibited: newProhibitedExample.trim(), approved: newApprovedExample.trim() },
        };
        saved = editingItem ? await api.updateGuideline(editingItem.data.id, payload) : await api.createGuideline(payload);
      } else if (type === 'term') {
        const payload = {
          preferredTerm: newPreferredTerm.trim(), approvedAlternative: newApprovedAlternative.trim(),
          restrictedTerm: newRestrictedTerm.trim(), explanation: newTermExplanation.trim(),
          category: newTermCategory, priority: newTermPriority, status: newTermStatus,
          createdAt: editingItem?.data.createdAt || new Date().toISOString().slice(0, 10),
        };
        saved = editingItem ? await api.updateTerminology(editingItem.data.id, payload) : await api.createTerminology(payload);
      } else if (type === 'fact') {
        const payload = {
          title: newFactTitle.trim(), statement: newFactStatement.trim(), category: newFactCategory,
          source: newFactSource.trim(), verificationStatus: newFactStatus,
          lastUpdated: new Date().toISOString().slice(0, 10),
        };
        saved = editingItem ? await api.updateFact(editingItem.data.id, payload) : await api.createFact(payload);
      } else {
        const payload = {
          title: newSourceTitle.trim(), type: newSourceType, url: newSourceUrl.trim(),
          description: newSourceDescription.trim(), status: newSourceStatus,
          version: editingItem?.data.version || '1.0',
          effectiveDate: editingItem?.data.effectiveDate || new Date().toISOString().slice(0, 10),
          ruleCount: editingItem?.data.ruleCount || 0,
        };
        saved = editingItem ? await api.updateSource(editingItem.data.id, payload) : await api.createSource(payload);
      }

      if (selectedRecord?.data?.id === saved.id) setSelectedRecord({ type, data: saved });
      setSelectedCategory(type === 'term' ? 'terminology' : type === 'fact' ? 'facts' : type === 'source' ? 'sources' : 'guidelines');
      await onDataChanged();
      resetForm();
      setToastIsError(false);
      setToast(`${editingItem ? 'Entry updated' : 'Entry created'} successfully.`);
      window.setTimeout(() => setToast(''), 3500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save this entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!isAdmin) {
      alert('Administrator permissions required to delete brand knowledge records.');
      return;
    }
    if (!confirm('Are you sure you want to delete this brand intelligence record?')) return;
    try {
      if (type === 'guideline') await api.deleteGuideline(id);
      if (type === 'term') await api.deleteTerminology(id);
      if (type === 'fact') await api.deleteFact(id);
      if (type === 'source') await api.deleteSource(id);
      if (selectedRecord?.data?.id === id) setSelectedRecord(null);
      await onDataChanged();
      setToastIsError(false);
      setToast('Entry deleted successfully.');
      window.setTimeout(() => setToast(''), 3500);
    } catch (error) {
      setToastIsError(true);
      setToast(error instanceof Error ? error.message : 'Unable to delete this entry.');
      window.setTimeout(() => setToast(''), 5000);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setSaveError('');
    setIsSaving(false);
    setNewTitle('');
    setNewCategory('tone_of_voice');
    setNewDescription('');
    setNewSeverity('high');
    setNewSourceRef('');
    setNewProhibitedExample('');
    setNewApprovedExample('');
    setNewGuidelineStatus('active');
    setNewPreferredTerm('');
    setNewRestrictedTerm('');
    setNewTermExplanation('');
    setNewTermCategory('product_naming');
    setNewTermPriority('medium');
    setNewApprovedAlternative('');
    setNewTermStatus('active');
    setNewFactTitle('');
    setNewFactStatement('');
    setNewFactCategory('compliance_security');
    setNewFactSource('');
    setNewFactStatus('approved');
    setNewSourceTitle('');
    setNewSourceType('document');
    setNewSourceUrl('');
    setNewSourceDescription('');
    setNewSourceStatus('active');
  };

  const q = searchQuery.toLowerCase();

  // Filters
  const filterByPriority = (itemSeverity?: string) => {
    if (priorityFilter === 'all') return true;
    return itemSeverity?.toLowerCase() === priorityFilter.toLowerCase();
  };

  const filterByStatus = (itemStatus?: string) => {
    if (statusFilter === 'all') return true;
    if (!itemStatus) return false;
    const s = itemStatus.toLowerCase();
    const filter = statusFilter.toLowerCase();
    if (s === filter) return true;
    if (filter === 'active' && (s === 'verified' || s === 'approved')) return true;
    if (filter === 'needs_review' && (s === 'under_review' || s === 'unverified' || s === 'disputed')) return true;
    return false;
  };

  const filteredGuidelines = guidelines.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q);
    return matchesSearch && filterByPriority(g.severity) && filterByStatus(g.status);
  });

  const filteredTerminology = terminology.filter(t => {
    const matchesSearch = t.preferredTerm.toLowerCase().includes(q) ||
      t.restrictedTerm.toLowerCase().includes(q) ||
      t.explanation.toLowerCase().includes(q);
    // Terminology has severity derived from category
    const derivedSev = t.priority || ((t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high');
    return matchesSearch && filterByPriority(derivedSev) && filterByStatus(t.status);
  });

  const filteredFacts = facts.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(q) ||
      f.statement.toLowerCase().includes(q) ||
      f.source.toLowerCase().includes(q);
    return matchesSearch && filterByStatus(f.verificationStatus);
  });

  const filteredSources = sources.filter(s =>
    (s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.url || '').toLowerCase().includes(q)) &&
    filterByStatus(s.status || 'active')
  );

  const totalAllKnowledgeCount = guidelines.length + terminology.length + facts.length + sources.length;

  const categories = [
    { 
      id: 'all' as KnowledgeCategory, 
      label: 'All Knowledge', 
      count: totalAllKnowledgeCount, 
      icon: Layers,
      description: 'Unified repository of all active brand standards and reference assets.'
    },
    { 
      id: 'guidelines' as KnowledgeCategory, 
      label: 'Brand Guidelines', 
      count: guidelines.length, 
      icon: FileText,
      description: 'Official brand identity, naming, tone of voice, ethical AI and messaging rules.'
    },
    { 
      id: 'terminology' as KnowledgeCategory, 
      label: 'Approved Terminology', 
      count: terminology.length, 
      icon: ShieldAlert,
      description: 'Preferred terms, restricted terms, prohibited expressions and approved replacements.'
    },
    { 
      id: 'facts' as KnowledgeCategory, 
      label: 'Audited Factsheets', 
      count: facts.length, 
      icon: ShieldCheck,
      description: 'Verified product facts, approved statistics, service-level commitments and claims.'
    },
    { 
      id: 'sources' as KnowledgeCategory, 
      label: 'Knowledge Sources', 
      count: sources.length, 
      icon: FolderOpen,
      description: 'Reference documents used to ground brand rules and AI review findings.'
    },
  ];

  // Consolidated rows for "All Knowledge"
  const allKnowledgeRows = [
    ...filteredGuidelines.map(g => ({
      id: g.id,
      type: 'guideline',
      typeLabel: 'Guideline',
      title: g.title,
      category: g.category.replace(/_/g, ' '),
      summary: g.description,
      severity: g.severity,
      status: g.status,
      sourceRef: g.sourceReference,
      raw: g
    })),
    ...filteredTerminology.map(t => ({
      id: t.id,
      type: 'term',
      typeLabel: 'Terminology',
      title: `${t.preferredTerm} (vs. ${t.restrictedTerm})`,
      category: t.category.replace(/_/g, ' '),
      summary: t.explanation,
      severity: t.priority || ((t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high'),
      status: t.status,
      sourceRef: 'AuraCloud Nomenclature Guide',
      raw: t
    })),
    ...filteredFacts.map(f => ({
      id: f.id,
      type: 'fact',
      typeLabel: 'Factsheet',
      title: f.title,
      category: f.category.replace(/_/g, ' '),
      summary: f.statement,
      status: f.verificationStatus,
      sourceRef: f.source,
      raw: f
    })),
    ...filteredSources.map(s => ({
      id: s.id,
      type: 'source',
      typeLabel: 'Source',
      title: s.title,
      category: s.type.replace(/_/g, ' '),
      summary: s.description,
      status: s.status || 'active',
      sourceRef: s.version,
      raw: s
    }))
  ];

  const currentCategoryInfo = categories.find(c => c.id === selectedCategory) || categories[0];

  return (
    <div className="page-content flex min-h-full w-full flex-col bg-[#F8FAFC]">
      {/* Purpose Banner & Knowledge Toolbar (Requirement 5) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-end gap-4 shadow-2xs">

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2.5">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical (Red)</option>
            <option value="high">High (Orange)</option>
            <option value="medium">Medium (Amber)</option>
            <option value="low">Low (Green)</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active / Verified</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review / Unverified</option>
            <option value="archived">Archived</option>
          </select>

          {/* Search Field */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:border-[#2457D6] focus:outline-none bg-slate-50/50"
            />
          </div>

          {isAdmin ? (
            <button
              onClick={() => {
                resetForm();
                setEntryType(selectedCategory === 'terminology' ? 'term' : selectedCategory === 'facts' ? 'fact' : selectedCategory === 'sources' ? 'source' : 'guideline');
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-[#2457D6] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5" title="Select Evelyn Voss in the demo profile selector to manage knowledge entries">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Admin Profile Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Main 3-Column Structured Layout */}
      <div className="flex min-h-[calc(100dvh-140px)]">
        {/* 1. LEFT PANEL: Compact Vertical Category Navigation with Explanations */}
        <div className="w-60 bg-white border-r border-slate-200 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
              Knowledge Repositories
            </div>

            <div className="space-y-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedRecord(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-[#2457D6] font-semibold border-l-2 border-[#2457D6] shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#2457D6]' : 'text-slate-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {cat.count}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal line-clamp-2 pl-5 leading-tight">
                      {cat.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Legend (Requirement 6) */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1.5">
            <div className="font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1 text-[9px]">
              <Info className="w-3 h-3 text-[#2457D6]" />
              <span>Severity and Priority</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Critical</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>High</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Medium</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Low</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. CENTRE PANEL: Scrollable Tailored Data Table with Row-Level Priority (Requirement 12) */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {/* Category description header */}
          <div className="px-5 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">
              Showing: <strong className="text-slate-800">{currentCategoryInfo.label}</strong> — {currentCategoryInfo.description}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Click any row to inspect & edit
            </span>
          </div>

          <div className="flex-1 min-h-0 min-w-0 overflow-auto">
            {/* ALL KNOWLEDGE CONSOLIDATED TABLE */}
            {selectedCategory === 'all' && (
              <table className="app-table min-w-[1000px] w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Knowledge Asset</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Severity / Priority</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3">Rule / Fact Statement</th>
                    <th className="p-3">Authority Reference</th>
                    <th className="p-3 text-right pr-5">Resource Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allKnowledgeRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    allKnowledgeRows.map((row) => {
                      const isSelected = selectedRecord?.data?.id === row.id;
                      const priorityStyle = getPriorityStyle(('severity' in row ? row.severity : undefined) || 'medium');
                      const statusStyle = row.type === 'source' ? getSourceStatusStyle(row.status) : getResourceStatusStyle(row.status);

                      return (
                        <tr
                          key={`${row.type}-${row.id}`}
                          onClick={() => setSelectedRecord({ type: row.type, data: row.raw })}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          {/* Row-Level Priority Dot before Name (Requirement 12) */}
                          <td className="p-3 pl-5 max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              {('severity' in row) && <span className={`w-2 h-2 rounded-full shrink-0 ${priorityStyle.dot}`} title={`Severity or priority: ${priorityStyle.label}`} />}
                              <span className="font-semibold text-slate-900 truncate">{row.title}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                              {row.typeLabel}
                            </span>
                          </td>

                          {/* Priority Column Badge */}
                          <td className="p-3">
                            {('severity' in row) ? <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${priorityStyle.badge}`}>{priorityStyle.label}</span> : <span className="text-slate-300">—</span>}
                          </td>

                          <td className="p-3 text-slate-600 capitalize truncate max-w-[120px]">
                            {row.category}
                          </td>

                          <td className="p-3 text-slate-600 truncate max-w-sm">
                            {row.summary}
                          </td>

                          <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-[140px]">
                            {row.sourceRef}
                          </td>

                          {/* Distinct Resource Status Badge */}
                          <td className="p-3 text-right pr-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${statusStyle}`}>
                              {row.type === 'fact' ? getStatusLabel(row.status) : row.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* BRAND GUIDELINES TABLE */}
            {selectedCategory === 'guidelines' && (
              <table className="app-table min-w-[1000px] w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Guideline Title</th>
                          <th className="p-3">Severity</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description & Rationale</th>
                    <th className="p-3">Source Reference</th>
                    <th className="p-3 text-right pr-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuidelines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No brand guidelines match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredGuidelines.map((g) => {
                      const isSelected = selectedRecord?.data?.id === g.id;
                      const priorityStyle = getPriorityStyle(g.severity);
                      const statusStyle = getResourceStatusStyle(g.status);

                      return (
                        <tr
                          key={g.id}
                          ref={g.id === focusRecordId || (recentlyApprovedRecord?.type === 'guideline' && g.id === recentlyApprovedRecord.id) ? focusedKnowledgeRowRef : undefined}
                          onClick={() => setSelectedRecord({ type: 'guideline', data: g })}
                          className={`cursor-pointer transition-all duration-500 hover:bg-slate-50/80 ${
                            g.id === recentlyApprovedRecord?.id && recentlyApprovedRecord.type === 'guideline'
                              ? 'bg-violet-50 ring-2 ring-inset ring-violet-300'
                              : isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          <td className="p-3 pl-5 max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span 
                                className={`w-2 h-2 rounded-full shrink-0 ${priorityStyle.dot}`} 
                                title={`Severity: ${priorityStyle.label}`} 
                              />
                              <span className="font-semibold text-slate-900 truncate">{g.title}</span>
                              {recentlyApprovedRecord?.type === 'guideline' && g.id === recentlyApprovedRecord.id && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-800">Recently approved</span>}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${priorityStyle.badge}`}>
                              {priorityStyle.label}
                            </span>
                          </td>

                          <td className="p-3 text-slate-600 capitalize">
                            {g.category.replace(/_/g, ' ')}
                          </td>

                          <td className="p-3 text-slate-500 truncate max-w-sm">
                            {g.description}
                          </td>

                          <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-[140px]">
                            {g.sourceReference}
                          </td>

                          <td className="p-3 text-right pr-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${statusStyle}`}>
                              {g.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* APPROVED TERMINOLOGY TABLE */}
            {selectedCategory === 'terminology' && (
              <table className="app-table min-w-[1000px] w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Preferred Term</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Restricted Term</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Governance Explanation</th>
                    <th className="p-3 text-right pr-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTerminology.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No terminology entries match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTerminology.map((t) => {
                      const isSelected = selectedRecord?.data?.id === t.id;
                      const derivedSev = t.priority || ((t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high');
                      const priorityStyle = getPriorityStyle(derivedSev);
                      const statusStyle = getResourceStatusStyle(t.status);

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedRecord({ type: 'term', data: t })}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          <td className="p-3 pl-5 max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span 
                                className={`w-2 h-2 rounded-full shrink-0 ${priorityStyle.dot}`} 
                                title={`Priority: ${priorityStyle.label}`} 
                              />
                              <span className="font-mono font-bold text-emerald-800 truncate">{t.preferredTerm}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${priorityStyle.badge}`}>
                              {priorityStyle.label}
                            </span>
                          </td>

                          <td className="p-3 font-mono font-semibold text-rose-700 line-through">
                            {t.restrictedTerm}
                          </td>

                          <td className="p-3 text-slate-600 capitalize">
                            {t.category.replace(/_/g, ' ')}
                          </td>

                          <td className="p-3 text-slate-500 truncate max-w-sm">
                            {t.explanation}
                          </td>

                          <td className="p-3 text-right pr-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${statusStyle}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* AUDITED FACTSHEETS TABLE */}
            {selectedCategory === 'facts' && (
              <table className="app-table min-w-[820px] w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Factsheet Title</th>
                    <th className="p-3">Verified Statement</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Source Authority</th>
                    <th className="p-3 text-right pr-5">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No verified facts match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredFacts.map((f) => {
                      const isSelected = selectedRecord?.data?.id === f.id;
                      const statusStyle = getResourceStatusStyle(f.verificationStatus);

                      return (
                        <tr
                          key={f.id}
                          ref={f.id === focusRecordId || (recentlyApprovedRecord?.type === 'fact' && f.id === recentlyApprovedRecord.id) ? focusedKnowledgeRowRef : undefined}
                          onClick={() => setSelectedRecord({ type: 'fact', data: f })}
                          className={`cursor-pointer transition-all duration-500 ${
                            f.id === recentlyApprovedRecord?.id
                              ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-300'
                              : isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="p-3 pl-5 max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 truncate">{f.title}</span>
                              {recentlyApprovedRecord?.type === 'fact' && f.id === recentlyApprovedRecord.id && <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Recently approved</span>}
                            </div>
                          </td>

                          <td className="p-3 text-slate-600 truncate max-w-md">
                            {f.statement}
                          </td>

                          <td className="p-3 text-slate-500 capitalize">
                            {f.category.replace(/_/g, ' ')}
                          </td>

                          <td className="p-3 font-mono text-slate-500 text-[11px] truncate max-w-xs">
                            {f.source}
                          </td>

                          <td className="p-3 text-right pr-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${statusStyle}`}>
                              {getStatusLabel(f.verificationStatus)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* KNOWLEDGE SOURCES TABLE */}
            {selectedCategory === 'sources' && (
              <table className="app-table min-w-[1000px] w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Source Name</th>
                    <th className="p-3">Source Type</th>
                    <th className="p-3">URL / Reference</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Rules Derived</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right pr-5">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No knowledge sources match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSources.map((s) => {
                      const isSelected = selectedRecord?.data?.id === s.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedRecord({ type: 'source', data: s })}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          <td className="p-3 pl-5 max-w-xs truncate font-semibold text-slate-900">
                            {s.title}
                          </td>

                          <td className="p-3 text-slate-600 capitalize">
                            {s.type}
                          </td>

                          <td className="p-3 text-slate-500 truncate max-w-xs">
                            {s.url || '—'}
                          </td>

                          <td className="p-3 text-slate-500 truncate max-w-sm">
                            {s.description}
                          </td>

                          <td className="p-3 font-mono text-[#2457D6] font-semibold">
                            {s.ruleCount} rules
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getSourceStatusStyle(s.status || 'active')}`}>
                              {(s.status || 'active').replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="p-3 text-right pr-5 font-mono text-slate-400 text-[11px]">
                            {s.effectiveDate}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 3. RIGHT PANEL: Contextual Record Inspector (Opens on Selection - Requirement 5 & 6) */}
        {selectedRecord && (
          <div className="w-96 bg-white border-l border-slate-200 p-5 flex flex-col shrink-0 overflow-y-auto shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Record Inspector · {selectedRecord.type.toUpperCase()}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guideline Details */}
            {selectedRecord.type === 'guideline' && (
              <div className="py-4 space-y-4 text-xs flex-1">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Guideline Title</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{selectedRecord.data.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Severity</div>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getPriorityStyle(selectedRecord.data.severity).badge}`}>
                        {getPriorityStyle(selectedRecord.data.severity).label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Status</div>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getResourceStatusStyle(selectedRecord.data.status)}`}>
                        {selectedRecord.data.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Description & Rationale</div>
                  <p className="text-slate-600 leading-relaxed mt-1 text-[11px]">{selectedRecord.data.description}</p>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Source Reference</div>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5">{selectedRecord.data.sourceReference}</div>
                </div>

                {selectedRecord.data.sourceDocumentId && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase text-slate-500">Original document provenance</div>
                    <div className="text-[11px] text-slate-700">{selectedRecord.data.sourcePageNumber ? 'Page ' + selectedRecord.data.sourcePageNumber : 'Page not recorded'}{selectedRecord.data.sourceSectionLabel ? ' · ' + selectedRecord.data.sourceSectionLabel : ''}</div>
                    {selectedRecord.data.sourceExcerpt && <p className="text-[11px] leading-relaxed text-slate-600">{selectedRecord.data.sourceExcerpt}</p>}
                    <a href={api.getDocumentDownloadUrl(selectedRecord.data.sourceDocumentId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"><FileText className="h-3.5 w-3.5" /> Download original source</a>
                  </div>
                )}

                {selectedRecord.data.examples && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px]">
                      <div className="font-bold text-rose-800 text-[9px] uppercase">Prohibited Phrasing:</div>
                      <div className="text-rose-950 font-mono mt-0.5">&ldquo;{selectedRecord.data.examples.prohibited}&rdquo;</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px]">
                      <div className="font-bold text-emerald-800 text-[9px] uppercase">Approved Standard:</div>
                      <div className="text-emerald-950 font-mono mt-0.5">&ldquo;{selectedRecord.data.examples.approved}&rdquo;</div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 font-mono">
                  Last updated: {selectedRecord.data.lastUpdated}
                </div>
              </div>
            )}

            {/* Terminology Details */}
            {selectedRecord.type === 'term' && (
              <div className="py-4 space-y-4 text-xs flex-1">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Preferred Nomenclature</div>
                  <div className="font-mono font-bold text-sm text-emerald-800 mt-0.5">{selectedRecord.data.preferredTerm}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Restricted / Prohibited Term</div>
                  <div className="font-mono font-bold text-xs text-rose-700 line-through mt-0.5">{selectedRecord.data.restrictedTerm}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Approved Alternative</div>
                  <div className="text-emerald-700 font-medium mt-0.5">{selectedRecord.data.approvedAlternative}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Governance Explanation</div>
                  <p className="text-slate-600 leading-relaxed mt-1 text-[11px]">{selectedRecord.data.explanation}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Priority</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getPriorityStyle(selectedRecord.data.priority || ((selectedRecord.data.category === 'product_naming' || selectedRecord.data.category === 'capability_claim') ? 'critical' : 'high')).badge}`}>
                      {getPriorityStyle(selectedRecord.data.priority || ((selectedRecord.data.category === 'product_naming' || selectedRecord.data.category === 'capability_claim') ? 'critical' : 'high')).label}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Status</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getResourceStatusStyle(selectedRecord.data.status)}`}>
                      {selectedRecord.data.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-400 uppercase">Category</div>
                    <span className="capitalize text-slate-700">{selectedRecord.data.category.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fact Details */}
            {selectedRecord.type === 'fact' && (
              <div className="py-4 space-y-4 text-xs flex-1">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Factsheet Title</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{selectedRecord.data.title}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Verified Factual Statement</div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1 leading-relaxed">
                    {selectedRecord.data.statement}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Verification Source Authority</div>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5">{selectedRecord.data.source}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Verification Status</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getResourceStatusStyle(selectedRecord.data.verificationStatus)}`}>
                    {selectedRecord.data.verificationStatus}
                  </span>
                </div>

                {selectedRecord.data.sourceDocumentId && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase text-slate-500">Original document provenance</div>
                    <div className="text-[11px] text-slate-700">{selectedRecord.data.sourcePageNumber ? 'Page ' + selectedRecord.data.sourcePageNumber : 'Page not recorded'}{selectedRecord.data.sourceSectionLabel ? ' · ' + selectedRecord.data.sourceSectionLabel : ''}</div>
                    {selectedRecord.data.sourceExcerpt && <p className="text-[11px] leading-relaxed text-slate-600">{selectedRecord.data.sourceExcerpt}</p>}
                    <a href={api.getDocumentDownloadUrl(selectedRecord.data.sourceDocumentId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"><FileText className="h-3.5 w-3.5" /> Download original source</a>
                  </div>
                )}
              </div>
            )}

            {/* Source Details */}
            {selectedRecord.type === 'source' && (
              <div className="py-4 space-y-4 text-xs flex-1">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Source Title</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{selectedRecord.data.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Type</div>
                    <div className="font-medium text-slate-700 capitalize mt-0.5">{selectedRecord.data.type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Version</div>
                    <div className="font-mono text-slate-700 mt-0.5">{selectedRecord.data.version}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">URL / Reference</div>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5 break-all">{selectedRecord.data.url || 'Not provided'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Description</div>
                  <p className="text-slate-600 leading-relaxed mt-1 text-[11px]">{selectedRecord.data.description}</p>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Status</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getSourceStatusStyle(selectedRecord.data.status || 'active')}`}>
                    {selectedRecord.data.status || 'active'}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Effective Date</div>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5">{selectedRecord.data.effectiveDate}</div>
                </div>
              </div>
            )}

            {/* Action Buttons: Protected by Administrator role (Requirement 8) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => handleStartEdit(selectedRecord.type, selectedRecord.data)}
                      className="flex-1 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Record</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedRecord.type, selectedRecord.data.id)}
                      className="py-1.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Administrator role required</span> to modify brand rules. (Current role: Reviewer)
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && isAdmin && (() => {
        const formType = (editingItem?.type || entryType) as EntryType;
        const entryLabels: Record<EntryType, string> = {
          guideline: 'Brand Guideline', term: 'Approved Terminology',
          fact: 'Audited Factsheet', source: 'Knowledge Source',
        };
        const textField = (label: string, value: string, onChange: (value: string) => void, placeholder: string, required = true) => (
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">{label}{required ? ' *' : ''}</span>
            <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} required={required}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2457D6]" />
          </label>
        );
        const selectField = (label: string, value: string, onChange: (value: string) => void, options: Array<[string, string]>) => (
          <label className="block">
            <span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">{label}</span>
            <select value={value} onChange={event => onChange(event.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white">
              {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
            </select>
          </label>
        );
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
              <div className="modal-content bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-900">{editingItem ? `Edit ${entryLabels[formType]}` : `Create ${entryLabels[formType]}`}</h2>
                <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close form">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveEntry} className="p-5 text-xs space-y-3 max-h-[75vh] overflow-y-auto">
                {!editingItem && (
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200 sm:grid-cols-4">
                    {([
                      ['guideline', 'Guideline'], ['term', 'Terminology'], ['fact', 'Factsheet'], ['source', 'Source'],
                    ] as Array<[EntryType, string]>).map(([type, label]) => (
                      <button key={type} type="button" onClick={() => { setEntryType(type); setSaveError(''); }}
                        className={`py-1.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${formType === type ? 'bg-white text-[#2457D6] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {formType === 'guideline' && <>
                  {textField('Title', newTitle, setNewTitle, 'e.g. Professional brand voice')}
                  <label className="block"><span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Guideline Content *</span>
                    <textarea rows={3} value={newDescription} onChange={event => setNewDescription(event.target.value)} required placeholder="Describe the rule and when it applies..." className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2457D6]" /></label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectField('Category', newCategory, setNewCategory, [['tone_of_voice','Tone of Voice'],['messaging_principles','Messaging Principles'],['product_positioning','Product Positioning'],['restricted_language','Restricted Language'],['writing_standards','Writing Standards']])}
                    {selectField('Severity', newSeverity, value => setNewSeverity(value as FindingSeverity), [['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']])}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectField('Status', newGuidelineStatus, value => setNewGuidelineStatus(value as BrandGuideline['status']), [['active','Active'],['under_review','Under Review'],['archived','Archived']])}
                    {textField('Source Reference', newSourceRef, setNewSourceRef, 'Policy, section, or reference')}
                  </div>
                  {textField('Prohibited Example', newProhibitedExample, setNewProhibitedExample, 'Optional example of disallowed wording', false)}
                  {textField('Approved Example', newApprovedExample, setNewApprovedExample, 'Optional compliant wording', false)}
                </>}

                {formType === 'term' && <>
                  {textField('Term', newPreferredTerm, setNewPreferredTerm, 'Approved term')}
                  {textField('Approved Alternative', newApprovedAlternative, setNewApprovedAlternative, 'Preferred replacement wording')}
                  {textField('Prohibited Alternative', newRestrictedTerm, setNewRestrictedTerm, 'Restricted or prohibited term')}
                  <label className="block"><span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Explanation *</span>
                    <textarea rows={3} value={newTermExplanation} onChange={event => setNewTermExplanation(event.target.value)} required placeholder="Explain the terminology rule..." className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2457D6]" /></label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectField('Category', newTermCategory, setNewTermCategory, [['product_naming','Product Naming'],['capability_claim','Capability Claim'],['architecture','Architecture'],['legal_compliance','Legal Compliance'],['security','Security']])}
                    {selectField('Priority', newTermPriority, value => setNewTermPriority(value as NonNullable<TerminologyEntry['priority']>), [['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']])}
                    {selectField('Status', newTermStatus, value => setNewTermStatus(value as TerminologyEntry['status']), [['active','Active'],['deprecated','Deprecated']])}
                  </div>
                </>}

                {formType === 'fact' && <>
                  {textField('Title', newFactTitle, setNewFactTitle, 'Fact or claim title')}
                  <label className="block"><span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Verified Fact / Claim *</span>
                    <textarea rows={3} value={newFactStatement} onChange={event => setNewFactStatement(event.target.value)} required placeholder="Enter the verified statement..." className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2457D6]" /></label>
                  {textField('Supporting Evidence / Source', newFactSource, setNewFactSource, 'Audit, report, or source reference')}
                  <div className="grid grid-cols-2 gap-2">
                    {selectField('Category', newFactCategory, setNewFactCategory, [['compliance_security','Compliance & Security'],['product_specs','Product Specs'],['company_history','Company History'],['pricing_licensing','Pricing & Licensing'],['uptime_performance','Uptime & Performance']])}
                    {selectField('Review Status', newFactStatus, value => setNewFactStatus(value as ApprovedFact['verificationStatus']), [['approved','Approved'],['pending_review','Pending Review'],['under_review','Under Review'],['rejected','Rejected']])}
                  </div>
                </>}

                {formType === 'source' && <>
                  {textField('Source Name', newSourceTitle, setNewSourceTitle, 'Document or reference name')}
                  {selectField('Source Type', newSourceType, value => setNewSourceType(value as KnowledgeSource['type']), [['document','Document'],['manual_entry','Manual Entry'],['factsheet','Factsheet']])}
                  {textField('URL / Reference', newSourceUrl, setNewSourceUrl, 'https://… or internal document reference')}
                  <label className="block"><span className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Description *</span>
                    <textarea rows={3} value={newSourceDescription} onChange={event => setNewSourceDescription(event.target.value)} required placeholder="What does this source cover?" className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2457D6]" /></label>
                  {selectField('Status', newSourceStatus, value => setNewSourceStatus(value as NonNullable<KnowledgeSource['status']>), [['active','Active'],['under_review','Under Review'],['archived','Archived']])}
                </>}

                {saveError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{saveError}</div>}
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={resetForm} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-[#2457D6] hover:bg-[#1D4ED8] disabled:opacity-60 text-white rounded-lg font-medium cursor-pointer">
                    {isSaving ? 'Saving…' : editingItem ? 'Save Changes' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
      {toast && <div role={toastIsError ? 'alert' : 'status'} className={`fixed bottom-5 right-5 z-[60] rounded-lg px-4 py-3 text-xs font-medium text-white shadow-lg ${toastIsError ? 'bg-rose-700' : 'bg-emerald-700'}`}>{toast}</div>}
    </div>
  );
};
