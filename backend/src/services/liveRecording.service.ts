import axios from 'axios';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const AGORA_API_BASE = 'https://api.agora.io/v1';
const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_CUSTOMER_KEY = process.env.AGORA_CUSTOMER_KEY || '';
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || '';
const R2_REGION = process.env.R2_REGION || 'auto';
const R2_ACCESS = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';

const agoraAuth = {
  auth: { username: AGORA_CUSTOMER_KEY, password: AGORA_CUSTOMER_SECRET },
};

function agoraUrl(path: string) {
  return `${AGORA_API_BASE}/apps/${AGORA_APP_ID}${path}`;
}

export interface RecordingResult {
  resourceId: string;
  sid: string;
}

export async function acquireRecordingResource(channelName: string, uid: number): Promise<string> {
  const res = await axios.post(
    agoraUrl('/cloud_recording/acquire'),
    {
      cname: channelName,
      uid: String(uid),
      clientRequest: {
        resourceExpiredHour: 24,
        scene: 0,
      },
    },
    agoraAuth
  );
  return res.data.resourceId;
}

export async function startCloudRecording(
  channelName: string,
  uid: number,
  token: string,
  resourceId: string
): Promise<RecordingResult> {
  const res = await axios.post(
    agoraUrl(`/cloud_recording/resourceid/${resourceId}/mode/mix/start`),
    {
      cname: channelName,
      uid: String(uid),
      clientRequest: {
        token,
        recordingConfig: {
          maxIdleTime: 30,
          streamTypes: 2,
          channelType: 1,
          videoStreamType: 0,
          transcodingConfig: {
            height: 1280,
            width: 720,
            bitrate: 2000,
            fps: 24,
            mixedVideoLayout: 1,
            backgroundColor: '#000000',
          },
        },
        storageConfig: {
          vendor: 2,
          region: R2_REGION === 'auto' ? 0 : Number(R2_REGION) || 0,
          bucket: R2_BUCKET,
          accessKey: R2_ACCESS,
          secretKey: R2_SECRET,
          fileNamePrefix: ['replays'],
          endpoint: R2_ENDPOINT,
        },
      },
    },
    agoraAuth
  );
  return { resourceId, sid: res.data.sid };
}

export async function stopCloudRecording(
  channelName: string,
  uid: number,
  resourceId: string,
  sid: string
): Promise<string | null> {
  const res = await axios.post(
    agoraUrl(`/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`),
    {
      cname: channelName,
      uid: String(uid),
      clientRequest: {},
    },
    agoraAuth
  );

  const files = res.data?.serverResponse?.fileList;
  if (!files?.length) return null;
  const fileName = files[0].fileName;
  return `${R2_ENDPOINT}/${R2_BUCKET}/${fileName}`;
}

export async function startLiveRecording(streamId: string): Promise<void> {
  if (!AGORA_APP_ID || !AGORA_CUSTOMER_KEY || !AGORA_CUSTOMER_SECRET || !R2_BUCKET || !R2_ACCESS || !R2_SECRET || !R2_ENDPOINT) {
    logger.warn('Cloud Recording non configuré — variables manquantes', { streamId });
    return;
  }

  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
  if (!stream?.room_id) return;

  try {
    const recordingUid = 1000000;
    const agoraTokenMod = await import('agora-token');
    const { RtcTokenBuilder, RtcRole } = agoraTokenMod.default ?? agoraTokenMod;
    const appCert = process.env.AGORA_APP_CERTIFICATE || '';
    const expireSec = Math.min(604800, Math.max(600, Number.parseInt(process.env.AGORA_TOKEN_EXPIRE_SECONDS || '86400', 10) || 86400));
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      appCert,
      stream.room_id,
      recordingUid,
      RtcRole.SUBSCRIBER,
      expireSec,
      expireSec
    );

    const resourceId = await acquireRecordingResource(stream.room_id, recordingUid);
    const { sid } = await startCloudRecording(stream.room_id, recordingUid, token, resourceId);

    await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        recording_resource_id: resourceId,
        recording_sid: sid,
      } as any,
    });

    logger.info('Cloud Recording démarré', { streamId, resourceId, sid });
  } catch (err) {
    logger.error('Échec démarrage Cloud Recording', err as Error, { streamId });
  }
}

export async function stopLiveRecording(streamId: string): Promise<string | null> {
  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } }) as any;
  if (!stream?.recording_resource_id || !stream?.recording_sid || !stream?.room_id) return null;

  try {
    const recordingUid = 1000000;
    const replayUrl = await stopCloudRecording(
      stream.room_id,
      recordingUid,
      stream.recording_resource_id,
      stream.recording_sid
    );

    await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        replay_url: replayUrl,
        recording_resource_id: null,
        recording_sid: null,
      } as any,
    });

    if (replayUrl) {
      logger.info('Replay sauvegardé', { streamId, replayUrl });
    }

    return replayUrl;
  } catch (err) {
    logger.error('Échec arrêt Cloud Recording', err as Error, { streamId });
    return null;
  }
}
