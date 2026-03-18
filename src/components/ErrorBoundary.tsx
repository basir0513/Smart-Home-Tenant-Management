import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export const ErrorBoundary: any = class extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-800 text-center">
            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Something went wrong</h2>
            <p className="text-slate-500 mb-8 font-medium">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
