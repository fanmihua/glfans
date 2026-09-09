import { Component } from "react";
import { reloadCurrentPage } from "./app/chunk-recovery.js";

export function AppRecoveryScreen({
  title = "这一页没有加载完整",
  message = "页面遇到了兼容性问题，或网站刚好完成更新。重新加载后会回到你正在看的位置。",
  error = null,
}) {
  const errorName = typeof error?.name === "string" ? error.name : "Error";
  const errorMessage = typeof error?.message === "string" ? error.message : "";
  const diagnostic = error ? `${errorName}: ${errorMessage || "Unknown client error"}`.slice(0, 320) : "";

  return (
    <main className="app-recovery" role="alert">
      <div className="app-recovery__card">
        <span>GLFANS · PAGE RECOVERY</span>
        <h1>{title}</h1>
        <p>{message}</p>
        {diagnostic && (
          <details className="app-recovery__diagnostic">
            <summary>诊断信息</summary>
            <code>{diagnostic}</code>
          </details>
        )}
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
    return <AppRecoveryScreen error={this.state.error} />;
  }
}
