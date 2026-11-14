// All movable wall props: native 1920 × 480 coordinates, including their shadows.
// The board swap preserves each slot's lower edge so taller art stays above the counter.
// Change x/y here and rebuild: artwork, hit target, label and focus camera move together.
export const SCENE_OBJECTS = {
  tv: { x: 492, y: 126, width: 148, height: 100, asset: 'tv-crt.svg' },
  vhs: { x: 492, y: 230, width: 148, height: 44, asset: 'vhs-shelf.svg' },
  library: { x: 348, y: 99, width: 119, height: 167, asset: 'library-prop.png' },
  events: { x: 1144, y: 99, width: 127, height: 161, asset: 'events-prop.png' },
  team: { x: 1406, y: 152, width: 140, height: 112, asset: 'team-board.svg' },
  speakers: { x: 758, y: 148, width: 136, height: 112, asset: 'speakers-board.svg' },
};
export const TEAM_BOARD = SCENE_OBJECTS.team;
