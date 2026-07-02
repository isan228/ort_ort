/** Публичный URL логотипа вуза (раздаётся через /uploads/universities). */
export function buildUniversityLogoUrl(storageKey) {
  if (!storageKey) return null;
  return `/uploads/universities/${storageKey}`;
}

export function attachUniversityLogo(json) {
  if (!json) return json;
  const data = json.toJSON ? json.toJSON() : { ...json };
  data.logo_url = buildUniversityLogoUrl(data.logo?.storage_key);
  return data;
}
