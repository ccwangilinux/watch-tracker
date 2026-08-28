<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CLIENT_ID, SCOPE } from '@/services/google/auth'

const router = useRouter()

const configured = CLIENT_ID.trim() !== ''
const origin = location.origin
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.back()">‹ 返回</button>
    <h1 class="head__title">Google 雲端設定說明</h1>
  </header>

  <section class="card card--intro">
    <p>
      連結 Google 之後，你的觀看紀錄會備份到<strong>你自己的</strong> Google 雲端硬碟，
      成為一份私人試算表。它同時也是多台裝置之間交換資料的媒介。
    </p>
    <p class="muted">
      不連結也能正常使用——資料本來就存在裝置本機，
      也可以用 JSON 匯出匯入手動備份與搬移。
    </p>
  </section>

  <section class="card">
    <h2>一、連結你的 Google 帳號</h2>
    <ol class="steps">
      <li>回到「雲端同步」頁，按 <b>使用 Google 登入</b></li>
      <li>在彈出的視窗選擇你的 Google 帳號</li>
      <li>
        看到「Google 尚未驗證這個應用程式」時，點<b>進階</b>，
        再點<b>前往「我的觀看紀錄」(不安全)</b>
      </li>
      <li>同意授權後回到 App</li>
      <li>
        若這個帳號還沒有本 App 建立過的試算表，會直接建立一份；
        已經有的話會列出來讓你選擇
      </li>
      <li>確認連結的是正確那份之後，按 <b>立即同步</b></li>
    </ol>

    <div class="note note--warn">
      <b>那個「不安全」的警告是正常的。</b>
      它出現的原因是這個應用程式沒有送交 Google 審核，而不是連線有問題。
      這是個人自用的工具，你授權的對象是你自己架設的網頁。
    </div>
  </section>

  <section class="card">
    <h2>二、多台裝置怎麼對齊</h2>
    <p>
      每台裝置各自記住自己連到哪一份試算表，這個設定<b>不會</b>跟著同步。
      第二台裝置登入時，務必在清單中<b>選擇既有的那份</b>，
      不要建立新的——每份試算表都是獨立的，不會互相同步。
    </p>
    <p class="muted">
      雲端同步頁會顯示目前連結的<b>檔案 ID</b>，兩台裝置比對這串是否相同，
      就知道有沒有對齊。
    </p>
  </section>

  <section class="card">
    <h2>三、三種同步方式的差別</h2>
    <dl class="modes">
      <div>
        <dt>立即同步</dt>
        <dd>
          雙向合併。同一筆資料以「最後修改時間較新」的那邊為準；
          兩邊時間相同但內容不同時，為避免誤刪，兩邊都不會被覆寫，
          並列在下方讓你自行處理。
        </dd>
      </div>
      <div>
        <dt>以本機資料覆蓋雲端</dt>
        <dd>單向上傳，不合併。用在本機才是正確版本的時候。</dd>
      </div>
      <div>
        <dt>以雲端資料覆蓋本機</dt>
        <dd>單向下載，不合併。用在雲端才是正確版本的時候。</dd>
      </div>
    </dl>
    <div class="note">
      兩個「覆蓋」都會讓其中一邊的資料被完全取代。動手前可以先<b>匯出 JSON</b> 留底。
    </div>
  </section>

  <section class="card">
    <h2>四、關於權限與安全</h2>
    <ul class="bullets">
      <li>
        只申請 <code>{{ SCOPE.split('/').pop() }}</code> 權限——
        本 App 只看得到自己建立的檔案，你雲端硬碟裡的其他東西一概讀不到
      </li>
      <li>授權過程完全在 Google 自己的頁面完成，本 App 拿不到你的密碼</li>
      <li>
        存取權杖只放在記憶體裡，不寫入裝置儲存空間，
        關掉頁面就消失——代價是重新開啟後要再授權一次才能同步
      </li>
      <li>建立的試算表預設就是私人的，只有你自己看得到</li>
    </ul>
  </section>

  <section class="card">
    <h2>五、自行部署時的設定</h2>
    <p class="muted">
      這一節是給要自己 fork 這個專案、架在自己網址上的人。
      直接使用本站的話不需要做這些。
    </p>

    <p>
      目前這個網站
      <b :class="configured ? 'ok' : 'bad'">
        {{ configured ? '已設定' : '尚未設定' }}
      </b>
      Google OAuth 用戶端 ID。
    </p>

    <ol class="steps">
      <li>到 Google Cloud Console 建立專案</li>
      <li>在「API 和服務 → 程式庫」啟用 <b>Google Sheets API</b> 與 <b>Google Drive API</b></li>
      <li>
        到「Google 驗證平台」設定應用程式名稱與支援信箱，
        目標對象選<b>外部</b>，並把自己的帳號加入<b>測試使用者</b>
      </li>
      <li>
        在「用戶端」建立 <b>網頁應用程式</b> 類型的 OAuth 用戶端，
        已授權的 JavaScript 來源填入：
        <code class="block">{{ origin }}</code>
        <span class="muted">重新導向 URI 留空——本 App 使用 popup 流程，不需要它</span>
      </li>
      <li>
        把取得的 Client ID 設為建置時的環境變數
        <code>VITE_GOOGLE_CLIENT_ID</code>
      </li>
    </ol>

    <div class="note note--warn">
      Client ID 是公開值，可以放在程式碼裡。
      但<b>絕對不要</b>把 Client Secret 放進前端專案——本 App 的流程完全不需要它。
    </div>
  </section>
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }
.head__title { font-size: 20px; font-weight: 700; }

.card {
  padding: var(--sp-4);
  margin-bottom: var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  font-size: 14px;
  line-height: 1.7;
}

.card--intro { background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
.card h2 { font-size: 15px; font-weight: 700; margin-bottom: var(--sp-3); }
.card p + p { margin-top: var(--sp-2); }

.muted { color: var(--text-faint); font-size: 13px; }
b { color: var(--text); }
.ok { color: var(--success); }
.bad { color: var(--danger); }

.steps { counter-reset: step; display: flex; flex-direction: column; gap: var(--sp-3); }

.steps li {
  counter-increment: step;
  position: relative;
  padding-left: 30px;
  color: var(--text-dim);
}

.steps li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 3px;
  width: 21px;
  height: 21px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--r-full);
}

.bullets { display: flex; flex-direction: column; gap: var(--sp-2); }

.bullets li {
  position: relative;
  padding-left: var(--sp-4);
  color: var(--text-dim);
}

.bullets li::before {
  content: '·';
  position: absolute;
  left: 6px;
  color: var(--accent);
  font-weight: 700;
}

.modes { display: flex; flex-direction: column; gap: var(--sp-3); }
.modes dt { font-weight: 700; margin-bottom: 2px; }
.modes dd { margin: 0; color: var(--text-dim); font-size: 13px; }

.note {
  margin-top: var(--sp-3);
  padding: var(--sp-3);
  background: var(--surface-2);
  border-radius: var(--r-md);
  font-size: 13px;
  color: var(--text-dim);
}

.note--warn {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 28%, transparent);
}

code {
  padding: 1px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
  color: var(--accent);
}

code.block {
  display: block;
  margin: var(--sp-2) 0 var(--sp-1);
  padding: var(--sp-2);
  word-break: break-all;
  color: var(--text);
}
</style>
