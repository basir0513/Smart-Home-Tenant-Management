import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export const FirestoreErrorBoundary: any = class extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Firestore Error Boundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      let errorMessage = 'An unexpected error occurred while accessing the database.';
      let isPermissionError = false;

      try {
        const errorData = JSON.parse(this.state.error?.message || '{}');
        if (errorData.error?.includes('permission-denied') || errorData.error?.includes('insufficient permissions')) {
          isPermissionError = true;
          errorMessage = `Access Denied: You don't have permission to perform this action (${errorData.operationType} on ${errorData.path}).`;
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message?.includes('permission-denied') || this.state.error?.message?.includes('insufficient permissions')) {
          isPermissionError = true;
          errorMessage = "Access Denied: You don't have permission to view this data.";
        }
      }

      return (
        <div className="p-12 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-400/10 rounded-3xl flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-400/5">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-white tracking-tight">Database Error</h3>
            <p className="text-slate-400 max-w-md mx-auto font-medium">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-2xl text-sm font-bold hover:bg-slate-700 transition-all active:scale-95"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
