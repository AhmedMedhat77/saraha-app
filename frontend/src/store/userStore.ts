import type { User } from "@/types/user";
import { create } from "zustand";

type userStore = {
  token: string | null;
  setToken: (token: string) => void;

  user: User | null;
  setUser: (user: User) => void;

  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;

  logout: () => void;
};

export const userStore = create<userStore>((set) => {
  return {
    token: null,
    user: null,
    isLoggedIn: false,

    setUser: (user: User) => set({ user }),
    setToken: (token: string) => set({ token }),
    setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
    logout: () => {
        
      window.localStorage.removeItem("token");
      set({ token: null, user: null, isLoggedIn: false });
    },
  };
});
