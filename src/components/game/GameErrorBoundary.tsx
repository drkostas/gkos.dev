import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catch-all error boundary for the game UI. If any React component
 * in the explore mode tree throws during render, this shows a
 * reload prompt instead of a white screen.
 */
export default class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GameErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "#1a1a2e",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#f8f8f8",
          fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48 }}>:(</div>
          <div style={{ fontSize: 18 }}>Something went wrong.</div>
          <div style={{ fontSize: 12, color: "#888", maxWidth: 400 }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 16,
              padding: "8px 24px",
              background: "#3868c0",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            RELOAD GAME
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
