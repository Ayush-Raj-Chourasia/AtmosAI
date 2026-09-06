export const INCIDENT_CONFIG = {
  rainfall: {
    icon: 'water_drop',
    color: 'blue',
    label: 'Heavy Rainfall',
    classes: {
      feed: 'bg-blue-50 border-blue-100 text-blue-500',
      header: 'bg-blue-500',
      mapMarker: 'bg-blue-500',
    },
  },
  thunderstorm: {
    icon: 'thunderstorm',
    color: 'amber',
    label: 'Thunderstorm',
    classes: {
      feed: 'bg-amber-50 border-amber-100 text-amber-500',
      header: 'bg-amber-500',
      mapMarker: 'bg-amber-500',
    },
  },
  flood: {
    icon: 'flood',
    color: 'cyan',
    label: 'Urban Flood',
    classes: {
      feed: 'bg-cyan-50 border-cyan-100 text-cyan-500',
      header: 'bg-cyan-500',
      mapMarker: 'bg-cyan-500',
    },
  },
  heatwave: {
    icon: 'wb_sunny',
    color: 'rose',
    label: 'Heatwave',
    classes: {
      feed: 'bg-rose-50 border-rose-100 text-rose-500',
      header: 'bg-rose-500',
      mapMarker: 'bg-rose-500',
    },
  },
  fog: {
    icon: 'foggy',
    color: 'slate',
    label: 'Dense Fog',
    classes: {
      feed: 'bg-slate-50 border-slate-100 text-slate-500',
      header: 'bg-slate-500',
      mapMarker: 'bg-slate-500',
    },
  },
  dust_storm: {
    icon: 'air',
    color: 'orange',
    label: 'Dust Storm',
    classes: {
      feed: 'bg-orange-50 border-orange-100 text-orange-500',
      header: 'bg-orange-500',
      mapMarker: 'bg-orange-500',
    },
  },
  strong_wind: {
    icon: 'storm',
    color: 'purple',
    label: 'Strong Winds',
    classes: {
      feed: 'bg-purple-50 border-purple-100 text-purple-500',
      header: 'bg-purple-500',
      mapMarker: 'bg-purple-500',
    },
  },
  other: {
    icon: 'warning',
    color: 'emerald',
    label: 'Weather Alert',
    classes: {
      feed: 'bg-emerald-50 border-emerald-100 text-emerald-500',
      header: 'bg-emerald-500',
      mapMarker: 'bg-emerald-500',
    },
  },
  default: {
    icon: 'warning',
    color: 'slate',
    label: 'Weather Observation',
    classes: {
      feed: 'bg-slate-50 border-slate-100 text-slate-400',
      header: 'bg-slate-500',
      mapMarker: 'bg-slate-500',
    },
  },
} as const;

export type IncidentType = keyof typeof INCIDENT_CONFIG;

export const getIncidentConfig = (type: string) => {
  if (!type) return INCIDENT_CONFIG.default;
  const normalized = type.toLowerCase().replace(/[-\s]/g, '_') as IncidentType;
  return INCIDENT_CONFIG[normalized] || INCIDENT_CONFIG.default;
};

export const getIncidentIconName = (type: string) => getIncidentConfig(type).icon;

export const getIncidentColorClass = (type: string, context: 'feed' | 'header' | 'mapMarker') => {
  const config = getIncidentConfig(type);
  return config.classes[context] || INCIDENT_CONFIG.default.classes[context];
};
