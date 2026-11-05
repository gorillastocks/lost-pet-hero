// Playable heroes. These are not the lost pets.

export const DEFAULT_AVATAR = 'avery';

export const AVATARS = [
  { id: 'avery', name: 'Avery', group: 'kid', note: 'Backpack and freckles' },
  { id: 'kai', name: 'Kai', group: 'kid', note: 'Hero cape' },
  { id: 'mira', name: 'Mira', group: 'kid', note: 'Curly hair and explorer hat' },
  { id: 'sam', name: 'Sam', group: 'kid', note: 'Short hair and a scarf' },
  { id: 'fox', name: 'Fox kit', group: 'animal', note: 'Orange plush fox' },
  { id: 'bunny', name: 'Bunny', group: 'animal', note: 'Soft gray bunny' },
  { id: 'owl', name: 'Owl chick', group: 'animal', note: 'Round purple owl' },
  { id: 'panda', name: 'Panda cub', group: 'animal', note: 'Black-and-white panda' },
];

export function avatarById(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

export function normaliseAvatar(id) {
  return avatarById(id).id;
}

/** Missing or unknown choice falls back to Avery and still asks the picker. */
export function readAvatarChoice(raw) {
  const known = AVATARS.some((a) => a.id === raw?.avatar);
  return {
    avatar: known ? raw.avatar : DEFAULT_AVATAR,
    avatarChosen: raw?.avatarChosen === true && known,
  };
}
