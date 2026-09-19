import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

/**
 * Chhota S3-compatible client (AWS Signature V4) - Cloudflare R2, Backblaze B2,
 * AWS S3, Wasabi sab ke liye. Bhaari AWS SDK nahi chahiye. Path-style URL:
 * <endpoint>/<bucket>/<key>
 */
const sha = (d) => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const EMPTY = sha('');
// S3 ka URI encoding: A-Z a-z 0-9 - _ . ~ chhodkar sab %XX; key me "/" rehta hai
const enc = (s, keepSlash) =>
    encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(keepSlash ? /%2F/g : /$^/, '/');

export function signRequest(cfg, { method, key = '', query = {}, payloadHash = EMPTY, headers = {}, now = new Date() }) {
    const url = new URL(cfg.endpoint.replace(/\/+$/, ''));
    // pathStyle false = bucket host me hi hai (bucket.s3.amazonaws.com)
    const bucketPart = cfg.pathStyle === false ? '' : enc(cfg.bucket, false);
    const path = '/' + [url.pathname.replace(/^\/|\/$/g, ''), bucketPart, key ? enc(key, true) : ''].filter(Boolean).join('/');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const day = amzDate.slice(0, 8);
    const qs = Object.keys(query)
        .sort()
        .map((k) => enc(k) + '=' + enc(String(query[k])))
        .join('&');
    const h = { ...headers, host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const names = Object.keys(h).map((k) => k.toLowerCase()).sort();
    const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
    const canonical = [method, path, qs, names.map((n) => n + ':' + lower[n] + '\n').join(''), names.join(';'), payloadHash].join('\n');
    const scope = day + '/' + cfg.region + '/s3/aws4_request';
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n');
    const kSign = hmac(hmac(hmac(hmac('AWS4' + cfg.secretKey, day), cfg.region), 's3'), 'aws4_request');
    const signature = crypto.createHmac('sha256', kSign).update(toSign).digest('hex');
    lower.authorization = 'AWS4-HMAC-SHA256 Credential=' + cfg.accessKey + '/' + scope + ', SignedHeaders=' + names.join(';') + ', Signature=' + signature;
    return { url: url.protocol + '//' + url.host + path + (qs ? '?' + qs : ''), headers: lower };
}

function send(cfg, opts, body) {
    const { url, headers } = signRequest(cfg, opts);
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    return new Promise((resolve, reject) => {
        const req = lib.request(u, { method: opts.method, headers, timeout: 10 * 60 * 1000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode >= 300) {
                    const code = (text.match(/<Code>([^<]+)</) || [])[1];
                    const msg = (text.match(/<Message>([^<]+)</) || [])[1];
                    return reject(new Error('S3 ' + res.statusCode + (code ? ' ' + code : '') + (msg ? ': ' + msg : '')));
                }
                resolve({ status: res.statusCode, text, headers: res.headers });
            });
        });
        req.on('timeout', () => req.destroy(new Error('S3 timeout')));
        req.on('error', reject);
        if (body && typeof body.pipe === 'function') body.pipe(req);
        else req.end(body);
    });
}

export const isConfigured = (cfg) => Boolean(cfg.endpoint && cfg.bucket && cfg.accessKey && cfg.secretKey);

/** File stream karke upload - poori file memory me nahi aati */
export function putFile(cfg, key, file, sha256) {
    const size = fs.statSync(file).size;
    return send(
        cfg,
        { method: 'PUT', key, payloadHash: sha256 || 'UNSIGNED-PAYLOAD', headers: { 'content-length': size, 'content-type': 'application/octet-stream' } },
        fs.createReadStream(file)
    );
}

export async function list(cfg, prefix) {
    const out = [];
    let token;
    do {
        const query = { 'list-type': 2, prefix };
        if (token) query['continuation-token'] = token;
        const { text } = await send(cfg, { method: 'GET', query });
        for (const m of text.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
            const get = (t) => (m[1].match(new RegExp('<' + t + '>([^<]*)<')) || [])[1];
            out.push({ key: get('Key').replace(/&amp;/g, '&'), size: Number(get('Size')), lastModified: new Date(get('LastModified')) });
        }
        token = /<IsTruncated>true</.test(text) ? (text.match(/<NextContinuationToken>([^<]+)</) || [])[1] : null;
    } while (token);
    return out;
}

export const remove = (cfg, key) => send(cfg, { method: 'DELETE', key });
