import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Tabs overflow horizontally on mobile with the scrollbar hidden below -
  // without these fades there's no visual hint that swiping reveals more
  // tabs, so extra tabs (e.g. a 4th/5th one) look cut off rather than scrollable.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateEdges = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    updateEdges();
    el.addEventListener('scroll', updateEdges);
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [tabs.length]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="border-b border-mint-light flex gap-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium cursor-pointer relative transition-colors shrink-0',
                isActive
                  ? 'text-deep-cash font-semibold'
                  : 'text-cash-green hover:text-deep-cash',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-mint-light text-cash-green rounded-full px-1.5">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-fresh-cash" />
              )}
            </button>
          );
        })}
      </div>
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-px w-6 bg-gradient-to-r from-white to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-px w-6 bg-gradient-to-l from-white to-transparent" />
      )}
    </div>
  );
}
