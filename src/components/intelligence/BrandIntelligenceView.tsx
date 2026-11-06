import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';

interface BrandIntelligenceViewProps {
  guidelines: BrandGuideline[];
  terminology: TerminologyEntry[];
  facts: ApprovedFact[];
  sources: KnowledgeSource[];
  onDataChanged: () => void;
}

type KnowledgeCategory = 'all' | 'guidelines' | 'terminology' | 'facts' | 'sources';

export const BrandIntelligenceView: React.FC<BrandIntelligenceViewProps> = ({
  guidelines,
  terminology,
  facts,
  sources,
  onDataChanged,
}) => {
  const { currentUser, isAdmin, setShowAuthModal } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<{ type: string; data: any } | null>(null);
  
  // Modals for CRUD
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: string; data: any } | null>(null);

  // New Guideline Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<any>('tone_of_voice');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<FindingSeverity>('high');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newProhibitedExample, setNewProhibitedExample] = useState('');
  const [newApprovedExample, setNewApprovedExample] = useState('');

  // New Terminology Form State
  const [newPreferredTerm, setNewPreferredTerm] = useState('');
  const [newRestrictedTerm, setNewRestrictedTerm] = useState('');
  const [newTermExplanation, setNewTermExplanation] = useState('');
  const [newTermCategory, setNewTermCategory] = useState<any>('product_naming');

  // New Fact Form State
  const [newFactTitle, setNewFactTitle] = useState('');
  const [newFactStatement, setNewFactStatement] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<any>('compliance_security');
  const [newFactSource, setNewFactSource] = useState('');

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
      case 'informational':
      default:
        return {
          dot: 'bg-slate-400',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Low',
          rowBorder: 'border-l-slate-300',
        };
    }
  };

  // Resource status styling helper (Requirement 6 & 12)
  const getResourceStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'draft':
      case 'provisional':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'archived':
      case 'deprecated':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'needs_review':
      case 'under_review':
      case 'needs_revalidation':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Prepare edit
  const handleStartEdit = (type: string, data: any) => {
    if (!isAdmin) {
      alert('Administrator permissions required to edit brand knowledge.');
      return;
    }
    setEditingItem({ type, data });
    if (type === 'guideline') {
      setNewTitle(data.title);
      setNewCategory(data.category);
      setNewDescription(data.description);
      setNewSeverity(data.severity);
      setNewSourceRef(data.sourceReference);
      setNewProhibitedExample(data.examples?.prohibited || '');
      setNewApprovedExample(data.examples?.approved || '');
    } else if (type === 'term') {
      setNewPreferredTerm(data.preferredTerm);
      setNewRestrictedTerm(data.restrictedTerm);
      setNewTermExplanation(data.explanation);
      setNewTermCategory(data.category);
    } else if (type === 'fact') {
      setNewFactTitle(data.title);
      setNewFactStatement(data.statement);
      setNewFactCategory(data.category);
      setNewFactSource(data.source);
    }
    setShowAddModal(true);
  };

  const handleSaveGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingItem && editingItem.type === 'guideline') {
        const updated = await api.updateGuideline(editingItem.data.id, {
          title: newTitle,
          category: newCategory,
          description: newDescription,
          severity: newSeverity,
          sourceReference: newSourceRef,
          examples: {
            prohibited: newProhibitedExample,
            approved: newApprovedExample,
          },
        });
        if (selectedRecord?.data?.id === updated.id) {
          setSelectedRecord({ type: 'guideline', data: updated });
        }
      } else {
        await api.createGuideline({
          title: newTitle,
          category: newCategory,
          description: newDescription,
          severity: newSeverity,
          sourceReference: newSourceRef,
          status: 'active',
          examples: {
            prohibited: newProhibitedExample,
            approved: newApprovedExample,
          },
        });
      }
      resetForm();
      onDataChanged();
    } catch (err) {
      console.error('Error saving guideline:', err);
    }
  };

  const handleSaveTerminology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingItem && editingItem.type === 'term') {
        const updated = await api.updateTerminology(editingItem.data.id, {
          preferredTerm: newPreferredTerm,
          restrictedTerm: newRestrictedTerm,
          explanation: newTermExplanation,
          approvedAlternative: newPreferredTerm,
          category: newTermCategory,
        });
        if (selectedRecord?.data?.id === updated.id) {
          setSelectedRecord({ type: 'term', data: updated });
        }
      } else {
        await api.createTerminology({
          preferredTerm: newPreferredTerm,
          restrictedTerm: newRestrictedTerm,
          explanation: newTermExplanation,
          approvedAlternative: newPreferredTerm,
          category: newTermCategory,
          status: 'active',
        });
      }
      resetForm();
      onDataChanged();
    } catch (err) {
      console.error('Error saving terminology:', err);
    }
  };

  const handleSaveFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.createFact({
        title: newFactTitle,
        statement: newFactStatement,
        category: newFactCategory,
        source: newFactSource,
        verificationStatus: 'verified',
      });
      resetForm();
      onDataChanged();
    } catch (err) {
      console.error('Error saving fact:', err);
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
      if (selectedRecord?.data?.id === id) setSelectedRecord(null);
      onDataChanged();
    } catch (err) {
      console.error('Error deleting record:', err);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setNewTitle('');
    setNewDescription('');
    setNewSourceRef('');
    setNewProhibitedExample('');
    setNewApprovedExample('');
    setNewPreferredTerm('');
    setNewRestrictedTerm('');
    setNewTermExplanation('');
    setNewFactTitle('');
    setNewFactStatement('');
    setNewFactSource('');
  };

  const q = searchQuery.toLowerCase();

  // Filters
  const filterByPriority = (itemSeverity?: string) => {
    if (priorityFilter === 'all') return true;
    return itemSeverity?.toLowerCase() === priorityFilter.toLowerCase();
  };

  const filterByStatus = (itemStatus?: string) => {
    if (statusFilter === 'all') return true;
    return itemStatus?.toLowerCase() === statusFilter.toLowerCase();
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
    const derivedSev = (t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high';
    return matchesSearch && filterByPriority(derivedSev) && filterByStatus(t.status);
  });

  const filteredFacts = facts.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(q) ||
      f.statement.toLowerCase().includes(q) ||
      f.source.toLowerCase().includes(q);
    return matchesSearch && filterByStatus(f.verificationStatus);
  });

  const filteredSources = sources.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q)
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
      severity: (t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high',
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
      severity: 'high',
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
      severity: 'low',
      status: 'active',
      sourceRef: s.version,
      raw: s
    }))
  ];

  const currentCategoryInfo = categories.find(c => c.id === selectedCategory) || categories[0];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-[#F8FAFC]">
      {/* Purpose Banner & Knowledge Toolbar (Requirement 5) */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 leading-none">
              Brand Intelligence Workspace
            </h1>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-[#2457D6] font-medium font-mono">
              Grounding Engine Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Manage the approved brand rules, terminology, verified claims and reference documents used to evaluate submitted content.
          </p>
        </div>

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
            <option value="low">Low (Grey)</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="needs_review">Needs Review</option>
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
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-[#2457D6] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Administrator permission required to add knowledge entries"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Admin Only</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Column Structured Layout */}
      <div className="flex-1 flex overflow-hidden">
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
              <span>Priority Legend (Visible in rows)</span>
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
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Category description header */}
          <div className="px-5 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">
              Showing: <strong className="text-slate-800">{currentCategoryInfo.label}</strong> — {currentCategoryInfo.description}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Click any row to inspect & edit
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ALL KNOWLEDGE CONSOLIDATED TABLE */}
            {selectedCategory === 'all' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Knowledge Asset</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Priority</th>
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
                      const priorityStyle = getPriorityStyle(row.severity);
                      const statusStyle = getResourceStatusStyle(row.status);

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
                              <span 
                                className={`w-2 h-2 rounded-full shrink-0 ${priorityStyle.dot}`} 
                                title={`Priority: ${priorityStyle.label}`} 
                              />
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${priorityStyle.badge}`}>
                              {priorityStyle.label}
                            </span>
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
                              {row.status}
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
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Guideline Title</th>
                    <th className="p-3">Priority</th>
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
                          onClick={() => setSelectedRecord({ type: 'guideline', data: g })}
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
                              <span className="font-semibold text-slate-900 truncate">{g.title}</span>
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
                              {g.status}
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
              <table className="w-full text-left text-xs border-collapse">
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
                      const derivedSev = (t.category === 'product_naming' || t.category === 'capability_claim') ? 'critical' : 'high';
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
              <table className="w-full text-left text-xs border-collapse">
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
                      const priorityStyle = getPriorityStyle('high');
                      const statusStyle = getResourceStatusStyle(f.verificationStatus);

                      return (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedRecord({ type: 'fact', data: f })}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          <td className="p-3 pl-5 max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span 
                                className={`w-2 h-2 rounded-full shrink-0 ${priorityStyle.dot}`} 
                                title="Priority: High (Audited Commitment)" 
                              />
                              <span className="font-semibold text-slate-900 truncate">{f.title}</span>
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
                              {f.verificationStatus}
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
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 pl-5">Source Name</th>
                    <th className="p-3">Source Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Rules Derived</th>
                    <th className="p-3 text-right pr-5">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
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

                          <td className="p-3 text-slate-500 truncate max-w-sm">
                            {s.description}
                          </td>

                          <td className="p-3 font-mono text-[#2457D6] font-semibold">
                            {s.ruleCount} rules
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
                    <div className="text-[10px] text-slate-400 uppercase">Priority</div>
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
                        {selectedRecord.data.status}
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
                    <div className="text-[10px] text-slate-400 uppercase">Status</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium border ${getResourceStatusStyle(selectedRecord.data.status)}`}>
                      {selectedRecord.data.status}
                    </span>
                  </div>
                  <div>
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
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Description</div>
                  <p className="text-slate-600 leading-relaxed mt-1 text-[11px]">{selectedRecord.data.description}</p>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Effective Date</div>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5">{selectedRecord.data.effectiveDate}</div>
                </div>
              </div>
            )}

            {/* Action Buttons: Protected by Administrator role (Requirement 8) */}
            {selectedRecord.type !== 'source' && (
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
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingItem ? `Edit ${editingItem.type.toUpperCase()}` : 'Add New Governance Entry'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-4">
              {/* Type Switcher when adding new */}
              {!editingItem && (
                <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setNewCategory('tone_of_voice')}
                    className="flex-1 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded cursor-pointer"
                  >
                    Guideline
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTermCategory('product_naming')}
                    className="flex-1 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded cursor-pointer"
                  >
                    Terminology
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFactCategory('compliance_security')}
                    className="flex-1 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 rounded cursor-pointer"
                  >
                    Fact
                  </button>
                </div>
              )}

              {/* Guideline Fields */}
              {(!editingItem || editingItem.type === 'guideline') && (
                <form onSubmit={handleSaveGuideline} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Tone of Voice: Professional Confidence"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="tone_of_voice">Tone of Voice</option>
                        <option value="messaging_principles">Messaging Principles</option>
                        <option value="product_positioning">Product Positioning</option>
                        <option value="restricted_language">Restricted Language</option>
                        <option value="writing_standards">Writing Standards</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Severity</label>
                      <select
                        value={newSeverity}
                        onChange={(e) => setNewSeverity(e.target.value as FindingSeverity)}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Description *</label>
                    <textarea
                      rows={2}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Guideline rule description..."
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-700 mb-1">Source Reference</label>
                    <input
                      type="text"
                      value={newSourceRef}
                      onChange={(e) => setNewSourceRef(e.target.value)}
                      placeholder="e.g. AuraCloud Brand Playbook v2.4, Sec 3.1"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-rose-700 mb-1">Prohibited Example</label>
                      <input
                        type="text"
                        value={newProhibitedExample}
                        onChange={(e) => setNewProhibitedExample(e.target.value)}
                        placeholder="e.g. Unstoppable cloud power"
                        className="w-full p-2 border border-rose-200 rounded-lg text-xs bg-rose-50/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-emerald-700 mb-1">Approved Example</label>
                      <input
                        type="text"
                        value={newApprovedExample}
                        onChange={(e) => setNewApprovedExample(e.target.value)}
                        placeholder="e.g. Enterprise-grade cloud resilience"
                        className="w-full p-2 border border-emerald-200 rounded-lg text-xs bg-emerald-50/30"
                      />
                    </div>
                  </div>
                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                    <button type="button" onClick={resetForm} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-1.5 bg-[#2457D6] hover:bg-[#1D4ED8] text-white rounded-lg font-medium cursor-pointer">
                      Save Guideline
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
