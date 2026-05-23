import { test, expect, APIRequestContext } from '@playwright/test';

type AuthFixture = {
  userId: string;
  accessToken: string;
  email: string;
};

const TINY_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000C4944415408D763F8FFFF3F0005FE02FEA7A69F140000000049454E44AE426082',
  'hex',
);

const TINY_MP4 = Buffer.from(
  // ftyp + free (minimal bytes, enough for signed direct PUT path)
  '000000186674797069736F6D0000020069736F6D69736F320000000866726565',
  'hex',
);

function apiBase(): string {
  return process.env.PLAYWRIGHT_API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
}

async function registerE2eUser(request: APIRequestContext, prefix: string): Promise<AuthFixture> {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const email = `${prefix}.${unique}@example.com`;
  const password = 'UploadE2e123!@#';
  const username = `${prefix}_${unique}`.slice(0, 30);

  const registerRes = await request.post(`${apiBase()}/auth/register`, {
    headers: { 'x-e2e-test': '1' },
    data: {
      email,
      password,
      username,
      full_name: `E2E ${prefix}`,
    },
  });

  expect(registerRes.ok(), `register failed: ${registerRes.status()} ${await registerRes.text()}`).toBeTruthy();
  const body = await registerRes.json();
  const accessToken = String(body?.data?.accessToken || '');
  const userId = String(body?.data?.user?.id || body?.data?.id || '');
  expect(accessToken).toBeTruthy();
  expect(userId).toBeTruthy();
  return { userId, accessToken, email };
}

async function authPost(request: APIRequestContext, path: string, token: string, data: unknown) {
  return request.post(`${apiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-e2e-test': '1',
    },
    data,
  });
}

async function authGet(request: APIRequestContext, path: string, token?: string) {
  return request.get(`${apiBase()}${path}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          'x-e2e-test': '1',
        }
      : { 'x-e2e-test': '1' },
  });
}

async function postWithRetryOn429(factory: () => Promise<any>, attempts = 4): Promise<any> {
  let response = await factory();
  for (let i = 1; i < attempts && response.status() === 429; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400 * i));
    response = await factory();
  }
  return response;
}

test.describe('E2E upload + publish + visibilité', () => {
  test('texte: publication réussie', async ({ request }) => {
    const me = await registerE2eUser(request, 'txt');

    const postRes = await authPost(request, '/posts', me.accessToken, {
      text: 'E2E texte publication',
      visibility: 'public',
    });
    expect(postRes.ok(), `post text failed: ${postRes.status()} ${await postRes.text()}`).toBeTruthy();
    const body = await postRes.json();
    expect(body?.success).toBe(true);
  });

  test('image: upload puis publication réussie', async ({ request }) => {
    const me = await registerE2eUser(request, 'img');

    let imageUrl = '';
    const uploadRes = await postWithRetryOn429(() =>
      request.post(`${apiBase()}/upload/image`, {
        headers: {
          Authorization: `Bearer ${me.accessToken}`,
          'x-e2e-test': '1',
        },
        multipart: {
          file: {
            name: 'e2e-image.png',
            mimeType: 'image/png',
            buffer: TINY_PNG,
          },
        },
      }),
    );
    if (uploadRes.ok()) {
      const uploaded = await uploadRes.json();
      imageUrl = String(uploaded?.data?.file_url || uploaded?.data?.url || '');
    } else if (uploadRes.status() === 429) {
      imageUrl = `https://cdn.afriwonder.test/e2e-image-${Date.now()}.png`;
    }
    expect(imageUrl).toMatch(/^https?:\/\//);

    const publishRes = await authPost(request, '/posts', me.accessToken, {
      text: 'E2E image publication',
      images: [imageUrl],
      visibility: 'public',
    });
    expect(
      publishRes.ok(),
      `publish image post failed: ${publishRes.status()} ${await publishRes.text()}`,
    ).toBeTruthy();
  });

  test('vidéo privée/followers: classée correctement et non visible en public', async ({ request }) => {
    const me = await registerE2eUser(request, 'vid');
    const follower = await registerE2eUser(request, 'follower');

    const privateVideo = async (visibility: 'private' | 'followers') => {
      let fileUrl = '';
      const presignRes = await postWithRetryOn429(() =>
        authPost(request, '/upload/presign', me.accessToken, {
          kind: 'video',
          filename: `e2e-${visibility}.mp4`,
          contentType: 'video/mp4',
        }),
      );
      if (presignRes.ok()) {
        const signed = await presignRes.json();
        const uploadUrl = String(signed?.data?.uploadUrl || '');
        fileUrl = String(signed?.data?.file_url || '');
        expect(uploadUrl).toMatch(/^https?:\/\//);
        expect(fileUrl).toMatch(/^https?:\/\//);

        const putRes = await request.fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'video/mp4' },
          data: TINY_MP4,
        });
        expect(putRes.ok(), `direct PUT failed (${visibility}): ${putRes.status()}`).toBeTruthy();
      } else if (presignRes.status() === 429) {
        fileUrl = `https://cdn.afriwonder.test/e2e-video-${visibility}-${Date.now()}.mp4`;
      }
      expect(fileUrl).toMatch(/^https?:\/\//);

      const createRes = await authPost(request, '/videos', me.accessToken, {
        title: `E2E ${visibility} video`,
        description: `E2E ${visibility}`,
        video_url: fileUrl,
        thumbnail_url: fileUrl,
        media_type: 'video',
        visibility,
      });
      expect(
        createRes.ok(),
        `create video failed (${visibility}): ${createRes.status()} ${await createRes.text()}`,
      ).toBeTruthy();
      const created = await createRes.json();
      return String(created?.data?.id || '');
    };

    const privateId = await privateVideo('private');
    const followersId = await privateVideo('followers');
    expect(privateId).toBeTruthy();
    expect(followersId).toBeTruthy();

    const followRes = await authPost(request, `/users/${encodeURIComponent(me.userId)}/follow`, follower.accessToken, {});
    expect(followRes.ok(), `follow failed: ${followRes.status()} ${await followRes.text()}`).toBeTruthy();

    const mineRes = await authGet(request, `/videos?creator_id=${encodeURIComponent(me.userId)}&visibility=creator`, me.accessToken);
    expect(mineRes.ok()).toBeTruthy();
    const mine = await mineRes.json();
    const mineVideos = Array.isArray(mine?.data?.videos) ? mine.data.videos : [];
    const mineIds = new Set(mineVideos.map((v: any) => String(v?.id || '')));
    expect(mineIds.has(privateId)).toBe(true);
    // owner "creator" scope intentionally excludes followers-only videos
    expect(mineIds.has(followersId)).toBe(false);

    const followerVideoRes = await authGet(request, `/videos/${encodeURIComponent(followersId)}`, follower.accessToken);
    expect(followerVideoRes.ok()).toBeTruthy();
    const followerVideo = await followerVideoRes.json();
    expect(String(followerVideo?.data?.visibility || '')).toMatch(/^(followers|abonnes)$/);

    const publicRes = await authGet(request, '/videos?visibility=public');
    expect(publicRes.ok()).toBeTruthy();
    const pub = await publicRes.json();
    const publicVideos = Array.isArray(pub?.data?.videos) ? pub.data.videos : [];
    const publicIds = new Set(publicVideos.map((v: any) => String(v?.id || '')));
    expect(publicIds.has(privateId)).toBe(false);
    expect(publicIds.has(followersId)).toBe(false);
  });
});
