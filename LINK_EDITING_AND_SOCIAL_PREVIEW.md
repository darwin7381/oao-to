# 短網址編輯與社交預覽完整實現方案

## 📋 目錄
1. [功能概述](#功能概述)
2. [數據結構設計](#數據結構設計)
3. [後端實現](#後端實現)
4. [前端實現](#前端實現)
5. [社交預覽機制](#社交預覽機制)
6. [測試方案](#測試方案)

---

## 🎯 功能概述

### A. 編輯功能
- ✅ 編輯標題
- ✅ 編輯描述
- ✅ 編輯/上傳預覽圖片
- ✅ 重新抓取元數據
- ✅ 編輯目標 URL（進階）
- ✅ 設定過期時間（進階）

### B. 社交預覽功能
- ✅ 自動檢測社交媒體爬蟲
- ✅ 返回 Open Graph 標籤
- ✅ 支援 Facebook、Twitter、LinkedIn、Discord、Telegram 等
- ✅ 創建時自動抓取目標網站元數據
- ✅ 三層後備機制（自定義 → 自動抓取 → 默認）

---

## 🗂️ 數據結構設計

### KV 存儲結構

```typescript
// api-worker/src/types.ts

export interface LinkData {
  // === 核心欄位 ===
  slug: string;              // 短網址 slug
  url: string;               // 目標 URL
  userId: string;            // 創建者 ID
  createdAt: number;         // 創建時間戳
  updatedAt?: number;        // 最後更新時間戳
  
  // === 元數據（支援編輯）===
  title?: string;            // 標題（創建時自動抓取，可編輯）
  description?: string;      // 描述（創建時自動抓取，可編輯）
  image?: string;            // 預覽圖片 URL（創建時自動抓取，可編輯/上傳）
  
  // === 進階設定 ===
  tags?: string[];           // 標籤（方便分類管理）
  expiresAt?: number;        // 過期時間戳
  password?: string;         // 密碼保護（加密後）
  isActive?: boolean;        // 是否啟用（默認 true）
  
  // === 統計（可選，可從 Analytics Engine 讀取）===
  clickCount?: number;       // 點擊次數快照
}
```

### 存儲示例

```json
{
  "slug": "6sXjOJ",
  "url": "https://www.blocktempo.com/options-market-contracts-shrink/",
  "userId": "anonymous",
  "createdAt": 1737777600000,
  "updatedAt": 1737777900000,
  "title": "BLOCKTEMPO.COM",
  "description": "區塊客提供最新的加密貨幣新聞與市場分析",
  "image": "https://www.blocktempo.com/wp-content/uploads/2026/01/og-image.png",
  "tags": ["crypto", "news"],
  "isActive": true
}
```

---

## 🔧 後端實現

### 1. 元數據抓取工具

```typescript
// api-worker/src/utils/fetch-metadata.ts

interface Metadata {
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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OAO.TO/1.0; +https://oao.to)'
      },
      signal: AbortSignal.timeout(5000) // 5秒超時
    });
    
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
      title: ogTitle || htmlTitle || url,
      description: ogDescription || htmlDescription || '',
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
  const regex = new RegExp(
    `<meta\\s+${attribute}=["']${property}["']\\s+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] : null;
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
```

---

### 2. 創建短網址（自動抓取元數據）

```typescript
// api-worker/src/index.ts

app.post('/shorten', async (c) => {
  const { url, customSlug } = await c.req.json();
  
  if (!url) {
    return c.json({ error: 'url 是必填的' }, 400);
  }

  // 驗證 URL 格式
  try {
    new URL(url);
  } catch {
    return c.json({ error: 'URL 格式不正確' }, 400);
  }

  // 生成或驗證 slug
  let slug: string;
  if (customSlug) {
    if (!/^[a-zA-Z0-9-_]{1,50}$/.test(customSlug)) {
      return c.json({ error: 'slug 格式不正確' }, 400);
    }
    const existing = await c.env.LINKS.get(`link:${customSlug}`);
    if (existing) {
      return c.json({ error: 'slug 已被使用' }, 409);
    }
    slug = customSlug;
  } else {
    const { generateUniqueSlug } = await import('./utils/slug-generator');
    slug = await generateUniqueSlug(c.env);
  }

  // 創建基本鏈接數據
  const linkData: LinkData = {
    slug,
    url,
    userId: 'anonymous',
    createdAt: Date.now(),
    isActive: true,
  };

  // 存入 KV（先返回，再背景抓取元數據）
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  const baseUrl = c.req.header('host')?.includes('localhost') 
    ? `http://${c.req.header('host')}`
    : 'https://oao.to';

  // 背景異步抓取元數據並更新
  c.executionCtx.waitUntil(
    fetchMetadata(url).then(async (metadata) => {
      const updatedData = {
        ...linkData,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        updatedAt: Date.now(),
      };
      await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));
    }).catch(error => {
      console.error('Background metadata fetch failed:', error);
    })
  );

  return c.json({
    success: true,
    slug,
    url,
    shortUrl: `${baseUrl}/${slug}`,
    createdAt: linkData.createdAt,
  }, 201);
});
```

---

### 3. 編輯短網址

```typescript
// api-worker/src/routes/links.ts

import { Hono } from 'hono';
import type { Env, LinkData } from '../types';
import { fetchMetadata } from '../utils/fetch-metadata';

const links = new Hono<{ Bindings: Env }>();

/**
 * 更新短網址
 * PUT /api/links/:slug
 */
links.put('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const updates = await c.req.json<{
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    tags?: string[];
    expiresAt?: number;
  }>();

  // 從 KV 讀取現有資料
  const existingStr = await c.env.LINKS.get(`link:${slug}`);
  if (!existingStr) {
    return c.json({ error: '短網址不存在' }, 404);
  }

  const linkData: LinkData = JSON.parse(existingStr);

  // TODO: 權限檢查
  // const user = getUserFromContext(c);
  // if (linkData.userId !== user.userId && linkData.userId !== 'anonymous') {
  //   return c.json({ error: '無權限編輯此短網址' }, 403);
  // }

  // 更新資料
  const updatedData: LinkData = {
    ...linkData,
    ...updates,
    updatedAt: Date.now(),
  };

  // 如果修改了 URL，驗證格式
  if (updates.url) {
    try {
      new URL(updates.url);
    } catch {
      return c.json({ error: 'URL 格式不正確' }, 400);
    }
  }

  // 寫回 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));

  return c.json({
    success: true,
    data: updatedData,
  });
});

/**
 * 重新抓取元數據
 * POST /api/links/:slug/refetch
 */
links.post('/:slug/refetch', async (c) => {
  const slug = c.req.param('slug');

  // 從 KV 讀取現有資料
  const existingStr = await c.env.LINKS.get(`link:${slug}`);
  if (!existingStr) {
    return c.json({ error: '短網址不存在' }, 404);
  }

  const linkData: LinkData = JSON.parse(existingStr);

  // 重新抓取元數據
  const metadata = await fetchMetadata(linkData.url);

  // 更新資料
  const updatedData: LinkData = {
    ...linkData,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    updatedAt: Date.now(),
  };

  // 寫回 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));

  return c.json({
    success: true,
    data: updatedData,
    metadata,
  });
});

export default links;
```

---

### 4. 社交預覽（重定向邏輯）

```typescript
// api-worker/src/index.ts

// 社交媒體爬蟲的 User-Agent 列表
const SOCIAL_BOTS = [
  'facebookexternalhit',
  'Facebot',
  'twitterbot',
  'LinkedInBot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'Slackbot',
  'pinterest',
  'redditbot',
];

/**
 * 短網址重定向（核心功能）
 * GET /:slug
 */
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  // 跳過 API 路由
  if (slug === 'api' || slug === 'health') {
    return c.notFound();
  }

  try {
    // 從 KV 獲取鏈接數據
    const linkDataStr = await c.env.LINKS.get(`link:${slug}`);
    
    if (!linkDataStr) {
      return c.notFound();
    }

    const linkData: LinkData = JSON.parse(linkDataStr);

    // 檢查是否已過期
    if (linkData.expiresAt && linkData.expiresAt < Date.now()) {
      return c.json({ error: '此短網址已過期' }, 410);
    }

    // 檢查是否啟用
    if (linkData.isActive === false) {
      return c.json({ error: '此短網址已停用' }, 403);
    }

    // 檢測是否為社交媒體爬蟲
    const userAgent = c.req.header('user-agent') || '';
    const isSocialBot = SOCIAL_BOTS.some(bot => 
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (isSocialBot) {
      // === 社交媒體爬蟲：返回 Open Graph HTML ===
      
      // 準備預覽數據（三層後備）
      const previewTitle = linkData.title || linkData.url;
      const previewDescription = linkData.description || `通過 OAO.TO 訪問：${linkData.url}`;
      const previewImage = linkData.image || `https://oao.to/api/og-image/${slug}`;
      
      const baseUrl = c.req.header('host')?.includes('localhost')
        ? `http://${c.req.header('host')}`
        : 'https://oao.to';

      return c.html(`
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(previewTitle)}</title>
  
  <!-- Open Graph (Facebook, LinkedIn, Discord, Telegram) -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}/${slug}">
  <meta property="og:title" content="${escapeHtml(previewTitle)}">
  <meta property="og:description" content="${escapeHtml(previewDescription)}">
  <meta property="og:image" content="${escapeHtml(previewImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="OAO.TO">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(previewTitle)}">
  <meta name="twitter:description" content="${escapeHtml(previewDescription)}">
  <meta name="twitter:image" content="${escapeHtml(previewImage)}">
  
  <!-- 自動重定向（以防爬蟲支援 JavaScript） -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(linkData.url)}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
    }
    a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 正在重定向...</h1>
    <p>如果沒有自動跳轉，請點擊以下連結：</p>
    <p><a href="${escapeHtml(linkData.url)}">${escapeHtml(linkData.url)}</a></p>
  </div>
  <script>
    // JavaScript 重定向（以防 meta refresh 失效）
    setTimeout(() => {
      window.location.href = ${JSON.stringify(linkData.url)};
    }, 100);
  </script>
</body>
</html>
      `);
    }

    // === 一般用戶：直接重定向 ===
    
    // 記錄點擊分析（異步，不阻塞重定向）
    c.executionCtx.waitUntil(
      trackClick(c.env, slug, c.req)
    );

    return c.redirect(linkData.url, 301);
    
  } catch (error) {
    console.error('Redirect error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * HTML 轉義（防止 XSS）
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

---

## 🎨 前端實現

### 1. API 客戶端

```typescript
// frontend/src/lib/api.ts

export interface Link {
  slug: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt: number;
  updatedAt?: number;
  shortUrl: string;
  tags?: string[];
}

class API {
  private baseUrl = import.meta.env.PROD
    ? 'https://api.oao.to'
    : 'http://localhost:5174';

  /**
   * 更新短網址
   */
  async updateLink(slug: string, data: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    tags?: string[];
  }): Promise<Link> {
    const response = await fetch(`${this.baseUrl}/api/links/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update link');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * 重新抓取元數據
   */
  async refetchMetadata(slug: string): Promise<Link> {
    const response = await fetch(`${this.baseUrl}/api/links/${slug}/refetch`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to refetch metadata');
    }
    
    const result = await response.json();
    return result.data;
  }

  // ... 其他現有方法 ...
}

export const api = new API();
```

---

### 2. 編輯組件

```tsx
// frontend/src/components/LinkEditor.tsx

import { useState } from 'react';
import { api, type Link as LinkType } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { RefreshCw, Save, X } from 'lucide-react';

interface LinkEditorProps {
  link: LinkType;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedLink: LinkType) => void;
}

export function LinkEditor({ link, isOpen, onClose, onUpdate }: LinkEditorProps) {
  const [formData, setFormData] = useState({
    title: link.title || '',
    description: link.description || '',
    image: link.image || '',
    url: link.url,
  });
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await api.updateLink(link.slug, formData);
      onUpdate(updated);
      onClose();
    } catch (error) {
      console.error('Failed to update:', error);
      alert('更新失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const handleRefetch = async () => {
    setRefetching(true);
    try {
      const updated = await api.refetchMetadata(link.slug);
      setFormData({
        title: updated.title || '',
        description: updated.description || '',
        image: updated.image || '',
        url: updated.url,
      });
      alert('已重新抓取元數據！');
    } catch (error) {
      console.error('Failed to refetch:', error);
      alert('重新抓取失敗，請重試');
    } finally {
      setRefetching(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="編輯短網址">
      <div className="space-y-4">
        {/* 標題 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            標題
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="輸入自定義標題"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="輸入描述文字"
          />
        </div>

        {/* 預覽圖片 URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            預覽圖片 URL
          </label>
          <Input
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="https://example.com/image.png"
          />
          {formData.image && (
            <img 
              src={formData.image} 
              alt="預覽" 
              className="mt-2 w-full h-40 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>

        {/* 目標 URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目標 URL
          </label>
          <Input
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
          />
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ 修改目標 URL 會影響所有使用此短網址的用戶
          </p>
        </div>

        {/* 重新抓取按鈕 */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={handleRefetch}
            disabled={refetching}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refetching ? 'animate-spin' : ''}`} />
            {refetching ? '正在重新抓取...' : '重新抓取元數據'}
          </Button>
          <p className="mt-2 text-xs text-gray-500">
            從目標網站重新抓取標題、描述和預覽圖片
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

### 3. 分析頁面整合編輯功能

```tsx
// frontend/src/pages/Analytics.tsx

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { LinkEditor } from '../components/LinkEditor';
// ... 其他 imports

export default function Analytics() {
  const { slug } = useParams<{ slug: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // ... 現有邏輯 ...

  const handleUpdate = (updatedLink: LinkType) => {
    // 更新分析數據中的連結資訊
    setAnalytics(prev => prev ? {
      ...prev,
      title: updatedLink.title,
      url: updatedLink.url,
      // ... 其他欄位
    } : null);
  };

  return (
    <div className="min-h-screen ...">
      {/* ... 現有內容 ... */}
      
      {analytics && (
        <>
          {/* 在頂部區域添加編輯按鈕 */}
          <Card>
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1>{analytics.title || 'Untitled Link'}</h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditor(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  編輯
                </Button>
              </div>
              {/* ... 其他內容 ... */}
            </div>
          </Card>

          {/* 編輯模態框 */}
          <LinkEditor
            link={{
              slug: analytics.slug,
              url: analytics.url,
              title: analytics.title,
              description: analytics.description,
              image: analytics.image,
              createdAt: analytics.createdAt,
              shortUrl: `https://oao.to/${slug}`,
            }}
            isOpen={showEditor}
            onClose={() => setShowEditor(false)}
            onUpdate={handleUpdate}
          />
        </>
      )}
    </div>
  );
}
```

---

## 🧪 測試方案

### 1. 測試社交預覽

#### 方法 A：使用社交媒體官方工具

**Facebook Sharing Debugger:**
```
https://developers.facebook.com/tools/debug/
輸入：https://oao.to/6sXjOJ
```

**Twitter Card Validator:**
```
https://cards-dev.twitter.com/validator
輸入：https://oao.to/6sXjOJ
```

**LinkedIn Post Inspector:**
```
https://www.linkedin.com/post-inspector/
輸入：https://oao.to/6sXjOJ
```

#### 方法 B：模擬爬蟲請求

```bash
# 模擬 Facebook 爬蟲
curl -H "User-Agent: facebookexternalhit/1.1" https://oao.to/6sXjOJ

# 模擬 Twitter 爬蟲
curl -H "User-Agent: Twitterbot/1.0" https://oao.to/6sXjOJ

# 應該返回包含 Open Graph 標籤的 HTML
```

---

### 2. 測試編輯功能

```bash
# 1. 創建短網址
curl -X POST http://localhost:5174/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.blocktempo.com"}'

# 2. 編輯短網址
curl -X PUT http://localhost:5174/api/links/6sXjOJ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的自定義標題",
    "description": "我的自定義描述",
    "image": "https://example.com/my-image.png"
  }'

# 3. 重新抓取元數據
curl -X POST http://localhost:5174/api/links/6sXjOJ/refetch

# 4. 驗證社交預覽
curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:8787/6sXjOJ
```

---

## 📋 實現檢查清單

### 後端
- [ ] 創建 `utils/fetch-metadata.ts`
- [ ] 更新 `src/index.ts` 的 `/shorten` 端點
- [ ] 更新 `src/index.ts` 的 `/:slug` 重定向邏輯
- [ ] 創建 `routes/links.ts` 路由
- [ ] 在 `src/index.ts` 註冊新路由：`app.route('/api/links', linksRouter)`
- [ ] 更新 `types.ts` 添加新欄位

### 前端
- [ ] 更新 `lib/api.ts` 添加編輯 API
- [ ] 創建 `components/LinkEditor.tsx` 編輯組件
- [ ] 更新 `pages/Analytics.tsx` 整合編輯功能
- [ ] 測試編輯流程

### 測試
- [ ] 測試自動抓取元數據
- [ ] 測試編輯功能
- [ ] 測試重新抓取功能
- [ ] 測試 Facebook 預覽
- [ ] 測試 Twitter 預覽
- [ ] 測試 Discord 預覽

---

## 🚀 部署注意事項

1. **環境變數**：無需額外配置

2. **KV 命名空間**：確保已綁定 `LINKS`

3. **Analytics Engine**：確保已綁定 `TRACKER`

4. **CORS 設定**：已在現有代碼中配置

5. **默認 OG 圖片**：
   - 上傳默認預覽圖到 `public/default-og.png`
   - 或實現動態生成端點 `/api/og-image/:slug`

---

## 📚 參考資源

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

