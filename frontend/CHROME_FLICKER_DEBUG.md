# Chrome 閃爍問題排查記錄

**問題描述**：Chrome/Brave 閃爍，Safari 正常  
**特殊發現**：只在特定電腦的 MacBook 螢幕出現，外接螢幕正常  
**測試日期**：2026-01-23 ~ 2026-01-24  
**最終狀態**：❌ **問題未解決**，但完成了一些代碼優化

---

## 測試記錄摘要

| # | 測試項目 | 修改內容 | 結果 | 狀態 |
|---|---------|---------|------|------|
| 1 | Header | 移除 transition-all + 固定 width | ⚠️ 疑似緩解 | 不確定 |
| 2 | UserMenu | 移除 scale + 內層 backdrop-blur | ❌ 惡化 | 已恢復 |
| 3 | 背景動畫 | 移除 will-change-transform | ❌ 無效 | 已恢復 |
| 4 | Header | 完全移除 backdrop-blur | ❌ 更嚴重 | 已恢復 |
| 5 | Header | 固定樣式（不隨滾動變化）| ❌ 無效 | 已恢復 |
| 6 | Header | 完全靜止（連 py 都不變）| ❌ 無效 | 已恢復 |
| 7 | 全局 | 完全移除所有 transition-all | ❌ 無效 | 已恢復 |
| 8 | Header | 移除 backdrop-blur（避免重疊）| ❌ 無效 | 已恢復 |
| 9 | 背景 | 完全移除背景 blobs | ❌ 無效 | 已恢復 |

**結論**：所有測試都未能解決閃爍問題

---

## ✅ 實際保留的代碼優化（非閃爍修復）

這些優化基於最佳實踐，與閃爍問題無關：

### 1. Header - 避免 width 動畫觸發 layout reflow

**檔案**：`frontend/src/components/layout/Header.tsx`

**修改前**：
```tsx
className="transition-all duration-300"
scrolled ? "w-[calc(100%-2rem)]" : "w-full"  // width 變化
```

**修改後**：
```tsx
// 用 padding 創造視覺縮小效果，避免 width 動畫
scrolled ? "px-8 w-[calc(100%-3rem)]" : "px-6 w-full"
// 明確指定 transition 屬性
style={{ transition: 'background-color, border-color, box-shadow, padding' }}
```

**原因**：
- 避免 Chromium Bug #1194050（transform + backdrop-filter）
- width 動畫觸發 layout reflow（效能不佳）
- 最佳實踐：明確指定需要 transition 的屬性

**效果**：✅ 代碼品質提升（但未解決閃爍）

---

### 2. 移除永久的 will-change-transform

**檔案**：
- `frontend/src/pages/NewHome.tsx`（3 處背景 blobs）
- `frontend/src/pages/Analytics.tsx`（1 處卡片）

**修改**：
```tsx
// 修改前
className="animate-float will-change-transform"

// 修改後
className="animate-float"
```

**原因**：
- will-change 應該動態使用，不應永久存在
- 永久使用浪費記憶體和 GPU 資源
- 最佳實踐

**效果**：✅ 效能提升（但未解決閃爍）

---

### 3. UserMenu - 移除雙層白色背景疊加

**檔案**：`frontend/src/components/UserMenu.tsx`

**修改前**：
```tsx
外層：bg-white/80 backdrop-blur-xl
內層按鈕：bg-white/60 backdrop-blur-md  // 雙層疊加 = 接近 100% 不透明
```

**修改後**：
```tsx
外層：bg-white/80 backdrop-blur-xl
內層按鈕：bg-transparent  // 移除背景
```

**原因**：
- 修復 UI 顯示問題（玻璃效果不明顯）
- 減少一層 backdrop-filter（效能更好）
- 避免雙層疊加導致的視覺問題

**效果**：✅ UI 顯示修復 + 效能提升（但未解決閃爍）

---

### 4. Header 外層 transition 優化

**檔案**：`frontend/src/components/layout/Header.tsx`

**修改前**：
```tsx
<header className="transition-all duration-300">
```

**修改後**：
```tsx
<header style={{ transition: 'padding 0.3s' }}>
```

**原因**：
- 只有 padding 在變化，不需要 transition-all
- 最佳實踐

**效果**：✅ 代碼品質提升（但未解決閃爍）

---

## ❌ 閃爍問題現狀

**測試結論**：
- ❌ 所有代碼層面的修改都未能解決閃爍
- ❌ 問題可能不在代碼，而在環境配置
- ⚠️ 只在特定電腦的 MacBook 螢幕 + Chrome 組合出現

**可能原因**（未確認）：
1. Chrome 的特定版本或設置
2. macOS 的顯示設置（ProMotion 等）
3. 硬體加速配置
4. Chrome 擴展衝突
5. GPU 驅動問題

**建議的下一步診斷**（未執行）：
1. Chrome 無痕模式測試
2. 檢查 chrome://settings/ 硬體加速
3. 檢查 chrome://gpu/ 
4. 檢查 chrome://flags/
5. 在其他電腦測試

---

## 完成的工作

✅ **代碼優化**：完成 4 項效能和 UI 優化  
❌ **閃爍問題**：未解決  
📝 **測試記錄**：完整記錄 9 個測試的結果

---

**最後更新**：2026-01-24 12:05  
**狀態**：已完成測試，問題未解決
