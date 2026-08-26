import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';

/* No StrictMode.
   It double-invokes effects in development, and the one effect this app
   has builds a WebGL context and downloads the model. The teardown is
   correct — Stage disposes the context and BuildingStage guards its load
   callback against a disposal mid-flight — so it survives the double
   mount, it just pays for the parse twice on every edit. */
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
