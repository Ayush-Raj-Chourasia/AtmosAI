export function determineStatus(input: {
  signalCount: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}): 'monitor' | 'alert' {
  const { signalCount, confidence, severity } = input;

  // High confidence + severe = alert (effectively confirmed)
  if (confidence >= 0.8 && severity === 'high' && signalCount >= 3) {
    return 'alert';
  }

  // Medium confidence or growing chatter
  if (confidence >= 0.6 && signalCount >= 2) {
    return 'alert';
  }

  // Default: keep watching
  return 'monitor';
}
