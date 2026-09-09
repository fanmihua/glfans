import { useEffect, useState } from "react";
import { listenToMediaQuery } from "../lib/browser-compat.js";

export function useMobileLayout() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    const stopListening = listenToMediaQuery(query, update);
    update();
    return stopListening;
  }, []);
  return mobile;
}
