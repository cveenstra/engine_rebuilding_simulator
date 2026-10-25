import { useParams } from 'react-router-dom';
import { UNIT_BY_ID } from '../data/index.js';

export const DISCLAIMER =
  'Rebuild Bench is a study aid for memorizing rebuild order. It is not a service manual. Every torque, clearance, angle and fluid value must be verified against the factory service manual for your exact unit before you touch a wrench.';

/** The unit named in the route, or null. */
export function useUnit() {
  const { id } = useParams();
  return UNIT_BY_ID[id] || null;
}
