import { createContext, useContext, useState, type PropsWithChildren } from 'react';
const InviteIntent = createContext<{ code: string | null; remember: (code: string | null) => void }>({ code: null, remember: () => {} });
/** Keeps the explicit invitation across login navigation in this app session; never auto-redeems. */
export function InviteIntentProvider({ children }: PropsWithChildren) {
 const [code, remember] = useState<string | null>(null);
 return <InviteIntent.Provider value={{ code, remember }}>{children}</InviteIntent.Provider>;
}
export function useInviteIntent() { return useContext(InviteIntent); }
