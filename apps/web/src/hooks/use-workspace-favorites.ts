import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getWorkspaceFavorites } from "../utils/get-workspace-favorites.js";
import { setWorkspaceFavorite } from "../utils/set-workspace-favorite.js";
import {
  clearLegacyWorkspaceFavoriteIds,
  readLegacyWorkspaceFavoriteIds,
} from "../utils/workspace-favorites.js";
import type { SetWorkspaceFavoriteVariables } from "../utils/workspace-favorites.types.js";

function workspaceFavoritesQueryKey(userId: string) {
  return ["workspace-favorites", userId] as const;
}

export function useWorkspaceFavorites(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceFavoritesQueryKey(userId);
  const favoritesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const serverFavoriteIds = await getWorkspaceFavorites();
      if (serverFavoriteIds.length > 0) {
        clearLegacyWorkspaceFavoriteIds(userId);
        return serverFavoriteIds;
      }

      const legacyFavoriteIds = readLegacyWorkspaceFavoriteIds(userId);
      if (legacyFavoriteIds.length === 0) return serverFavoriteIds;

      const migrationResults = await Promise.allSettled(
        legacyFavoriteIds.map((organizationId) =>
          setWorkspaceFavorite({ organizationId, isFavorite: true }),
        ),
      );
      if (migrationResults.every((result) => result.status === "fulfilled")) {
        clearLegacyWorkspaceFavoriteIds(userId);
      }
      return getWorkspaceFavorites();
    },
    staleTime: 30_000,
  });
  const favoriteMutation = useMutation({
    mutationFn: (variables: SetWorkspaceFavoriteVariables) => setWorkspaceFavorite(variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast.error(error.message),
  });
  const favoriteIds = favoritesQuery.data ?? [];

  function toggleFavorite(organizationId: string) {
    favoriteMutation.mutate({
      organizationId,
      isFavorite: !favoriteIds.includes(organizationId),
    });
  }

  return {
    favoriteIds,
    isFavoriteLoading: favoritesQuery.isPending,
    isFavoritePending: favoriteMutation.isPending,
    toggleFavorite,
  };
}
