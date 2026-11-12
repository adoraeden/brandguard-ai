import React from 'react';

import { useDemoProfile } from '../../context/DemoProfileContext';
import { DocumentIngestionPanel } from './DocumentIngestionPanel';

interface EvidenceIngestionViewProps {
  onDataChanged: () => void;
  onNavigateToKnowledgeBase: (recordId: string) => void;
}

export const EvidenceIngestionView: React.FC<EvidenceIngestionViewProps> = ({
  onDataChanged,
  onNavigateToKnowledgeBase,
}) => {
  const { isAdmin } = useDemoProfile();

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-3 py-3 md:px-4">
        <DocumentIngestionPanel
          isAdmin={isAdmin}
          onDataChanged={onDataChanged}
          onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
          standalone
        />
      </div>
    </div>
  );
};
