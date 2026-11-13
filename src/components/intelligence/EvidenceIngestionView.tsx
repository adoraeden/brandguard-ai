import React from 'react';

import { DocumentIngestionPanel } from './DocumentIngestionPanel';

interface EvidenceIngestionViewProps {
  onDataChanged: () => void;
  onNavigateToKnowledgeBase: (recordId: string) => void;
}

export const EvidenceIngestionView: React.FC<EvidenceIngestionViewProps> = ({
  onDataChanged,
  onNavigateToKnowledgeBase,
}) => {

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-3 py-3 md:px-4">
        <DocumentIngestionPanel
          onDataChanged={onDataChanged}
          onNavigateToKnowledgeBase={onNavigateToKnowledgeBase}
          standalone
        />
      </div>
    </div>
  );
};
