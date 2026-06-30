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

    // Observe the sentinel — when it leaves the viewport, we're stuck
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      {
        // The scroll container is .admin-main; null = viewport (works because
        // .admin-main is the scrolling ancestor)
        threshold: 0,
        rootMargin: '0px',
      }
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
