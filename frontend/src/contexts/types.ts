export type AuthContextType = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};
