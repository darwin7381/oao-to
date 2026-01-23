/**
 * 元數據抓取工具
 * 從目標 URL 抓取 Open Graph 和 HTML meta 標籤
 */

export interface Metadata {
  title: string;
  description: string;
  image: string;
}

/**
 * 從目標 URL 抓取元數據
 * 優先順序：Open Graph > HTML 標籤 > 默認值
 */
export async function fetchMetadata(url: string): Promise<Metadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超時

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OAO.TO/1.0; +https://oao.to)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return getDefaultMetadata(url);
    }

    const html = await response.text();
    // 只讀取前 100KB（<head> 通常在前面）
    const headContent = html.substring(0, 100000);

    // 提取 Open Graph 標籤（最準確）
    const ogTitle = extractMetaTag(headContent, 'og:title');
    const ogDescription = extractMetaTag(headContent, 'og:description');
    const ogImage = extractMetaTag(headContent, 'og:image');

    // 提取 HTML 標籤（備用）
    const htmlTitle = headContent.match(/<title>([^<]+)<\/title>/i)?.[1];
    const htmlDescription = extractMetaTag(headContent, 'description', 'name');

    return {
      title: decodeHtmlEntities(ogTitle || htmlTitle || url),
      description: decodeHtmlEntities(ogDescription || htmlDescription || ''),
      image: ogImage || '',
    };
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return getDefaultMetadata(url);
  }
}

/**
 * 提取 meta 標籤內容
 */
function extractMetaTag(
  html: string,
  property: string,
  attribute: 'property' | 'name' = 'property'
): string | null {
  // 支援單引號和雙引號，支援屬性順序變化
  const patterns = [
    new RegExp(`<meta\\s+${attribute}=["']${property}["']\\s+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+${attribute}=["']${property}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * 解碼 HTML 實體
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
  };

  return text.replace(/&[^;]+;/g, match => entities[match] || match);
}

/**
 * 獲取默認元數據
 */
function getDefaultMetadata(url: string): Metadata {
  try {
    const hostname = new URL(url).hostname;
    return {
      title: hostname,
      description: `通過 OAO.TO 訪問 ${hostname}`,
      image: '',
    };
  } catch {
    return {
      title: url,
      description: '通過 OAO.TO 縮短的連結',
      image: '',
    };
  }
}


