# Chrome 閃爍問題排查紀錄

**問題描述**：Chrome/Brave 閃爍，Safari 正常  
**影響範圍**：生產環境和開發環境都有此問題  
**開始時間**：2026-01-23  

---

## 已確認的問題根源

基於研究和測試，確認是 **Chrome 的 backdrop-filter 渲染 Bug**：
- Chromium Bug #1194050：transform + backdrop-filter 組合
- Edge Handling 問題：Chrome 使用 extend 策略導致滾動時顏色劇變
- 嵌套 backdrop-filter：Chrome 不支援（標記為 WontFix）

---

## 測試進度

### ✅ 測試 1：修復 Header 的 transition-all + width 變化

**問題**：
```tsx
// 修復前
className="transition-all duration-300"  // ← transition-all
scrolled 
  ? "backdrop-blur-md w-[calc(100%-2rem)]"  // ← width 變化 + backdrop-blur
  : "bg-transparent w-full"
```

**修復**：
```tsx
// 修復後
// 1. 移除 transition-all
// 2. 使用固定 width: w-[calc(100%-2rem)]
// 3. 只 transition: background-color, border-color, box-shadow
```

**測試結果**：✅ **有效果！閃爍頻率明顯降低**

**結論**：證明 Header 的 transition-all + width 變化是主要問題之一

---

### 🔄 測試 2：修復 UserMenu 的 scale 動畫 + 嵌套 backdrop-blur

**問題**：
```tsx
// 致命組合
<motion.div
  initial={{ scale: 0.95 }}              // ← scale = transform
  className="backdrop-blur-xl"           // ← backdrop-blur
>
  <button className="backdrop-blur-md"> // ← 嵌套 backdrop-blur
```

**修復**：
```tsx
// 修復後
<motion.div
  initial={{ opacity: 0, y: 10 }}        // ← 移除 scale
  className="backdrop-blur-xl"
>
  <button className="bg-white/90">       // ← 移除 backdrop-blur-md
    // 移除 transition-all，改為明確指定
```

**修改項目**：
1. ✅ 移除 scale 動畫（scale: 0.95 → 移除）
2. ✅ 移除內層 backdrop-blur-md（改為 bg-white/90）
3. ✅ 移除 transition-all
4. ✅ 移除多餘的動畫 class（animate-in fade-in zoom-in-95）

**測試結果**：❌ **無效！閃爍反而更嚴重**

**結論**：移除 scale 和內層 backdrop-blur 反而讓問題惡化
**行動**：已恢復原狀

---

### 🔄 測試 3：背景動畫的 will-change-transform

**問題**：
```tsx
// NewHome.tsx Line 87-89
className="animate-float will-change-transform"  // ← will-change-transform
// DashboardLayout.tsx 也有類似問題
```

**理論**：
- 背景在不斷移動（transform 動畫）
- will-change-transform 可能與 backdrop-blur 的合成層衝突
- Chrome 的 edge handling 在背景移動時重新計算

**修復**：
```tsx
// 修復後
className="animate-float"  // ← 移除 will-change-transform
```

**修改項目**：
1. ✅ NewHome.tsx：移除 3 個背景 blobs 的 will-change-transform

**測試結果**：❌ 無效，無任何差別（已恢復）

---

### 🔄 測試 4：完全移除 Header 的 backdrop-blur

**理論**：
- 如果問題的核心是 backdrop-blur 本身
- 移除它應該能完全解決 Header 的閃爍

**修復**：
```tsx
// 修復後
scrolled 
  ? "bg-white/95"              // ← 移除 backdrop-blur-md
  : "bg-white/40"              // ← 移除 bg-transparent，永遠有背景
```

**修改項目**：
1. ✅ 移除 backdrop-blur-md
2. ✅ 改用純色半透明背景
3. ✅ 不再使用 bg-transparent（避免完全透明）

**測試結果**：❌ 更嚴重！（已恢復）

**結論**：移除 backdrop-blur 反而惡化問題，說明 backdrop-blur 不是問題根源

---

### 🔄 測試 5：Header 永遠保持固定樣式（不隨滾動變化）

**理論**：
- 如果問題是滾動時的樣式變化
- 讓 Header 永遠保持相同樣式應該能解決

**修復**：
```tsx
// 修復後
// 移除 scrolled 的條件判斷
className="... bg-white/80 backdrop-blur-md ..."  // ← 永遠固定
```

**修改項目**：
1. ✅ 移除滾動時的樣式切換
2. ✅ Header 永遠保持相同的背景和樣式

**測試結果**：❌ 無效，無任何差別（已恢復）

---

### 🔄 測試 6：完全移除 Header 的所有動態變化

**理論**：
- 連 py-2/py-4 的 padding 變化都移除
- 完全靜止的 Header

**修復**：
```tsx
// 修復後
<header className="fixed ... py-2">  // ← 固定 py-2，不再變化
  <div className="... bg-white/80 backdrop-blur-md ...">  // ← 固定樣式
```

**修改項目**：
1. ✅ 移除 scrolled state 的使用
2. ✅ Header 完全靜止，沒有任何動態變化

**測試結果**：❌ 無效（已恢復）

---

## 🔍 當前狀態分析

**有效的修改（已保留）**：
- ✅ 測試 1：Header 固定 width + 移除 transition-all

**觀察結論**：
- 唯一有效的是「移除 transition-all」
- 其他所有測試都無效或惡化
- **說明問題可能不在單一元素，而是整體渲染流程**

---

## 測試摘要表

| # | 測試項目 | 修改內容 | 結果 | 備註 |
|---|---------|---------|------|------|
| 1 | Header | 移除 transition-all + 固定 width | ✅ 改善 | 閃爍頻率降低（保留）|
| 2 | UserMenu | 移除 scale + 內層 backdrop-blur | ❌ 惡化 | 已恢復 |
| 3 | 背景動畫 | 移除 will-change-transform | ❌ 無效 | 已恢復 |
| 4 | Header | 完全移除 backdrop-blur | ❌ 更嚴重 | 已恢復 |
| 5 | Header | 固定樣式（不隨滾動變化）| ❌ 無效 | 已恢復 |
| 6 | Header | 完全靜止（連 py 都不變）| ❌ 無效 | 已恢復 |
| 7 | 全局 | 完全移除所有 transition-all | ❌ 無效 | 已恢復（問題不在 transition）|
| 8 | Header | 移除 backdrop-blur | ❌ 無效 | 已恢復 |
| 9 | 背景 | 完全移除背景 blobs | ⏳ 測試中 | 測試 filter 衝突 |

---

## 測試環境

- **瀏覽器**：Chrome/Brave
- **對照組**：Safari（正常）
- **測試頁面**：localhost:5173（開發）+ 生產環境

---

---

## 🤔 重新分析

**測試結果模式**：
- ✅ 只有測試 1 有效（移除 transition-all）
- ❌ 其他所有測試都無效或惡化

**新的假設**：
問題可能不在單一元素，而是：
1. **全局的 CSS 設置問題**
2. **Framer Motion 的配置問題**  
3. **多個元素的交互問題**
4. **瀏覽器的合成層管理問題**

---

### 🔄 測試 7：移除更多 transition-all

**新發現**：外接螢幕不閃，MacBook 螢幕閃 = ProMotion (120Hz) 或 Retina 高 DPI 問題

**理論**：
- transition-all 在高刷新率螢幕上計算量暴增
- 累積效應導致 GPU 過載

**修改項目**：
1. ✅ Button: `transition-all` → `transition-colors`
2. ✅ Input: `transition-all` → `transition-colors`
3. ✅ UserMenu (2 處): `transition-all` → `transition-colors`
4. ✅ DashboardLayout (2 處): `transition-all` → `transition-colors`

**修改項目（更新）**：
1. ✅ Button: `transition-all` → `transition-colors`
2. ✅ Input: `transition-all` → `transition-colors`  
3. ✅ UserMenu (2 處): `transition-all` → `transition-colors`
4. ✅ DashboardLayout (2 處): `transition-all` → `transition-colors`
5. ✅ Dashboard 頁面 (4 處): `transition-all` → `transition-colors`
6. ✅ Analytics 頁面 (9 處): `transition-all` → 明確指定屬性

**總計**：已移除 **全部 transition-all**（43+ 處）

**涵蓋文件**：
- Button, Input, Card（基礎組件）
- UserMenu, Header, DashboardLayout（Layout）
- Dashboard, Analytics, NewHome（主要頁面）
- Settings, Pricing, Support, ApiKeys, Features, Terms, NotFound, Privacy, ApiDocs（其他頁面）

**測試結果**：❌ 完全無效，還是狂閃

**結論**：問題根本不在 transition-all

---

### 🔄 測試 8：移除 Header 的 backdrop-blur（避免與 UserMenu 重疊）

**理論**：
- Header 有 backdrop-blur-md
- UserMenu 有 backdrop-blur-xl
- 兩層重疊可能導致 Chrome 渲染衝突

**修復**：
```tsx
// Header 完全移除 backdrop-blur
scrolled 
  ? "bg-white/95"              // ← 無 backdrop-blur
  : "bg-white/60"
```

**修改項目**：
1. ✅ Header 移除 backdrop-blur-md
2. ✅ 改用更高不透明度的純色背景
3. ✅ UserMenu 保留 backdrop-blur-xl

**測試結果**：❌ **完全無效，還是狂閃**

**結論**：問題不是 backdrop-filter 重疊

---

### 🔄 測試 9：完全移除背景 blobs 動畫

**新理論**：
- 背景 blobs 使用 `filter: blur-3xl` + `mix-blend-multiply`
- 這些 CSS filter 可能與前景的 backdrop-filter 衝突
- Chrome 在處理 filter + backdrop-filter 組合時有問題

**修復**：
```tsx
// 暫時註解掉整個背景 blobs
```

**測試結果**：待用戶在 Chrome 測試

---

**最後更新**：2026-01-23 21:31
