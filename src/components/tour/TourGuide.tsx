import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTourStore } from '@/store/tourStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { TOUR_STEPS } from './tourSteps';

const SEEN_KEY_PREFIX = 'payrole_tour_seen_';
// Only the roles that land on the "no setup wizard, here's what to do first"
// COMPANY_ADMIN_NAV flow this tour walks through (see Sidebar.tsx / User story flow Part 3).
const TOUR_ROLES = ['tenant_admin', 'super_admin'];
const GAP = 16;
const PAD = 8;

interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function measure(tourId: string): Rect | null {
  const el = document.querySelector(`[data-tour-id="${tourId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

export default function TourGuide() {
  const { active, stepIndex, next, back, end } = useTourStore();
  const user = useAuthStore((s) => s.user);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Auto-start once per user, only for the roles this specific 3-step flow applies to.
  useEffect(() => {
    if (!user || active) return;
    if (!TOUR_ROLES.includes(user.role)) return;
    const seenKey = `${SEEN_KEY_PREFIX}${user.id}`;
    if (localStorage.getItem(seenKey)) return;
    const timer = setTimeout(() => useTourStore.getState().start(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sidebar is a hidden slide-out panel on mobile - force it open for the
  // duration of the tour so the same "arrow points at nav item" pattern works
  // there too, then restore it when the tour ends.
  useEffect(() => {
    if (!active) return;
    const wasOpen = useUiStore.getState().sidebarOpen;
    useUiStore.getState().setSidebarOpen(true);
    return () => {
      if (!wasOpen) useUiStore.getState().setSidebarOpen(false);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;
    const reposition = () => setRect(measure(step.tourId));
    // Sidebar open/width transitions over 300ms (see Sidebar.tsx) - measure
    // once immediately, then again after the transition settles.
    reposition();
    const settleTimer = setTimeout(reposition, 320);
    window.addEventListener('resize', reposition);
    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener('resize', reposition);
    };
  }, [active, stepIndex, step]);

  if (!active || !step) return null;

  const finishTour = () => {
    if (user) localStorage.setItem(`${SEEN_KEY_PREFIX}${user.id}`, '1');
    end();
  };

  if (!rect) {
    // Target not found/rendered yet (e.g. role has no matching nav item) -
    // don't show a floating, unanchored tour.
    return null;
  }

  const spot = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    right: rect.right + PAD,
    bottom: rect.bottom + PAD,
  };

  const tooltipWidth = 300;
  const spaceRight = window.innerWidth - spot.right;
  const placeRight = spaceRight >= tooltipWidth + GAP;

  const tooltipStyle: React.CSSProperties = placeRight
    ? {
        top: Math.min(
          Math.max(rect.top + rect.height / 2 - 90, 12),
          window.innerHeight - 190,
        ),
        left: spot.right + GAP,
        width: tooltipWidth,
      }
    : {
        top: Math.min(spot.bottom + GAP, window.innerHeight - 220),
        left: 16,
        right: 16,
        width: 'auto',
      };

  const dimStyle: React.CSSProperties = {
    position: 'fixed',
    background: 'rgba(15,46,35,0.55)',
    backdropFilter: 'blur(1px)',
    zIndex: 9997,
  };

  return (
    <>
      {/* Four-box dim frame around the spotlighted nav item */}
      <div style={{ ...dimStyle, top: 0, left: 0, right: 0, height: spot.top }} />
      <div style={{ ...dimStyle, top: spot.bottom, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...dimStyle, top: spot.top, left: 0, width: spot.left, height: spot.bottom - spot.top }} />
      <div style={{ ...dimStyle, top: spot.top, left: spot.right, right: 0, height: spot.bottom - spot.top }} />

      {/* Spotlight ring around the target */}
      <div
        style={{
          position: 'fixed',
          top: spot.top,
          left: spot.left,
          width: spot.right - spot.left,
          height: spot.bottom - spot.top,
          borderRadius: 10,
          boxShadow: '0 0 0 3px #4FAD72, 0 0 24px rgba(79,173,114,0.55)',
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          zIndex: 9999,
          background: '#F7FAF8',
          border: '1px solid #CDEFD7',
          borderRadius: 12,
          boxShadow: '0 20px 50px rgba(15,46,35,0.25)',
          padding: 20,
          ...tooltipStyle,
        }}
      >
        {/* Arrow pointing back at the target - only when placed to the right */}
        {placeRight && (
          <div
            style={{
              position: 'absolute',
              left: -8,
              top: 24,
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #F7FAF8',
            }}
          />
        )}

        <button
          onClick={finishTour}
          aria-label="Skip tour"
          style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#1F6F4E', opacity: 0.6 }}
        >
          <X size={16} />
        </button>

        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4FAD72', marginBottom: 8 }}>
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F2E23', marginBottom: 8 }}>{step.title}</h3>
        <p style={{ fontSize: 13.5, color: '#1F6F4E', lineHeight: 1.55, marginBottom: 16 }}>{step.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={finishTour}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1F6F4E', fontSize: 13, opacity: 0.75 }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepIndex > 0 && (
              <button
                onClick={back}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CDEFD7', background: 'white', color: '#0F2E23', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? finishTour : next}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1F6F4E', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
