import { Component } from 'react';

/**
 * Catches a render error and shows what went wrong.
 *
 * Without this, one thrown error unmounts the whole tree and the visitor
 * gets a black rectangle with nothing to report — which is exactly what a
 * missing import produced once already. A build that succeeds proves the
 * modules resolve, not that they run, so the failure surfaces here.
 *
 * The message is in English on purpose: it is for whoever is working on
 * the site, not for a customer, and in production it sits behind a plain
 * Albanian line.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[golden-hands] render failed', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash">
        <p className="crash-note">
          Faqja nuk u ngarkua dot. Provoni ta rifreskoni.
        </p>
        {import.meta.env?.DEV && (
          <>
            <h1 className="crash-title">Render failed</h1>
            <pre className="crash-detail">{String(error?.stack || error)}</pre>
          </>
        )}
      </div>
    );
  }
}
