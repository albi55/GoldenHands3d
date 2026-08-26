import { UI } from '../content/chapters';

/**
 * Load curtain.
 *
 * The model is ~9.5 MB, so there is a real wait to cover. The curtain
 * stays until the GLB has been parsed and framed, then fades rather than
 * cuts, which lets the camera's intro pull-in start behind it and be
 * already in motion by the time the page is visible.
 */
export default function Loader({ progress, done }) {
  const pct = Math.round(progress * 100);

  return (
    <div className={`loader${done ? ' is-done' : ''}`} aria-hidden={done}>
      <div className="loader-mark">
        Golden Hands <em>4</em>
      </div>
      <div
        className="loader-bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={UI.loading}
      >
        <div className="loader-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="loader-pct">
        {pct < 100 ? `${UI.loading} · ${pct}%` : UI.ready}
      </div>
    </div>
  );
}
