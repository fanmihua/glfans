import { Component } from "react";
import { reloadCurrentPage } from "./app/chunk-recovery.js";

export function AppRecoveryScreen({
  title = "这一页没有加载完整",
  message = "可能刚好遇到网站更新。重新加载后会回到你正在看的位置。",
}) {
  return (
    <main className="app-recovery" role="alert">
      <div className="app-recovery__card">
        <span>GLFANS · PAGE RECOVERY</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <button type="button" onClick={() => reloadCurrentPage()}>
          重新加载
        </button>
      </div>
    </main>
  );
}

export class AppRecoveryBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("glfans page render failed", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <AppRecoveryScreen />;
  }
}
