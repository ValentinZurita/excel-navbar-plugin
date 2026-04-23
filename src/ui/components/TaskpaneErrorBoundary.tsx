import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for the Sheet Navigator task pane.
 *
 * Office Add-ins cannot be refreshed like a normal web page.
 * If React crashes inside the task pane, the user gets a blank
 * shell with no recovery path. This boundary catches those
 * crashes, shows a calm message, and surfaces the error so
 * it can be reported instead of silently swallowed.
 */
export class TaskpaneErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TaskpaneErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '16px',
            fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
            fontSize: '14px',
            color: '#323130',
            backgroundColor: '#faf9f8',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p style={{ marginBottom: '16px', maxWidth: '280px', lineHeight: 1.5 }}>
            Sheet Navigator encountered an unexpected issue. Please close and reopen the task pane
            to continue.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: '11px',
                color: '#a80000',
                backgroundColor: '#fde7e9',
                padding: '8px 12px',
                borderRadius: '4px',
                maxWidth: '280px',
                overflow: 'auto',
                wordBreak: 'break-word',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '16px',
              padding: '6px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#0078d4',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
