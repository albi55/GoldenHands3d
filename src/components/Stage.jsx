import { useEffect, useRef } from 'react';
import BuildingStage from '../three/BuildingStage';

const MODEL = '/models/GoldenHands3d_Building.glb';

/**
 * Mounts the 3D stage and hands the instance back through `stageRef`.
 *
 * Everything above the canvas is layered here rather than in the engine:
 * the gradient backdrop shows through the transparent canvas, the vignette
 * and grain sit over it, and neither takes pointer events, so a drag
 * anywhere on the stage reaches the camera.
 */
export default function Stage({ stageRef, onProgress, onReady, onError }) {
  const canvasRef = useRef(null);

  /* The callbacks are read through a ref so a parent re-render cannot tear
     down the stage and restart a 9.5 MB download. */
  const cb = useRef({ onProgress, onReady, onError });
  cb.current = { onProgress, onReady, onError };

  useEffect(() => {
    const stage = new BuildingStage(canvasRef.current);
    stageRef.current = stage;
    stage.start();

    stage
      .load(MODEL, (t) => cb.current.onProgress?.(t))
      .then(() => cb.current.onReady?.())
      .catch((err) => {
        console.error(`Could not load ${MODEL}`, err);
        cb.current.onError?.(err);
      });

    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [stageRef]);

  return (
    <div className="stage">
      <div className="stage-backdrop" />
      <div className="stage-glow" />
      {/* Not decorative: it is the subject of the page. Screen readers
          get a description of what is on it, since they cannot read a
          WebGL surface. */}
      <canvas
        className="stage-canvas"
        ref={canvasRef}
        role="img"
        aria-label="Model tredimensional i ndërtesës Golden Hands 4, i parë nga cepi i kryqëzimit."
      />
      <div className="stage-vignette" />
      <div className="stage-grain" />
    </div>
  );
}
