import { create } from "zustand";

import type { DbUser } from "@/lib/api";
import { writeCachedDbUser } from "@/lib/user-cache";

type UserStore = {
	dbUser: DbUser | null;
	isSyncing: boolean;
	syncError: string | null;
	setDbUser: (user: DbUser | null) => void;
	setSyncing: (isSyncing: boolean) => void;
	setSyncError: (error: string | null) => void;
};

export const useUserStore = create<UserStore>((set) => ({
	dbUser: null,
	isSyncing: false,
	syncError: null,
	setDbUser: (dbUser) => {
		writeCachedDbUser(dbUser);
		set({ dbUser });
	},
	setSyncing: (isSyncing) => set({ isSyncing }),
	setSyncError: (syncError) => set({ syncError }),
}));
