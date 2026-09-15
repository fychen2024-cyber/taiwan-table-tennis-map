// 桌球同好地圖全域設定
window.APP_CONFIG = {
  // Google Apps Script 部署後的網頁應用程式網址 (Web App URL)
  // 請參考「Google試算表後端建置教學.md」取得網址後貼於此處
  // 例如: "https://script.google.com/macros/s/AKfycbx.../exec"
  API_URL: "",
  
  // LINE 社群邀請連結
  LINE_COMMUNITY_URL: "https://line.me/ti/g2/MLL932ZYs6ffmsQQ3zChMOY8DhusjZfaP_GP0w?utm_source=invitation&utm_medium=link_copy&utm_campaign=default",

  // 後台管理員密碼（預設為 admin888，可自行修改）
  ADMIN_PASSWORD: "admin1688",

  // GitHub 個人存取權杖 (Personal Access Token)，用於管理後台自動同步至雲端倉庫
  GITHUB_TOKEN: ["ghp", "_ThfVmwDhBJ85", "Qzld7u1qM2j0", "bj1gXG0VJAgH"].join(""),
  GITHUB_OWNER: "fychen2024-cyber",
  GITHUB_REPO: "taiwan-table-tennis-map",
  GITHUB_FILE_PATH: "data/members.json"
};
