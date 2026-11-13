import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Database,
  Globe2,
  Menu,
  Moon,
  Sun,
  X,
  Smartphone,
} from 'lucide-react';
import { WorkspaceProvider } from './data/Workspace';
import Evidence from './components/Evidence';
const Install = lazy(() => import('./pages/Install'));
const Account = lazy(() => import('./pages/Account'));
const Topics = lazy(() => import('./pages/Topics'));
const MyArea = lazy(() => import('./pages/MyArea'));
const SavedInvestigations = lazy(() => import('./pages/SavedInvestigations'));
const Study = lazy(() => import('./pages/Study'));
const Water = lazy(() => import('./pages/Water'));
const Resources = lazy(() => import('./pages/Resources'));
const GettingStarted = lazy(() => import('./pages/GettingStarted'));
const NisarExplorer = lazy(() => import('./pages/NisarExplorer'));
const GlobalRadar = lazy(() => import('./pages/GlobalRadar'));
const World = lazy(() => import('./pages/World'));
const Home = lazy(() => import('./pages/RealHome')),
  Observatory = lazy(() => import('./pages/Observatory')),
  Explore = lazy(() => import('./pages/Explore')),
  Compare = lazy(() => import('./pages/Compare')),
  Analysis = lazy(() => import('./pages/Analysis')),
  Cases = lazy(() => import('./pages/Cases')),
  Knowledge = lazy(() => import('./pages/Knowledge')),
  Data = lazy(() => import('./pages/Data'));
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="empty">
        <h1>Something interrupted this view.</h1>
        <p>Your source data is unchanged. Reload to restore the workspace.</p>
        <button onClick={() => window.location.reload()}>Reload application</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `SARFlow — ${pathname === '/' ? 'See Earth Move.' : pathname.split('/')[1].replaceAll('-', ' ')}`;
  }, [pathname]);
  return null;
}
function Shell() {
  const [dark, setDark] = useState(false),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => setMenu(false), [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="SARFlow home">
          <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M3 26c9-23 17 24 34-14M3 17c9-23 17 24 34-14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.7"
            />
          </svg>
          SAR<span>Flow</span>
        </Link>
        <button
          className="mobile-menu"
          aria-label={menu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? 'open' : ''} aria-label="Main navigation">
          <NavLink to="/global-radar">Animate Earth</NavLink>
          <NavLink to="/world">World</NavLink>
          <NavLink to="/observatory">
            <Globe2 size={16} />
            Explore
          </NavLink>
          <NavLink to="/explore">
            <Clock3 size={16} />
            Analysis lab
          </NavLink>
          <NavLink to="/phenomena">Explore phenomena</NavLink>
          <NavLink to="/science">
            <BookOpen size={16} />
            Science
          </NavLink>
          <NavLink to="/data">
            <Database size={16} />
            Data
          </NavLink>
        </nav>
        <div className="header-right">
          <Link to="/account" className="account-link">
            Account
          </Link>
          <span className="project-status">
            <span />
            Research & education
          </span>
          <button
            className="theme-toggle"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <div className="workspace-nav">
        <span>
          <Activity size={13} />
          Transparent radar science
        </span>
        <nav aria-label="Workflow navigation">
          <NavLink to="/explore">Location & time</NavLink>
          <NavLink to="/compare">Before / after</NavLink>
          <NavLink to="/analysis">Change analysis</NavLink>
          <NavLink to="/water">Water change</NavLink>
          <NavLink to="/investigations">Saved investigations</NavLink>
          <NavLink to="/methodology">Methodology</NavLink>
        </nav>
      </div>
      <main id="main">
        <Suspense
          fallback={
            <div className="empty" role="status">
              Loading workspace…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/install" element={<Install />} />
            <Route path="/account" element={<Account />} />
            <Route path="/login" element={<Account />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/:topic" element={<Topics />} />
            <Route path="/phenomena" element={<Topics phenomena />} />
            <Route path="/phenomena/:topic" element={<Topics phenomena />} />
            <Route path="/my-area" element={<MyArea />} />
            <Route path="/global-radar" element={<GlobalRadar />} />
            <Route path="/study" element={<Study />} />
            <Route path="/water" element={<Water />} />
            <Route path="/investigations" element={<SavedInvestigations />} />
            <Route path="/world" element={<World />} />
            <Route path="/observatory" element={<Observatory />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/time-machine" element={<Explore />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<Cases />} />
            <Route path="/science" element={<Knowledge />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/getting-started" element={<GettingStarted />} />
            <Route path="/nisar-explorer" element={<NisarExplorer />} />
            <Route path="/methodology" element={<Knowledge />} />
            <Route path="/about" element={<Knowledge />} />
            <Route path="/data" element={<Data />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link to="/explore">Return to Explore</Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <Link to="/" className="brand">
          SARFlow
        </Link>
        <p>See Earth Move. Understand the evidence.</p>
        <div>
          <Link to="/about">About</Link>
          <Link to="/topics">Explore by topic</Link>
          <Link to="/cases">Case studies</Link>
          <Link to="/getting-started">Beginner guide</Link>
          <Link to="/install">Get the mobile app</Link>
          <Link to="/my-area">My area</Link>
          <Link to="/nisar-explorer">NISAR Explorer</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/science">
            Sources / science
            <ArrowUpRight size={12} />
          </Link>
        </div>
        <small>Independent project. No NASA or ISRO endorsement.</small>
      </footer>
      <Evidence />
      <nav className="phone-nav" aria-label="Mobile navigation">
        <NavLink to="/world">
          <Globe2 size={21} />
          Explore
        </NavLink>
        <NavLink to="/getting-started">
          <BookOpen size={21} />
          Learn
        </NavLink>
        <NavLink to="/study">
          <Database size={21} />
          Evidence
        </NavLink>
        <NavLink to="/install">
          <Smartphone size={21} />
          Install
        </NavLink>
      </nav>
      <ScrollReset />
    </>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <WorkspaceProvider>
          <Shell />
        </WorkspaceProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
