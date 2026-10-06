// 구글 로그인: 브라우저가 받은 ID 토큰(JWT)을 구글 tokeninfo 엔드포인트로 검증한다
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
// 구글 클라이언트 ID가 없으면 (로컬 개발) 이름만으로 로그인하는 개발용 모드
export const DEV_LOGIN = !GOOGLE_CLIENT_ID && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_LOGIN === '1');

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export async function verifyGoogle(credential) {
  if (typeof credential !== 'string' || credential.length > 4096) throw new Error('잘못된 토큰');
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('구글 인증 실패');
  const t = await res.json();
  if (t.aud !== GOOGLE_CLIENT_ID) throw new Error('다른 앱의 토큰');
  if (!ISSUERS.has(t.iss)) throw new Error('발급자 불일치');
  if (Number(t.exp) * 1000 < Date.now()) throw new Error('토큰 만료');
  if (t.email_verified !== 'true' && t.email_verified !== true) throw new Error('이메일 미인증');
  return { sub: `g:${t.sub}`, email: t.email || '', name: t.name || t.email?.split('@')[0] || '바퀴', picture: t.picture || '' };
}

// JSON 본문 읽기 (작은 요청만)
export function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}
