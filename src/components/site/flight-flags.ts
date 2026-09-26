import { useEffect, useState } from 'react';
import { onFlight } from '@/lib/flight/bus';

export function useFlightFlag(type: 'free' | 'sound') {
  const [on, setOn] = useState(false);
  useEffect(() => onFlight(type, v => setOn(Boolean(v))), [type]);
  return on;
}
