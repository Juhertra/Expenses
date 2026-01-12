import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ShowMoreButtonProps<T> {
  items: T[];
  initialDisplay?: number;
  increment?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}

/**
 * Generic "show more" pagination component for long lists
 * Provides better performance than rendering all items at once
 */
export function ShowMoreButton<T>({
  items,
  initialDisplay = 50,
  increment = 50,
  renderItem,
  emptyMessage = 'No items to display',
}: ShowMoreButtonProps<T>) {
  const [displayCount, setDisplayCount] = useState(initialDisplay);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;
  const remaining = items.length - displayCount;

  return (
    <>
      {displayedItems.map((item, index) => (
        <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
      ))}

      {hasMore && (
        <button
          onClick={() => setDisplayCount(prev => Math.min(prev + increment, items.length))}
          className="w-full py-3 mt-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronDown className="w-5 h-5" />
          <span>
            Show {Math.min(remaining, increment)} more
            {remaining > increment && ` of ${remaining}`}
          </span>
        </button>
      )}

      {displayCount > initialDisplay && (
        <button
          onClick={() => setDisplayCount(initialDisplay)}
          className="w-full py-2 mt-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          Show less
        </button>
      )}
    </>
  );
}

