import { t } from "./i18n/runtime.js";
import { requireCatalog } from './i18n/runtime.js';
import { useLocale } from './i18n/LanguageSwitcher.jsx';
import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { GlobalFooter } from "./GlobalFooter.jsx";
import { GlobalRadioDock } from "./GlobalRadioDock.jsx";
import { FilingNotice } from "./FilingNotice.jsx";
import { MobileSectionNav } from "./MobileSectionNav.jsx";
import { hasMobileNavigation } from "./app/mobile-navigation.js";
import { PageLoader } from "./PageLoader.jsx";
import { RouteReadyBoundary } from "./RouteReadyBoundary.jsx";
import { ROOT_ROUTES, ROUTE_LOADING_COPY, parseHashRoute, welcomeLinks } from "./app/routes.js";
import { shouldSkipHomeJourney } from "./features/home/home-journey-state.js";
import { normalizeShareUrl } from './app/share-route.js';

const HomePage = lazy(() => import("./HomePage.jsx").then((module) => ({ default: module.HomePage })));
const AdminPage = lazy(() => import("./AdminPage.jsx").then((module) => ({ default: module.AdminPage })));
const AboutPage = lazy(() => import("./AboutPage.jsx").then((module) => ({ default: module.AboutPage })));
const ArchivePage = lazy(() => import("./ArchivePage.jsx").then((module) => ({ default: module.ArchivePage })));
const ColumnExperience = lazy(() => import("./Column.jsx").then((module) => ({ default: module.ColumnExperience })));
const MemesPage = lazy(() => import("./MemesPage.jsx").then((module) => ({ default: module.MemesPage })));
const PitRadioPage = lazy(() => import("./PitRadioPage.jsx").then((module) => ({ default: module.PitRadioPage })));
const WordsTideLab = lazy(() => import("./WordsTideLab.jsx").then((module) => ({ default: module.WordsTideLab })));
const CpPage = lazy(() => import("./features/cp/CpPage.jsx").then(module => ({ default: module.CpPage })));

function readRootRoute() {
  const rootRoute = parseHashRoute(window.location.hash)[0];
  if (!rootRoute) return "home";
  return ROOT_ROUTES.includes(rootRoute) ? rootRoute : "home";
}

function readEntryRoute() {
  const rootRoute = readRootRoute();
  if (rootRoute !== "home") return rootRoute;
  if (!shouldSkipHomeJourney(window.location.search, import.meta.env.DEV, window)) return rootRoute;
  const firstHomeDestination = welcomeLinks[0];
  if (!firstHomeDestination) return rootRoute;
  const destination = new URL(firstHomeDestination.href, window.location.href);
  window.history.replaceState(window.history.state, "", normalizeShareUrl(destination.href, import.meta.env.BASE_URL));
  return firstHomeDestination.id;
}

function readRouteKey() {
  return window.location.hash || "#/";
}

export function App() {
  useLocale();
  requireCatalog();
  const [rootRoute, setRootRoute] = useState(readEntryRoute);
  const [routeKey, setRouteKey] = useState(readRouteKey);
  const loadingCopy = ROUTE_LOADING_COPY[rootRoute] ?? ROUTE_LOADING_COPY.home;
  const showMobileNavigation = hasMobileNavigation(rootRoute);

  useEffect(() => {
    const update = () => {
      setRootRoute(readEntryRoute());
      setRouteKey(readRouteKey());
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
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

  useEffect(() => {
    const currentRoot = parseHashRoute(window.location.hash)[0];
    if (currentRoot && !ROOT_ROUTES.includes(currentRoot)) {
      window.history.replaceState(null, "", "#/");
    }
  }, []);

  let page;

  if (rootRoute === "home") {
    page = <HomePage />;
  } else if (rootRoute === "admin") {
    page = <AdminPage />;
  } else if (rootRoute === "about") {
    page = <AboutPage key={routeKey} defaultRightsOpen={routeKey.startsWith("#/about/rights")} />;
  } else if (rootRoute === "tide-words") {
    page = <WordsTideLab />;
  } else if (rootRoute === "archive") {
    page = <ArchivePage />;
  } else if (rootRoute === "cp") {
    page = <CpPage />;
  } else if (rootRoute === "radio") {
    page = <PitRadioPage />;
  } else if (rootRoute === "memes") {
    page = <MemesPage />;
  } else {
    page = <ColumnExperience />;
  }

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
          {t(rootRoute !== "home" && rootRoute !== "about" && rootRoute !== "admin" && <GlobalFooter />)}
          {t(rootRoute !== "home" && (
            <footer className={`route-filing-footer route-filing-footer--${rootRoute}${rootRoute !== "about" && rootRoute !== "admin" ? " route-filing-footer--mobile-only" : ""}`}>
              <FilingNotice />
            </footer>
          ))}
        </RouteReadyBoundary>
      </Suspense>
      <GlobalRadioDock hidden={rootRoute === "radio" || rootRoute === "admin"} />
    </div>
  );
}
