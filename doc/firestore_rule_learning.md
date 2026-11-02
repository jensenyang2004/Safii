# Firestore Rules 學習與修改計畫

> 建立於 2026-08-06。目標：親手修好 Safii 的 Firestore 安全規則，同時真正理解授權模型。

---

## 現況

線上跑的是 Firebase **測試模式預設值**：

```javascript
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2026, 11, 22);
}
```

- 全資料庫無條件公開讀寫（含 `tokens` 裡的原始 ID token、所有位置資料）
- repo 根目錄的 `firestore.rules` 內容是完整的，但**顯然從未部署或曾被覆蓋**
- 2026-11-22 之後不是自動變安全，是**所有請求一律被拒、app 整個掛掉**

專案 ID `safii-90f1d` 本來就會被打包進 app，任何人都能取得。所以 rules 是唯一防線。

---

## 止血優先

在開始學之前，先決定一件事：

- 如果評估自己修要花超過一週 → **先部署 repo 現有那份**（有缺陷但遠勝測試模式），止血後再慢慢改
- 部署前先跑過主要流程，確認不會有 `permission-denied` 打爆功能

```bash
git log --oneline -- firestore.rules   # 先確認歷史
firebase deploy --only firestore:rules
```

---

## 學習路徑

### 第一步：畫出授權模型（不寫任何 code）

這一步最重要。把每個 collection 列出來，回答三個問題：**誰能讀、誰能寫、憑什麼**。

會卡住的地方不是語法，是這類還沒想清楚的產品問題：

- 守護者憑什麼能看被追蹤者的位置？
- 好友關係是雙向的嗎？單方面加好友算數嗎？
- 一個 tracking session 結束後，守護者還該不該看得到歷史位置？
- `active_sharing_sessions` 到底是什麼？跟 `active_tracking` 是不是重複？

這些只有你能回答 —— AI 幫你寫規則時其實是在猜這些答案。

### 第二步：先修一條（`users` 的 get/list 拆分）

範圍小、影響明確，而且會逼你搞懂 Firestore 的讀取權限不只一種。

**問題**：

```javascript
match /users/{userId} {
  allow read: if isAuthenticated();   // read = get + list
```

`read` 同時涵蓋 `get`（讀單一文件）和 `list`（查詢整個 collection）。等於**任何註冊帳號的人都能撈走全部使用者名單**，不需要知道對方 uid。

以 Safii 的使用者輪廓，一份完整名單被撈走有實際危害。

**修法**：

```javascript
match /users/{userId} {
  allow get: if isAuthenticated();
  allow list: if false;
  allow write: if isOwner(userId);
```

**那好友搜尋怎麼辦？** 走已存在的 `usernames` collection：用 username 精確查到 uid → 再 `get` 那個 uid 的 profile。同樣的 get/list 拆法也該套用在 `usernames` 上。

改完用 Console 的 **Rules Playground** 驗證，感受回饋迴路。

### 第三步：處理難的

留到熟悉之後再動：

- `isFriendOf()` 這種跨文件查詢的規則（注意：每次評估都是一次額外的計費讀取，在 `location_history` 這類高頻讀取處會放大）
- `active_sharing_sessions` — 需要先做產品決策，不是純技術問題

---

## 現行規則的已知缺陷

| 位置 | 問題 | 嚴重度 |
|---|---|---|
| `users/{userId}` | `read` 未拆分，可撈全部使用者名單 | 高 |
| `active_sharing_sessions` | 任何登入者都能讀寫所有人的分享 session | 高 |
| `friendRequests` | update 未限制欄位，收件者可改 `from`/`to` | 中低 |
| `manual_tracking` / `active_tracking` | 沒有 `delete` 規則 → 禁止刪除，確認 app 是否需要 | 待確認 |
| `tokens/{userId}` | 存原始 ID token 本身就是風險，考慮整個移除 | 架構層問題 |
| `TrackingMode` | 標記為 `scheduled_tracking` 的 legacy 重複 | 清理 |

---

## 使用 Claude Code 的方式

在這個題目上，把它當**審閱者而不是作者**。

自己寫完一條規則後：

```
這是我寫的規則：[貼上]
請找出所有可能繞過它的方式，以及我沒考慮到的存取路徑。
不要幫我改寫，只要指出問題。
```

比叫它幫你寫更有價值 —— 你會看到自己沒想到的攻擊面，而那正是安全這個領域真正的學習內容。

---

## 驗證工具

- **Rules Playground**（Console → Firestore → 規則）：模擬特定使用者對特定文件的操作，部署前驗證
- **Firebase Emulator**（`npm run serve` in `functions/`）：本機跑完整流程

---

## 待辦：盤點（可交給 Claude Code）

```
1. git log 查 firestore.rules 變更歷史，判斷是否曾部署過
2. 掃過 frontend/ 和 functions/ 所有 Firestore 存取點，
   對照現行 rules 判斷部署後哪些操作會被擋而導致功能壞掉
3. 查 active_sharing_sessions 和 TrackingMode 是否還有程式碼在用，
   若無則評估直接移除
4. 確認好友搜尋目前查的是 users 還是 usernames collection
```

---

## 備註

假來電功能的規劃暫緩，優先度低於此。相關結論保留：

- 決定走 app 內模擬（不用 CallKit），可搭配 VoIP push 做雙層 fallback
- 雙層設計要點：兩個都先排程，VoIP 成功時取消本地通知；需處理重複觸發去重
- 最大風險是靜音/專注模式導致排程通知無聲失敗
- 通知橫幅會顯示 app 名稱「Safii」，有洩漏功能意圖的風險