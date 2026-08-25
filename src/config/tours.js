/**
 * Tour registry — the single place you edit when adding a 360° interior tour.
 *
 * Each entry is one unit. `url` is the Coohom share link (the "embed" or
 * public view URL, not the editor URL). `label` is what the button and the
 * overlay header show.
 *
 * Add a unit here and it is available to mountApartmentTour — the component
 * itself never needs touching.
 */
export const TOURS = {
  unit2: {
    label: 'Apartamenti Nr. 2 (2+1)',
    url: 'https://www.coohom.com/pub/modelo/viewer/preview/3FO3CYS0MSC1',
  },
};

/** True once a tour's url has actually been filled in. */
export function isTourReady(tour) {
  return Boolean(tour?.url) && !tour.url.startsWith('<');
}
