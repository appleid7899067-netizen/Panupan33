export type AuthProvider = "puter" | "openrouter";

export type AuthContext = {
  provider: AuthProvider;
  token?: string;
};

export function isSupportedProvider(provider: string): provider is AuthProvider {
  return provider === "puter" || provider === "openrouter";
}
