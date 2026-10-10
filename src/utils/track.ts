type DataLayerEvent = Record<string, unknown> & { event: string };

function normalize(value: unknown): unknown {
  if (typeof value === 'number') return Number.isInteger(value) ? value : Math.round(value);
  if (typeof value === 'string') return value.slice(0, 100);
  return value;
}

export function track(event: string, params: Record<string, unknown> = {}) {
  const payload: DataLayerEvent = { event };
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    payload[key] = normalize(value);
  });
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}
