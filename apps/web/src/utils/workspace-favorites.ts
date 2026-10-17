const favoriteStorageKey = (userId: string) => `toggle-ctrl:favorites:${userId}`;

export function readLegacyWorkspaceFavoriteIds(userId: string): string[] {
  try {
    const saved = localStorage.getItem(favoriteStorageKey(userId));
    const favoriteIds: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(favoriteIds)
      ? favoriteIds.filter((favoriteId): favoriteId is string => typeof favoriteId === "string")
      : [];
  } catch {
    return [];
  }
}

export function clearLegacyWorkspaceFavoriteIds(userId: string): void {
  localStorage.removeItem(favoriteStorageKey(userId));
}
