import { createContext, useContext } from 'react';

/** define(termId) opens the definition sheet. Null outside the provider, where terms render as plain text. */
export const DefineContext = createContext(null);

export const useDefine = () => useContext(DefineContext);
