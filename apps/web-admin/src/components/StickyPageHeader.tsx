import { useRef, useEffect, useState } from 'react';
import PageHeader from './PageHeader';

interface Props {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export default function StickyPageHeader({ title, description, action }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Root must be the actual scroll container (.admin-main), not the viewport.
    // With root:null the sentinel never leaves the viewport since .admin-main
    // clips the content, so the observer would never fire.
    const scrollRoot = sentinel.closest('.admin-main') as Element | null;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: scrollRoot, threshold: 0, rootMargin: '0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 1px sentinel sits just above the sticky bar */}
      <div ref={sentinelRef} style={{ height: 1, marginBottom: -1, pointerEvents: 'none' }} />
      <div className={`sticky-page-header${stuck ? ' sticky-page-header--stuck' : ''}`}>
        <PageHeader title={title} description={description} action={action} />
      </div>
    </>
  );
}
