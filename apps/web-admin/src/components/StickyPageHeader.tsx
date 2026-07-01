import { useRef, useEffect, useState } from 'react';
import PageHeader from './PageHeader';

interface Props {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export default function StickyPageHeader({ title, description, action }: Props) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const scrollRoot = el.closest('.admin-main') as HTMLElement | null;
    const target = scrollRoot ?? window;

    function onScroll() {
      const scrollTop = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
      setStuck(scrollTop > 4);
    }

    target.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={headerRef} className={`sticky-page-header${stuck ? ' sticky-page-header--stuck' : ''}`}>
      <PageHeader title={title} description={description} action={action} />
    </div>
  );
}
