import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { searchWorkspaces } from "../utils/search-workspaces.js";
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
      const serverFavoritesPage = await searchWorkspaces("", { scopes: ["favorites"] });
      const serverFavorites = serverFavoritesPage.items;
      if (serverFavorites.length > 0) {
        clearLegacyWorkspaceFavoriteIds(userId);
        return serverFavorites;
      }

      const legacyFavoriteIds = readLegacyWorkspaceFavoriteIds(userId);
      if (legacyFavoriteIds.length === 0) return serverFavorites;

      const migrationResults = await Promise.allSettled(
        legacyFavoriteIds.map((organizationId) =>
          setWorkspaceFavorite({ organizationId, isFavorite: true }),
        ),
      );
      if (migrationResults.every((result) => result.status === "fulfilled")) {
        clearLegacyWorkspaceFavoriteIds(userId);
      }
      return (await searchWorkspaces("", { scopes: ["favorites"] })).items;
    },
    staleTime: 30_000,
  });
  const favoriteMutation = useMutation({
    mutationFn: (variables: SetWorkspaceFavoriteVariables) => setWorkspaceFavorite(variables),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["workspace-search"] }),
        queryClient.invalidateQueries({ queryKey: ["organization-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const favoriteWorkspaces = favoritesQuery.data ?? [];
  const favoriteIds = favoriteWorkspaces.map((workspace) => workspace.id);

  function toggleFavorite(
    organizationId: string,
    isCurrentlyFavorite = favoriteIds.includes(organizationId),
  ) {
    favoriteMutation.mutate({
      organizationId,
      isFavorite: !isCurrentlyFavorite,
    });
  }

  return {
    favoriteIds,
    favoriteWorkspaces,
    isFavoriteLoading: favoritesQuery.isPending,
    hasLoadedFavorites: favoritesQuery.isSuccess,
    isFavoritePending: favoriteMutation.isPending,
    toggleFavorite,
  };
}
