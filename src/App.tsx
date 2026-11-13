import React, { useState, useEffect } from 'react';
import { NavigationRail, NavTab } from './components/layout/NavigationRail';
import { TopHeader } from './components/layout/TopHeader';
import { OverviewView } from './components/overview/OverviewView';
import { ReviewStudio } from './components/review/ReviewStudio';
import { BrandIntelligenceView } from './components/intelligence/BrandIntelligenceView';
import { EvidenceIngestionView } from './components/intelligence/EvidenceIngestionView';
import { DecisionArchiveView } from './components/archive/DecisionArchiveView';
import { GovernanceInsightsView } from './components/insights/GovernanceInsightsView';
import { PendingReviewsView } from './components/pending/PendingReviewsView';
import { DemoProfileProvider } from './context/DemoProfileContext';
import { api } from './services/apiClient';
import { 
  BrandGuideline, 
  TerminologyEntry, 
  ApprovedFact, 
  KnowledgeSource, 
  ReviewDocument, 
  GovernanceInsights 
} from './types';
import { SAMPLE_DOCUMENTS } from './data/mockData';

function AppContent() {
  // Navigation & Review Persistence (Requirement 3)
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  
  // Data State
  const [overviewData, setOverviewData] = useState<any>(null);
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [terminology, setTerminology] = useState<TerminologyEntry[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [reviews, setReviews] = useState<ReviewDocument[]>([]);
  const [insights, setInsights] = useState<GovernanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Review Studio Active Document State
  const [activeReview, setActiveReview] = useState<ReviewDocument | null>(null);
  const [knowledgeFocusId, setKnowledgeFocusId] = useState<string | null>(null);
  const [draftToLoad, setDraftToLoad] = useState<typeof SAMPLE_DOCUMENTS[0] | null>(null);

  const [isLoading, setIsLoading] = useState(false);

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
        
        // Restore active review from localStorage or previous state
        const savedReviewId = localStorage.getItem('brandguard_active_review_id');
        if (savedReviewId) {
          const match = fetchedReviews.find(r => r.id === savedReviewId);
          if (match) {
            setActiveReview(match);
          } else {
            setActiveReview(prev => {
              if (!prev) return fetchedReviews[0] || null;
              return fetchedReviews.find((r: ReviewDocument) => r.id === prev.id) || prev;
            });
          }
        } else {
          setActiveReview(prev => {
            if (!prev) return fetchedReviews[0] || null;
            return fetchedReviews.find((r: ReviewDocument) => r.id === prev.id) || prev;
          });
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
      const localDoc = reviews.find(r => r.id === reviewId);
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
    // Update reviews array locally
    setReviews(prev => prev.map(r => r.id === doc.id ? doc : r));
    loadAllData();
  };

  const handleDeleteReview = async (review: ReviewDocument) => {
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

  const pendingReviewsList = reviews.filter(r => ['pending', 'partially_approved'].includes(r.decisionStatus));
  const pendingReviewsCount = pendingReviewsList.length;

  const unresolvedCount = overviewData?.counts?.unresolvedFindings ?? 
    reviews.reduce((sum, r) => sum + (r.summary?.unresolvedFindings || 0), 0);

  return (
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Left Spatial Navigation Rail */}
      <NavigationRail
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        unresolvedCount={unresolvedCount}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main Content Area: the whole workspace scrolls; only the navigation rail stays fixed */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-[#F8FAFC]">
        <TopHeader
          currentTab={currentTab}
          onNewReviewClick={handleStartNewReview}
          onRefreshClick={loadAllData}
          isRefreshing={isLoading}
          activeFindingsCount={activeReview?.summary?.unresolvedFindings}
        />
        <main className="min-h-[calc(100dvh-76px)] bg-[#F8FAFC]">
          {currentTab === 'overview' && (
            <OverviewView
              overviewData={overviewData}
              onStartReview={handleStartNewReview}
              onOpenSampleDraft={handleOpenSampleDraft}
              onSelectReview={handleSelectReview}
              onNavigateToPending={() => handleSelectTab('pending_reviews')}
            />
          )}

          {currentTab === 'pending_reviews' && (
            <PendingReviewsView
              reviews={reviews}
              onOpenReview={(r) => {
                handleSelectReview(r.id);
              }}
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
            />
          )}

          {currentTab === 'evidence_ingestion' && (
            <EvidenceIngestionView onDataChanged={loadAllData} onNavigateToKnowledgeBase={(recordId) => { setKnowledgeFocusId(recordId); handleSelectTab('brand_intelligence'); }} />
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
              reviews={reviews}
              onOpenReview={(r) => {
                handleSelectReview(r.id);
              }}
              onDeleteReview={handleDeleteReview}
            />
          )}

          {currentTab === 'governance_insights' && (
            <GovernanceInsightsView
              insights={insights}
              isLoading={insightsLoading}
              error={insightsError}
              onRetry={() => {
                setInsightsLoading(true);
                api.getInsights().then(value => { setInsights(value); setInsightsError(null); })
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
