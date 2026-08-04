import { useContext } from 'react';
import { AppContext } from './AppContextObject';

export function useApp() {
  return useContext(AppContext);
}
