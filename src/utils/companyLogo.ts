import axios from 'axios';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

const blocked4 = new BlockList();
for (const [ip, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as Array<[string, number]>) blocked4.addSubnet(ip, prefix, 'ipv4');
const public6 = new BlockList();
public6.addSubnet('2000::', 3, 'ipv6');
const blocked6 = new BlockList();
blocked6.addSubnet('2001:db8::', 32, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked4.check(address, 'ipv4');
  if (family === 6) return public6.check(address, 'ipv6') && !blocked6.check(address, 'ipv6');
  return false;
}

const thirdPartyHosts = ['linkedin.com', 'facebook.com', 'instagram.com', 'crunchbase.com', 'opencorporates.com', 'glassdoor.com', 'zaubacorp.com'];
const belongsTo = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function publicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || isIP(url.hostname)) return null;
    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) return null;
    if (url.port && !['80', '443'].includes(url.port)) return null;
    return url;
  } catch { return null; }
}

const decode = (value: string) => value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const attributes = (tag: string) => {
  const result = new Map<string, string>();
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result.set(match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4]));
  return result;
};

export function extractLogoCandidates(html: string, pageUrl: string): string[] {
  const icons: string[] = [];
  const socialImages: string[] = [];
  for (const tag of html.match(/<(?:link|meta)\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const rel = attrs.get('rel')?.toLowerCase() ?? '';
    const property = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
    const candidate = rel.includes('icon') ? attrs.get('href') : ['og:image', 'twitter:image'].includes(property) ? attrs.get('content') : null;
    if (!candidate) continue;
    let resolved: URL | null = null;
    try { resolved = publicUrl(new URL(candidate, pageUrl).toString()); } catch { continue; }
    if (!resolved) continue;
    if (rel.includes('icon')) icons.push(resolved.toString());
    else socialImages.push(resolved.toString());
  }
  return [...new Set([...icons, ...socialImages, new URL('/apple-touch-icon.png', pageUrl).toString(), new URL('/favicon.png', pageUrl).toString()])].slice(0, 4);
}

async function safeGet(input: string, maxBytes: number): Promise<{ url: URL; data: Buffer; contentType: string }> {
  let current = publicUrl(input);
  for (let redirect = 0; redirect < 3 && current; redirect++) {
    const addresses = await lookup(current.hostname, { all: true });
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error('Unsafe logo source');
    const pinned = addresses[0];
    const lookupPinned: LookupFunction = (_hostname, _options, callback) => callback(null, pinned.address, pinned.family);
    const response = await axios.get<ArrayBuffer>(current.toString(), {
      responseType: 'arraybuffer', timeout: 1800, maxRedirects: 0, maxContentLength: maxBytes,
      proxy: false, decompress: false, validateStatus: status => status >= 200 && status < 400,
      headers: { 'User-Agent': 'OfficellLogoFetcher/1.0', 'Accept-Encoding': 'identity', 'Accept': 'text/html,image/png,image/jpeg,image/webp,*/*' },
      httpAgent: new http.Agent({ lookup: lookupPinned }), httpsAgent: new https.Agent({ lookup: lookupPinned }),
    });
    if (response.status >= 300) {
      const location = response.headers.location;
      current = location ? publicUrl(new URL(location, current).toString()) : null;
      continue;
    }
    return { url: current, data: Buffer.from(response.data), contentType: String(response.headers['content-type'] ?? '').toLowerCase() };
  }
  throw new Error('Logo source did not resolve');
}

export async function fetchCompanyLogo(link: string): Promise<string | null> {
  const website = publicUrl(link);
  if (!website || thirdPartyHosts.some(host => belongsTo(website.hostname, host)) || website.hostname.endsWith('.gov') || website.hostname.endsWith('.gov.in')) return null;
  try {
    const page = await safeGet(website.toString(), 250_000);
    if (!page.contentType.includes('text/html') || thirdPartyHosts.some(host => belongsTo(page.url.hostname, host))) return null;
    const candidates = extractLogoCandidates(page.data.toString('utf8'), page.url.toString());
    for (const candidate of candidates) {
      try {
        const image = await safeGet(candidate, 1_500_000);
        if (!/^image\/(png|jpeg|webp)(?:;|$)/.test(image.contentType)) continue;
        const metadata = await sharp(image.data, { limitInputPixels: 4_000_000 }).metadata();
        if (!metadata.width || !metadata.height || metadata.width / metadata.height > 2 || metadata.height / metadata.width > 2) continue;
        const clean = await sharp(image.data, { limitInputPixels: 4_000_000 }).resize(256, 256, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
        const uploaded = await cloudinary.uploader.upload(`data:image/png;base64,${clean.toString('base64')}`, { folder: 'officell/company-logos', resource_type: 'image' });
        return uploaded.secure_url;
      } catch { /* Try another public icon. */ }
    }
  } catch { /* Company creation must not depend on website metadata. */ }
  return null;
}
