let runtime;

// Called only after opening the dialog; keep the renderer out of the About chunk.
export function loadBadgeRuntime() {
  if (!runtime) {
    runtime = import('@google/model-viewer').then(({ ModelViewerElement }) => {
      // Release inactive model geometry when the only viewer is closed.
      ModelViewerElement.modelCacheSize = 0;
      return customElements.whenDefined('model-viewer');
    }).catch(error => {
      runtime = null;
      throw error;
    });
  }
  return runtime;
}
