import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource-variable/roboto-condensed";
import { App } from "./App.jsx";
import { AppRecoveryBoundary, AppRecoveryScreen } from "./AppRecoveryBoundary.jsx";
import { PageLoader } from "./PageLoader.jsx";
import { PitRadioProvider } from "./PitRadioContext.jsx";
import {
  chunkRecoveryConfig,
  installChunkRecovery,
  removeChunkRecoveryQuery,
} from "./app/chunk-recovery.js";
import "./styles.css";
import "./pit-radio.css";
import './i18n/localized-layout.css';
import { initializeLocale } from './i18n/runtime.js';
import { installShareRoutes, installShareMetadata } from './app/share-route.js';
import { createWechatSharing } from './app/wechat-share.js';

const configureWechat = createWechatSharing(window, window.location.href);
installShareRoutes(window, import.meta.env.BASE_URL);
if (import.meta.env.PROD) installShareMetadata(window, configureWechat, import.meta.env.BASE_URL);
installChunkRecovery();

const rootElement = document.getElementById("root");
const applicationRoot = createRoot(rootElement);

applicationRoot.render(<PageLoader kicker="glfans" label="正在翻到这一页" />);

initializeLocale()
  .then(() => {
    applicationRoot.render(
      <React.StrictMode>
        <AppRecoveryBoundary>
          <PitRadioProvider>
            <App />
          </PitRadioProvider>
        </AppRecoveryBoundary>
      </React.StrictMode>,
    );
    window.setTimeout(() => removeChunkRecoveryQuery(), chunkRecoveryConfig.cooldownMs);
  })
  .catch((error) => {
    console.error("glfans bootstrap failed", error);
    applicationRoot.render(
      <AppRecoveryScreen
        title="页面暂时没有打开"
        message="网站可能刚好完成更新，请重新加载一次。"
        error={error}
      />,
    );
  });
