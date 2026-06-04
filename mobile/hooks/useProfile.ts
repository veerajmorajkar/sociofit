import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, getUserProfile, updateProfile } from '@/services/users.service';
import type { UpdateProfileParams } from '@/services/users.service';
import type { UserProfile } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId),
    staleTime: 1000 * 60 * 3,
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: (params: UpdateProfileParams) => updateProfile(params),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserProfile | undefined>(['profile', 'me'], (prev) =>
        prev ? { ...prev, ...updated } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      if (user && accessToken && refreshToken) {
        void setAuth(
          {
            ...user,
            displayName: updated.displayName ?? user.displayName,
            username: updated.username ?? user.username,
            avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : user.avatarUrl,
            bio: updated.bio !== undefined ? updated.bio : user.bio,
          },
          accessToken,
          refreshToken,
        );
      }
    },
  });
}
