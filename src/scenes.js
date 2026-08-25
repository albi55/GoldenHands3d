/**
 * Scene registry — the single place you edit when adding a model.
 *
 * Each entry is one exported .blend. `onClick` points at the id of the
 * scene to travel to when the model is clicked. Set it to null for a
 * dead-end scene.
 */
export const SCENES = {
  building: {
    id: 'building',
    file: '/models/GoldenHands3d_Building.glb',
    label: 'Golden Hands 4',
    tooltip: null,
    onClick: null,
  },
};

export const START_SCENE = 'building';
