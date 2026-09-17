import { t } from "./i18n/runtime.js";
import { requireCatalog } from './i18n/runtime.js';
import { useLocale } from './i18n/LanguageSwitcher.jsx';
import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { GlobalFooter } from "./GlobalFooter.jsx";
import { FilingNotice } from "./FilingNotice.jsx";
import { MobileSectionNav } from "./MobileSectionNav.jsx";
import { hasMobileNavigation } from "./app/mobile-navigation.js";
import { PageLoader } from "./PageLoader.jsx";
import { RouteReadyBoundary } from "./RouteReadyBoundary.jsx";
import { DEFAULT_ROUTE, ROUTE_LOADING_COPY, parseHashRoute } from "./app/routes.js";
import { normalizeDocumentUrl } from './app/share-route.js';

const AboutPage = lazy(() => import("./AboutPage.jsx").then((module) => ({ default: module.AboutPage })));
const ArchivePage = lazy(() => import("./ArchivePage.jsx").then((module) => ({ default: module.ArchivePage })));
const CpPage = lazy(() => import("./features/cp/CpPage.jsx").then(module => ({ default: module.CpPage })));

const ColumnExperience = lazy(() => import("./Column.jsx").then((module) => ({ default: module.ColumnExperience })));
const MemesPage = lazy(() => import("./MemesPage.jsx").then((module) => ({ default: module.MemesPage })));

function readEntryRoute() {
  const destination = normalizeDocumentUrl(window.location.href, import.meta.env.BASE_URL, true, window.navigator.userAgent);
  if (destination.href !== window.location.href) window.history.replaceState(window.history.state, "", destination);
  return parseHashRoute(destination.hash)[0] || DEFAULT_ROUTE;
}

function readRouteKey() {
  return window.location.hash || "#/";
}

export function App() {
  useLocale();
  requireCatalog();
  const [rootRoute, setRootRoute] = useState(readEntryRoute);
  const [routeKey, setRouteKey] = useState(readRouteKey);
  const loadingCopy = ROUTE_LOADING_COPY[rootRoute] ?? ROUTE_LOADING_COPY[DEFAULT_ROUTE];
  const showMobileNavigation = hasMobileNavigation(rootRoute);

  useEffect(() => {
    const update = () => {
      setRootRoute(readEntryRoute());
      setRouteKey(readRouteKey());
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("popstate", update); };
  }, []);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event('glfans:route-ready'));
    window.history.scrollRestoration = "manual";
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const frame = requestAnimationFrame(resetScroll);

    return () => {
      cancelAnimationFrame(frame);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [routeKey]);

  const page = rootRoute === "about"
    ? <AboutPage key={routeKey} defaultRightsOpen={routeKey.startsWith("#/about/rights")} />
    : rootRoute === "cp" ? <CpPage />
    : rootRoute === "column" ? <ColumnExperience />
    : rootRoute === "memes" ? <MemesPage /> : <ArchivePage />;

  return (
    <div className={`app-shell${rootRoute === "cp" ? " app-shell--cp" : ""}${rootRoute === "archive" ? " app-shell--archive" : ""}${showMobileNavigation ? " has-mobile-navigation" : ""}`}>
      <Suspense fallback={<PageLoader kicker={loadingCopy.kicker} label={loadingCopy.label} />}>
        <RouteReadyBoundary
          routeKey={routeKey}
          kicker={loadingCopy.kicker}
          label={loadingCopy.label}
          navigation={showMobileNavigation ? <MobileSectionNav activePath={rootRoute} /> : null}
        >
          {t(page)}
          {t(rootRoute !== "about" && <GlobalFooter />)}
          {t(
            <footer className={`route-filing-footer route-filing-footer--${rootRoute}${rootRoute !== "about" ? " route-filing-footer--mobile-only" : ""}`}>
              <FilingNotice />
            </footer>
          )}
        </RouteReadyBoundary>
      </Suspense>
    </div>
  );
}
