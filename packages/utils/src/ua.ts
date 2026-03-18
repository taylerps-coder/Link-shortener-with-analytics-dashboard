import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  isBot: boolean;
}

/**
 * Known bot/crawler user-agent patterns
 */
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /slurp/i, /wget/i, /curl/i,
  /scrapy/i, /facebookexternalhit/i, /Twitterbot/i, /LinkedInBot/i,
  /WhatsApp/i, /Slackbot/i, /Discordbot/i, /Googlebot/i, /bingbot/i,
  /DuckDuckBot/i, /YandexBot/i, /Baiduspider/i, /python-requests/i,
  /go-http-client/i, /Java\//i, /HeadlessChrome/i, /PhantomJS/i,
];

export function parseUserAgent(ua?: string | null): ParsedUA {
  if (!ua) {
    return { device: 'desktop', browser: 'Unknown', os: 'Unknown', isBot: false };
  }

  // Bot detection
  const isBot = BOT_PATTERNS.some(p => p.test(ua));

  const parser = new UAParser(ua);
  const result = parser.getResult();

  const deviceType = result.device.type;
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (deviceType === 'mobile') device = 'mobile';
  else if (deviceType === 'tablet') device = 'tablet';

  const browser = result.browser.name ?? 'Unknown';
  const os = result.os.name ?? 'Unknown';

  return { device, browser, os, isBot };
}
