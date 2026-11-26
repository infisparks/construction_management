'use client';

import React, { useRef, useState, useEffect } from 'react';

interface ScrollableTableContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeightClassName?: string;
}

/**
 * Reusable table wrapper that mirrors a horizontal scrollbar at the TOP of the table
 * whenever columns overflow on smaller screens, plus bounded vertical scrolling.
 */
export const ScrollableTableContainer: React.FC<ScrollableTableContainerProps> = ({
  children,
  className = '',
  maxHeightClassName = 'max-h-[calc(100vh-280px)]',
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState<number>(0);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const updateSize = () => {
      setScrollWidth(el.scrollWidth);
      setHasOverflow(el.scrollWidth > el.clientWidth + 1);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [children]);

  const syncFromTop = () => {
    if (isSyncingRef.current) return;
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingRef.current = true;
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  const syncFromTable = () => {
    if (isSyncingRef.current) return;
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingRef.current = true;
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  return (
    <div className={className}>
      {hasOverflow && (
        <div
          ref={topScrollRef}
          onScroll={syncFromTop}
          className="w-full overflow-x-auto overflow-y-hidden border-b border-slate-100 bg-slate-50/70"
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}
      <div
        ref={tableScrollRef}
        onScroll={syncFromTable}
        className={`w-full overflow-x-auto overflow-y-auto ${maxHeightClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
