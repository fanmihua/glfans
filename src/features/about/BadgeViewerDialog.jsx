import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { withBase } from '../../lib/assets.js';
import { listenToMediaQuery } from '../../lib/browser-compat.js';
import { loadBadgeRuntime } from './badge-runtime.js';
import './badge-viewer.css';

const INITIAL_FOV = '30deg';
const STUDIO_ENVIRONMENT = withBase('assets/about/badge-studio-260a23f008e5a281.hdr');
const LOAD_TIMEOUT = 30000;
const asset = name => withBase(`assets/about/badge-viewer-${name}.svg`);
let failedLoadCount = 0;

function initialOrbit(stage) {
  // The reference stage is about 85% as tall as it is wide. Pull back on
  // narrower stages to keep the same side margins on portrait phones.
  const aspect = stage.clientHeight / stage.clientWidth;
  const distance = 130 * Math.min(1.2, Math.max(1, aspect / 0.85));
  return `0deg 90deg ${Math.round(distance)}%`;
}

export function BadgeViewerDialog({ modelUrl, posterUrl, copy, onClose, returnFocusRef }) {
  const dialogRef = useRef(null);
  const holderRef = useRef(null);
  const viewerRef = useRef(null);
  const copyRef = useRef(copy);
  const backdropPressRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', progress: 0 });
  copyRef.current = copy;
  const ready = state.status === 'ready';
  const failed = state.status === 'error';

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = returnFocusRef?.current || document.activeElement;
    const { scrollX, scrollY } = window;
    const body = document.body;
    const root = document.documentElement;
    const savedBody = Object.fromEntries(['overflow', 'position', 'top', 'left', 'width', 'paddingRight'].map(key => [key, body.style[key]]));
    const savedRoot = { overflow: root.style.overflow, scrollBehavior: root.style.scrollBehavior };
    const scrollbar = window.innerWidth - root.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `${-scrollY}px`, left: `${-scrollX}px`, width: '100%' });
    Object.assign(root.style, { overflow: 'hidden', scrollBehavior: 'auto' });
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('button')?.focus({ preventScroll: true });
    return () => {
      if (dialog.close) dialog.close();
      Object.assign(body.style, savedBody);
      root.style.overflow = savedRoot.overflow;
      window.scrollTo(scrollX, scrollY);
      root.style.scrollBehavior = savedRoot.scrollBehavior;
      // A responsive layout change may have hidden the original trigger.
      const target = opener?.isConnected && opener.getClientRects().length ? opener
        : Array.from(document.querySelectorAll('.about-badge-trigger')).find(node => node.getClientRects().length);
      target?.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);

  useEffect(() => {
    let stopped = false;
    let failedAttempt = false;
    let viewer;
    let removeMotionListener = () => {};
    setState({ status: 'loading', progress: 0 });
    const fail = reason => {
      if (stopped || failedAttempt) return;
      failedAttempt = true;
      clearTimeout(timeout);
      viewerRef.current = null;
      if (viewer) {
        // model-viewer caches failed URLs too; give retries a fresh cache key.
        failedLoadCount++;
        viewer.src = null;
        viewer.remove();
      }
      setState({ status: 'error', progress: 0, reason });
    };
    const timeout = setTimeout(() => fail('timeout'), LOAD_TIMEOUT);
    const onProgress = event => {
      if (stopped || failedAttempt) return;
      const progress = Math.min(99, Math.max(0, Math.round((event.detail?.totalProgress || 0) * 100)));
      setState(current => current.status === 'loading' ? { ...current, progress } : current);
    };
    const onLoad = async () => {
      clearTimeout(timeout);
      await viewer.updateComplete;
      if (stopped || failedAttempt) return;
      viewer.jumpCameraToGoal();
      setState({ status: 'ready', progress: 100 });
    };
    const onError = event => fail(event.detail?.type === 'webglcontextlost' ? 'unsupported' : 'failed');

    if (!window.customElements || !window.WebGL2RenderingContext) fail('unsupported');
    else loadBadgeRuntime().then(async () => {
      if (stopped || failedAttempt) return;
      viewer = document.createElement('model-viewer');
      const attributes = {
        'camera-controls': '', 'disable-pan': '', 'disable-tap': '',
        'camera-orbit': initialOrbit(holderRef.current), 'camera-target': 'auto auto auto',
        'min-camera-orbit': 'auto 5deg auto', 'max-camera-orbit': 'auto 175deg 170%',
        'field-of-view': INITIAL_FOV, 'min-field-of-view': '14deg', 'max-field-of-view': '40deg',
        'interaction-prompt': 'none', 'touch-action': 'none',
        'environment-image': STUDIO_ENVIRONMENT, exposure: '1', 'tone-mapping': 'neutral',
        loading: 'eager', reveal: 'auto', alt: copyRef.current.model,
      };
      for (const [name, value] of Object.entries(attributes)) viewer.setAttribute(name, value);
      viewer.a11y = copyRef.current.a11y;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updateMotion = () => { viewer.interpolationDecay = reducedMotion.matches ? 0 : 90; };
      updateMotion();
      removeMotionListener = listenToMediaQuery(reducedMotion, updateMotion);
      viewer.addEventListener('progress', onProgress);
      viewer.addEventListener('load', onLoad);
      viewer.addEventListener('error', onError);
      viewerRef.current = viewer;
      holderRef.current.append(viewer);
      // Settle the lighting attributes before loading the model so both assets
      // are handled by the same load and retry flow.
      await viewer.updateComplete;
      if (stopped || failedAttempt) return;
      const requestUrl = new URL(modelUrl, window.location.href);
      if (failedLoadCount) requestUrl.searchParams.set('badgeRetry', String(failedLoadCount));
      viewer.src = requestUrl.href;
    }).catch(() => fail('failed'));

    return () => {
      stopped = true;
      clearTimeout(timeout);
      removeMotionListener();
      viewerRef.current = null;
      if (viewer) {
        viewer.removeEventListener('progress', onProgress);
        viewer.removeEventListener('load', onLoad);
        viewer.removeEventListener('error', onError);
        viewer.src = null;
        viewer.remove();
      }
    };
  }, [modelUrl, attempt]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) { viewer.alt = copy.model; viewer.a11y = copy.a11y; }
  }, [copy]);

  const reset = () => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    viewer.cameraTarget = 'auto auto auto';
    viewer.cameraOrbit = initialOrbit(holderRef.current);
    viewer.fieldOfView = INITIAL_FOV;
    viewer.jumpCameraToGoal();
  };

  const handleKeyDown = event => {
    if (!dialogRef.current.showModal && event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 'Tab') {
      const controls = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), [tabindex="0"]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };

  return createPortal(
    <dialog
      id="about-badge-viewer" ref={dialogRef} className="badge-viewer-dialog"
      aria-modal="true" aria-labelledby="badge-viewer-title" aria-describedby="badge-viewer-hint"
      onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={handleKeyDown}
      onPointerDown={event => { backdropPressRef.current = event.target === event.currentTarget; }}
      onClick={event => { if (event.target === event.currentTarget && backdropPressRef.current) onClose(); }}
    >
      <section className="badge-viewer-panel" data-state={state.status}>
        <div className="badge-viewer-light" aria-hidden="true" />
        <header className="badge-viewer-header">
          <h2 id="badge-viewer-title" className="badge-viewer-sr-only">{copy.title}</h2>
          <button className="badge-viewer-close" type="button" onClick={onClose} aria-label={copy.close}>
            <img src={asset('close')} alt="" width="24" height="24" />
          </button>
        </header>
        <div className="badge-viewer-stage" aria-busy={state.status === 'loading'}>
          <img className="badge-viewer-shadow" src={asset('shadow')} alt="" aria-hidden="true" />
          <div className="badge-viewer-model" ref={holderRef} aria-hidden={!ready} inert={!ready} />
          {!ready && <div className={`badge-viewer-fallback${failed ? ' is-error' : ''}`}>
            <img className="badge-viewer-poster" src={posterUrl} alt={copy.title} width="768" height="768" />
            <div className="badge-viewer-message" role="status">
              <p>{failed ? copy[state.reason] : copy.loading}</p>
              {failed ? <button className="badge-viewer-retry" type="button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button> : <>
                <div className="badge-viewer-progress" role="progressbar" aria-label={copy.loading} aria-valuemin="0" aria-valuemax="100" aria-valuenow={state.progress}>
                  <span style={{ width: `${state.progress}%` }} />
                </div>
                <span className="badge-viewer-percentage" aria-hidden="true">{state.progress}%</span>
              </>}
            </div>
          </div>}
        </div>
        <p id="badge-viewer-hint" className="badge-viewer-hint">{ready ? copy.hint : '\u00a0'}</p>
        <div className="badge-viewer-toolbar" role="group" aria-label={copy.title}>
          <button type="button" disabled={!ready} aria-label={copy.zoomIn} title={copy.zoomIn} onClick={() => viewerRef.current?.zoom(1)}>
            <img src={asset('zoom-in')} alt="" width="24" height="24" />
          </button>
          <button type="button" disabled={!ready} aria-label={copy.zoomOut} title={copy.zoomOut} onClick={() => viewerRef.current?.zoom(-1)}>
            <img src={asset('zoom-out')} alt="" width="24" height="24" />
          </button>
          <button type="button" disabled={!ready} aria-label={copy.reset} title={copy.reset} onClick={reset}>
            <img src={asset('reset')} alt="" width="24" height="24" />
          </button>
        </div>
      </section>
    </dialog>, document.body,
  );
}
