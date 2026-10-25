import { useState } from 'react';
import { PartSheet } from './parts.jsx';

/** For screens that open part sheets: returns [sheet element or null, open(partId)]. */
export function usePartSheet(unit) {
  const [open, setOpen] = useState(null);
  const sheet = open ? <PartSheet key={open} partId={open} unit={unit} onClose={() => setOpen(null)} /> : null;
  return [sheet, setOpen];
}
