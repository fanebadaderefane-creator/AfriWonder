export interface WebVideoRecorderProps {
  visible: boolean;
  onClose: () => void;
  onCaptured: (result: { uri: string; mimeType: string; durationSec: number }) => void;
  maxDurationSec?: number;
}
