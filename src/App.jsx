import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import Icon from './components/Icon.jsx';
import Garage from './views/Garage.jsx';
import UnitOverview from './views/UnitOverview.jsx';
import Walkthrough from './views/Walkthrough.jsx';
import OrderDrill from './views/OrderDrill.jsx';
import WhatsNext from './views/WhatsNext.jsx';
import SpecCards from './views/SpecCards.jsx';
import FullRun from './views/FullRun.jsx';
import Review from './views/Review.jsx';
import Compare from './views/Compare.jsx';
import More from './views/More.jsx';
import About from './views/About.jsx';
import PartsGallery from './views/PartsGallery.jsx';
import PartDetail from './views/PartDetail.jsx';
import PictureQuiz from './views/PictureQuiz.jsx';
import Credits from './views/Credits.jsx';
import Dictionary from './views/Dictionary.jsx';
import Terms from './views/Terms.jsx';
import TermDrill from './views/TermDrill.jsx';
import ConceptMap from './views/ConceptMap.jsx';
import Mistakes from './views/Mistakes.jsx';
import MistakeDrill from './views/MistakeDrill.jsx';
import { GlossaryProvider } from './components/glossary.jsx';

/** Which bottom tab a path belongs to. */
function groupOf(pathname) {
  if (pathname === '/' || pathname.startsWith('/unit/') || pathname.startsWith('/part/')) return 'garage';
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/compare')) return 'compare';
  if (pathname.startsWith('/terms') || pathname.startsWith('/dictionary')) return 'terms';
  return 'more';
}

/** Game screens drop the tab bar so their own action bar sits under the thumb. */
const isGameScreen = (pathname) => /^\/unit\/[^/]+\/(walk|order|next|specs|run|parts\/quiz|mistakes\/drill)$/.test(pathname) || pathname === '/review' || pathname === '/terms/drill';

const TABS = [
  { key: 'garage', label: 'Garage', icon: 'garage', to: '/' },
  { key: 'review', label: 'Review', icon: 'review', to: '/review' },
  { key: 'terms', label: 'Terms', icon: 'book', to: '/terms' },
  { key: 'compare', label: 'Compare', icon: 'compare', to: '/compare' },
  { key: 'more', label: 'More', icon: 'more', to: '/more' },
];

const DESKTOP_NAV = [
  { to: '/', label: 'Garage', end: true },
  { to: '/review', label: 'Review due' },
  { to: '/terms', label: 'Terms' },
  { to: '/dictionary', label: 'Dictionary' },
  { to: '/compare', label: 'Compare' },
  { to: '/more', label: 'Progress and settings' },
  { to: '/about', label: 'About' },
];

function Logo() {
  return (
    <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2.5" aria-label="Rebuild Bench home">
      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand text-brand-ink">
        <Icon name="wrench" size={18} strokeWidth={2} />
      </span>
      <span className="truncate text-base font-semibold text-ink">
        Rebuild <span className="text-heat-text">Bench</span>
      </span>
    </Link>
  );
}

export default function App() {
  const location = useLocation();
  const { pathname } = location;
  const group = groupOf(pathname);
  const game = isGameScreen(pathname);
  const here = pathname + location.search;

  // Remember the last place visited in each tab so switching tabs returns there.
  const [lastSeen, setLastSeen] = useState({ here: '', map: {} });
  if (lastSeen.here !== here) setLastSeen({ here, map: { ...lastSeen.map, [group]: here } });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <GlossaryProvider>
      <div className="min-h-screen bg-canvas text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>

        <header className="print-hide sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <Logo />
            <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 lg:flex">
              {DESKTOP_NAV.map((n) => (
                <NavLink
                  key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) => `whitespace-nowrap rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive ? 'bg-brand-soft font-medium text-brand-text' : 'text-ink-2 hover:bg-sunken hover:text-ink'}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main id="main" className={`mx-auto max-w-5xl px-4 pt-4 sm:pt-6 ${game ? 'pb-actionbar' : 'pb-tabbar'}`}>
          <Routes>
            <Route path="/" element={<Garage />} />
            <Route path="/unit/:id" element={<UnitOverview />} />
            <Route path="/unit/:id/walk" element={<Walkthrough />} />
            <Route path="/unit/:id/order" element={<OrderDrill />} />
            <Route path="/unit/:id/next" element={<WhatsNext />} />
            <Route path="/unit/:id/specs" element={<SpecCards />} />
            <Route path="/unit/:id/run" element={<FullRun />} />
            <Route path="/unit/:id/mistakes" element={<Mistakes />} />
            <Route path="/unit/:id/mistakes/drill" element={<MistakeDrill />} />
            <Route path="/review" element={<Review />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/more" element={<More />} />
            <Route path="/about" element={<About />} />
            <Route path="/unit/:id/parts" element={<PartsGallery />} />
            <Route path="/unit/:id/parts/quiz" element={<PictureQuiz />} />
            <Route path="/part/:partId" element={<PartDetail />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/dictionary/:termId" element={<Dictionary />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms/drill" element={<TermDrill />} />
            <Route path="/terms/map" element={<ConceptMap />} />
            <Route path="*" element={
              <div className="py-10 text-center text-base text-ink-2">
                Page not found. <Link className="font-medium text-brand-text underline" to="/">Back to the garage</Link>.
              </div>
            } />
          </Routes>

          <footer className="print-hide mt-10 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
            Study aid only, not a service manual. Verify every spec against the factory service manual for your exact
            unit before you work on it.{' '}
            <Link to="/about" className="underline">About and disclaimer</Link>
          </footer>
        </main>

        {!game && (
          <nav
            aria-label="Tabs"
            className="print-hide safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90 lg:hidden"
          >
            <div className="mx-auto grid max-w-xl grid-cols-5">
              {TABS.map((t) => {
                const active = group === t.key;
                const to = active ? t.to : lastSeen.map[t.key] || t.to;
                return (
                  <Link
                    key={t.key} to={to} aria-current={active ? 'page' : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                      active ? 'text-brand-text' : 'text-ink-3 hover:text-ink'}`}
                  >
                    <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-brand-soft' : ''}`}>
                      <Icon name={t.icon} size={21} strokeWidth={active ? 2.1 : 1.8} />
                    </span>
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </GlossaryProvider>
  );
}
