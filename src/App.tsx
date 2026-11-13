import React, { useState, useEffect, useMemo } from 'react';
import { NavigationRail, NavTab } from './components/layout/NavigationRail';
import { TopHeader } from './components/layout/TopHeader';
import { DemoEntryScreen } from './components/layout/DemoEntryScreen';
import { DemoJourneyBanner } from './components/overview/DemoJourneyBanner';
import { OverviewView } from './components/overview/OverviewView';
import { ReviewStudio } from './components/review/ReviewStudio';
import { BrandIntelligenceView } from './components/intelligence/BrandIntelligenceView';
import { EvidenceIngestionView } from './components/intelligence/EvidenceIngestionView';
import { DecisionArchiveView } from './components/archive/DecisionArchiveView';
import { GovernanceInsightsView } from './components/insights/GovernanceInsightsView';
import { PendingReviewsView } from './components/pending/PendingReviewsView';
import { DemoProfileProvider, useDemoProfile } from './context/DemoProfileContext';
import { api } from './services/apiClient';
import {
  BrandGuideline,
  TerminologyEntry,
  ApprovedFact,
  KnowledgeSource,
  ReviewDocument,
  ReviewWorkflowStage,
  GovernanceInsights
} from './types';
import { SAMPLE_DOCUMENTS } from './data/mockData';

function AppContent() {
  const {
    currentUser,
    hasEnteredDemo,
    enterDemo,
    returnToDemoPicker,
    selectDemoProfile,
  } = useDemoProfile();

  // Navigation & Review Persistence
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  // Data State
  const [overviewData, setOverviewData] = useState<any>(null);
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [terminology, setTerminology] = useState<TerminologyEntry[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [reviews, setReviews] = useState<ReviewDocument[]>([]);
  const [reviewWorkflows, setReviewWorkflows] = useState<Record<string, ReviewWorkflowStage[]>>({});
  const [insights, setInsights] = useState<GovernanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Review Studio Active Document State
  const [activeReview, setActiveReview] = useState<ReviewDocument | null>(null);
  const [knowledgeFocusId, setKnowledgeFocusId] = useState<string | null>(null);
  const [draftToLoad, setDraftToLoad] = useState<typeof SAMPLE_DOCUMENTS[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reviewers see records assigned to their demo identity; administrators see the full shared workspace.
  const visibleReviews = useMemo(() => {
    if (currentUser.role === 'admin') return reviews;
    const identity = currentUser.name.trim().toLowerCase();
    return reviews.filter(review => {
      const createdByOrAssignedReviewer = (review.reviewer || '').toLowerCase().includes(identity);
      const assignedToStage = (reviewWorkflows[review.id] || []).some(stage => {
        const assignedReviewer = stage.assignedReviewer.trim().toLowerCase() === identity;
        const returnedToCreator = stage.status === 'returned' && stage.createdBy.trim().toLowerCase() === identity;
        return assignedReviewer || returnedToCreator;
      });
      return createdByOrAssignedReviewer || assignedToStage;
    });
  }, [reviews, reviewWorkflows, currentUser]);

  const assignedWorkflowTask = useMemo(() => {
    const identity = currentUser.name.trim().toLowerCase();
    const candidates = [...visibleReviews].sort((left, right) =>
      new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime()
    );
    for (const review of candidates) {
      const stages = reviewWorkflows[review.id] || [];
      const stage = stages.find(item => {
        const assignedReviewer = item.assignedReviewer.trim().toLowerCase() === identity;
        const stageCreator = item.createdBy.trim().toLowerCase() === identity;
        return (assignedReviewer && item.status === 'in_review') ||
          (stageCreator && item.status === 'returned');
      });
      if (stage) {
        return {
          review,
          stage,
          action: stage.status === 'returned' ? 'resubmit' as const : 'review' as const,
        };
      }
    }
    return null;
  }, [visibleReviews, reviewWorkflows, currentUser]);

  const visibleOverviewData = useMemo(() => {
    const sorted = [...visibleReviews].sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    const pending = visibleReviews.filter(review =>
      ['pending', 'partially_approved'].includes(review.decisionStatus)
    );
    const approved = visibleReviews.filter(review =>
      ['approved_with_changes', 'approved_as_is'].includes(review.decisionStatus)
    );
    const rejected = visibleReviews.filter(review => review.decisionStatus === 'rejected');
    const totalFindings = visibleReviews.reduce((sum, review) => sum + (review.findings?.length || 0), 0);
    const unresolvedFindings = visibleReviews.reduce((sum, review) => sum + (review.summary?.unresolvedFindings || 0), 0);
    const severityDistribution = visibleReviews.reduce((counts, review) => {
      review.findings?.forEach(finding => {
        if (finding.severity in counts) counts[finding.severity as keyof typeof counts] += 1;
      });
      return counts;
    }, { critical: 0, high: 0, medium: 0, low: 0, informational: 0 });

    return {
      ...(overviewData || {}),
      counts: {
        ...(overviewData?.counts || {}),
        reviewedDocuments: visibleReviews.length,
        totalFindings,
        unresolvedFindings,
      },
      reviewStatistics: {
        total: visibleReviews.length,
        completed: approved.length + rejected.length,
        pending: pending.length,
        approved: approved.length,
        partiallyApproved: visibleReviews.filter(review => review.decisionStatus === 'partially_approved').length,
        rejected: rejected.length,
      },
      severityDistribution,
      pendingReviews: pending.map(review => ({
        id: review.id,
        title: review.title,
        contentType: review.contentType,
        reviewer: review.reviewer,
        updatedAt: review.updatedAt,
        unresolvedFindings: review.summary?.unresolvedFindings || 0,
        decisionStatus: review.decisionStatus,
      })),
      recentReviews: sorted.slice(0, 5).map(review => ({
        ...review,
        findingsCount: review.findings?.length || 0,
      })),
      recentDecisions: sorted.filter(review =>
        ['approved_with_changes', 'approved_as_is', 'rejected'].includes(review.decisionStatus)
      ).slice(0, 5),
    };
  }, [overviewData, visibleReviews]);

  const featuredSample = useMemo(() => {
    const scenarioIndexByProfile: Record<string, number> = {
      'usr-admin-1': 0,
      'usr-rev-1': 1,
      'usr-rev-2': 2,
    };
    return SAMPLE_DOCUMENTS[scenarioIndexByProfile[currentUser.id] ?? 0];
  }, [currentUser.id]);

  // Sync tab changes to localStorage
  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    try {
      localStorage.setItem('brandguard_current_tab', tab);
    } catch {
      // Ignore
    }
  };

  // Sync activeReview changes to localStorage
  const handleSetActiveReview = (review: ReviewDocument | null) => {
    setActiveReview(review);
    try {
      if (review?.id) {
        localStorage.setItem('brandguard_active_review_id', review.id);
      } else {
        localStorage.removeItem('brandguard_active_review_id');
      }
    } catch {
      // Ignore
    }
  };

  const handleProfileChange = (userId: string) => {
    selectDemoProfile(userId);
    handleSetActiveReview(null);
    setDraftToLoad(null);
    handleSelectTab('overview');
    void loadAllData();
  };

  const handleEntryProfileChange = (userId: string) => {
    selectDemoProfile(userId);
    handleSetActiveReview(null);
    setDraftToLoad(null);
  };

  const handleSwitchDemo = () => {
    handleSetActiveReview(null);
    setDraftToLoad(null);
    returnToDemoPicker();
  };

  // Load all data from API endpoints
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [ov, gl, tm, ft, src, rev, ins] = await Promise.allSettled([
        api.getOverview(),
        api.getGuidelines(),
        api.getTerminology(),
        api.getFacts(),
        api.getSources(),
        api.getReviews(),
        api.getInsights(),
      ]);
      if (ins.status === 'fulfilled') {
        setInsights(ins.value);
        setInsightsError(null);
      } else {
        setInsightsError('Governance analytics could not be loaded. Check the FastAPI connection and try again.');
      }

      if (ov.status === 'fulfilled') setOverviewData(ov.value);
      if (gl.status === 'fulfilled') setGuidelines(gl.value);
      if (tm.status === 'fulfilled') setTerminology(tm.value);
      if (ft.status === 'fulfilled') setFacts(ft.value);
      if (src.status === 'fulfilled') setSources(src.value);
      if (rev.status === 'fulfilled') {
        const fetchedReviews = rev.value as ReviewDocument[];
        setReviews(fetchedReviews);

        // Load reviewer assignments so each demo persona can see stages assigned to them.
        const workflowResults = await Promise.allSettled(
          fetchedReviews.map(review => api.getReviewWorkflow(review.id))
        );
        const nextWorkflows: Record<string, ReviewWorkflowStage[]> = {};
        workflowResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            nextWorkflows[fetchedReviews[index].id] = result.value;
          }
        });
        setReviewWorkflows(nextWorkflows);

        // Restore only an explicitly selected review; never open another persona's record by default.
        const savedReviewId = localStorage.getItem('brandguard_active_review_id');
        if (savedReviewId) {
          const match = fetchedReviews.find(r => r.id === savedReviewId);
          setActiveReview(match || null);
        } else {
          setActiveReview(prev => prev
            ? fetchedReviews.find(r => r.id === prev.id) || null
            : null
          );
        }
      }
    } catch (err) {
      console.warn('API error, relying on local state:', err);
    } finally {
      setIsLoading(false);
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers
  const handleStartNewReview = () => {
    handleSetActiveReview(null);
    setDraftToLoad(null);
    handleSelectTab('review_studio');
  };

  const handleOpenSampleDraft = (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    handleSetActiveReview(null);
    setDraftToLoad(sample);
    handleSelectTab('review_studio');
  };

  const handleSelectReview = async (reviewId: string) => {
    try {
      const doc = await api.getReview(reviewId);
      handleSetActiveReview(doc);
      setDraftToLoad(null);
      handleSelectTab('review_studio');
    } catch {
      const localDoc = visibleReviews.find(r => r.id === reviewId);
      if (localDoc) {
        handleSetActiveReview(localDoc);
        setDraftToLoad(null);
        handleSelectTab('review_studio');
      }
    }
  };

  const handleReviewCreated = (doc: ReviewDocument) => {
    handleSetActiveReview(doc);
    setDraftToLoad(null);
    loadAllData();
  };

  const handleDecisionUpdated = (doc: ReviewDocument) => {
    handleSetActiveReview(doc);
    setReviews(prev => prev.map(r => r.id === doc.id ? doc : r));
    loadAllData();
  };

  const handleDeleteReview = async (review: ReviewDocument) => {
    if (!['pending', 'partially_approved'].includes(review.decisionStatus)) {
      window.alert('Only pending reviews can be permanently deleted from Pending Reviews.');
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete "${review.title}"? This also deletes its findings, suggestions, workflow stages and audit history. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await api.deleteReview(review.id);
      if (activeReview?.id === review.id) handleSetActiveReview(null);
      await loadAllData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete this review. Please try again.');
    }
  };

  const pendingReviewsList = visibleReviews.filter(r =>
    ['pending', 'partially_approved'].includes(r.decisionStatus)
  );
  const pendingReviewsCount = pendingReviewsList.length;
  const unresolvedCount = visibleOverviewData.counts?.unresolvedFindings ?? 0;

  if (!hasEnteredDemo) {
    return (
      <DemoEntryScreen
        selectedUser={currentUser}
        onSelectUser={handleEntryProfileChange}
        onEnter={enterDemo}
      />
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      <NavigationRail
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onProfileChange={handleProfileChange}
        onSwitchDemo={handleSwitchDemo}
        unresolvedCount={unresolvedCount}
        pendingReviewsCount={pendingReviewsCount}
      />

      <div className={`flex-1 min-w-0 min-h-0 ${['review_studio', 'brand_intelligence', 'decision_archive'].includes(currentTab) ? 'overflow-hidden' : 'overflow-y-auto'} bg-[#F8FAFC]`}>
        <TopHeader
          currentTab={currentTab}
          onNewReviewClick={handleStartNewReview}
          onRefreshClick={loadAllData}
          isRefreshing={isLoading}
          activeFindingsCount={activeReview?.summary?.unresolvedFindings}
        />
        <main className={`${['review_studio', 'brand_intelligence', 'decision_archive'].includes(currentTab) ? 'h-[calc(100dvh-76px)] min-h-0 overflow-hidden' : 'min-h-[calc(100dvh-76px)]'} bg-[#F8FAFC]`}>
          {currentTab === 'overview' && (
            <>
              <DemoJourneyBanner
                currentUser={currentUser}
                sample={featuredSample}
                onOpenSample={handleOpenSampleDraft}
                assignedTask={assignedWorkflowTask}
                onOpenAssignedReview={reviewId => { void handleSelectReview(reviewId); }}
              />
              <OverviewView
                overviewData={visibleOverviewData}
                onStartReview={handleStartNewReview}
                onOpenSampleDraft={handleOpenSampleDraft}
                onSelectReview={handleSelectReview}
                onNavigateToPending={() => handleSelectTab('pending_reviews')}
              />
            </>
          )}

          {currentTab === 'pending_reviews' && (
            <PendingReviewsView
              reviews={visibleReviews}
              onOpenReview={review => handleSelectReview(review.id)}
              onStartNewReview={handleStartNewReview}
              onDeleteReview={handleDeleteReview}
            />
          )}

          {currentTab === 'review_studio' && (
            <ReviewStudio
              activeReview={activeReview}
              onReviewCreated={handleReviewCreated}
              onDecisionUpdated={handleDecisionUpdated}
              initialDraftToLoad={draftToLoad}
              onNavigateToLedger={() => handleSelectTab('decision_archive')}
              onNavigateToPending={() => handleSelectTab('pending_reviews')}
              onNavigateHome={() => handleSelectTab('overview')}
              onNavigateToEvidenceIngestion={() => handleSelectTab('evidence_ingestion')}
            />
          )}

          {currentTab === 'evidence_ingestion' && (
            <EvidenceIngestionView
              onDataChanged={loadAllData}
              onNavigateToKnowledgeBase={recordId => {
                setKnowledgeFocusId(recordId);
                handleSelectTab('brand_intelligence');
              }}
            />
          )}

          {currentTab === 'brand_intelligence' && (
            <BrandIntelligenceView
              guidelines={guidelines}
              terminology={terminology}
              facts={facts}
              sources={sources}
              onDataChanged={loadAllData}
              focusRecordId={knowledgeFocusId}
              onFocusHandled={() => setKnowledgeFocusId(null)}
            />
          )}

          {currentTab === 'decision_archive' && (
            <DecisionArchiveView
              reviews={visibleReviews}
              onOpenReview={review => handleSelectReview(review.id)}
            />
          )}

          {currentTab === 'governance_insights' && (
            <GovernanceInsightsView
              insights={insights}
              isLoading={insightsLoading}
              error={insightsError}
              onRetry={() => {
                setInsightsLoading(true);
                api.getInsights()
                  .then(value => { setInsights(value); setInsightsError(null); })
                  .catch(() => setInsightsError('Governance analytics could not be loaded. Check the FastAPI connection and try again.'))
                  .finally(() => setInsightsLoading(false));
              }}
              onNavigateToIntelligence={() => handleSelectTab('brand_intelligence')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DemoProfileProvider>
      <AppContent />
    </DemoProfileProvider>
  );
}
