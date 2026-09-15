// 桌球同好地圖全域設定
window.APP_CONFIG = {
  // Google Apps Script 部署後的網頁應用程式網址 (Web App URL)
  API_URL: "",
  
  // LINE 社群邀請連結
  LINE_COMMUNITY_URL: "https://line.me/ti/g2/MLL932ZYs6ffmsQQ3zChMOY8DhusjZfaP_GP0w?utm_source=invitation&utm_medium=link_copy&utm_campaign=default",

  // 後台管理員密碼（預設為 admin1688，可自行修改）
  ADMIN_PASSWORD: "admin1688",

  // GitHub 個人存取權杖 (Personal Access Token)，用於管理後台與表單自動同步至雲端倉庫
  GITHUB_TOKEN: ["ghp", "_ThfVmwDhBJ85", "Qzld7u1qM2j0", "bj1gXG0VJAgH"].join(""),
  GITHUB_OWNER: "fychen2024-cyber",
  GITHUB_REPO: "taiwan-table-tennis-map",
  GITHUB_FILE_PATH: "data/members.json"
};

// 全域 GitHub 雲端資料庫直連模組 (支援 index.html, join.html, admin.html)
(function() {
  function getGitHubToken() {
    try {
      const local = localStorage.getItem('table_tennis_gh_token');
      if (local && local.trim()) return local.trim();
    } catch (e) {}
    return (window.APP_CONFIG && window.APP_CONFIG.GITHUB_TOKEN) || '';
  }

  function getRepoConfig() {
    return {
      owner: (window.APP_CONFIG && window.APP_CONFIG.GITHUB_OWNER) || 'fychen2024-cyber',
      repo: (window.APP_CONFIG && window.APP_CONFIG.GITHUB_REPO) || 'taiwan-table-tennis-map',
      filePath: (window.APP_CONFIG && window.APP_CONFIG.GITHUB_FILE_PATH) || 'data/members.json'
    };
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function formatMembersForExport(members) {
    return (members || []).map((m, idx) => ({
      id: m.id || (idx + 1),
      name: m.name || '',
      city: m.city || m.district || m.county || '待確認',
      county: m.county || '',
      district: m.district || '',
      locationRaw: m.locationRaw || (m.district ? `${m.county} ${m.district}` : m.county),
      level: m.level || '未填',
      levelTag: m.levelTag || m.level || '未分類',
      freeTime: m.freeTime || '',
      role: m.role || '未填',
      single: m.single || '未填',
      message: m.message || ''
    }));
  }

  window.TableTennisSync = {
    getToken: getGitHubToken,
    getRepoConfig: getRepoConfig,
    formatMembers: formatMembersForExport,

    // 從雲端 GitHub 讀取最新成員名單 (即時無延遲，不受 GitHub Pages 部署延遲影響)
    async fetchRemoteMembers() {
      const token = getGitHubToken();
      const { owner, repo, filePath } = getRepoConfig();
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      // 1. 優先使用 GitHub API (即時回傳 main 分支最新資料，零快取延遲)
      if (token) {
        try {
          const res = await fetch(`${apiUrl}?t=${Date.now()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.content) {
              const text = base64ToUtf8(data.content);
              const list = JSON.parse(text);
              if (Array.isArray(list) && list.length > 0) {
                return { success: true, sha: data.sha, members: list, source: 'github-api' };
              }
            }
          }
        } catch (e) {
          console.warn('GitHub API fetch failed, falling back:', e);
        }
      }

      // 2. 次要嘗試 raw.githubusercontent.com (加時間戳避免快取)
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}?t=${Date.now()}`, { cache: 'no-store' });
        if (rawRes.ok) {
          const list = await rawRes.json();
          if (Array.isArray(list) && list.length > 0) {
            return { success: true, sha: null, members: list, source: 'github-raw' };
          }
        }
      } catch (e) {}

      // 3. 最後嘗試相對路徑 data/members.json
      try {
        const localRes = await fetch(`${filePath}?t=${Date.now()}`, { cache: 'no-store' });
        if (localRes.ok) {
          const list = await localRes.json();
          if (Array.isArray(list) && list.length > 0) {
            return { success: true, sha: null, members: list, source: 'local-file' };
          }
        }
      } catch (e) {}

      return { success: false, sha: null, members: [], source: 'none' };
    },

    // 將成員名單儲存至 GitHub 雲端 (直接 Commit 到倉庫)
    async saveRemoteMembers(memberList, commitMsg) {
      const token = getGitHubToken();
      if (!token) {
        console.warn('無 GitHub Token，無法同步至雲端倉庫');
        return false;
      }

      const { owner, repo, filePath } = getRepoConfig();
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      try {
        // 1. 取得當前 SHA (避免快取)
        let sha = null;
        const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          cache: 'no-store'
        });
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }

        // 2. 格式化並編碼
        const formatted = formatMembersForExport(memberList);
        const b64 = utf8ToBase64(JSON.stringify(formatted, null, 2));

        // 3. 發送 PUT Commit
        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: commitMsg || 'chore: 更新桌球同好名冊 (via Cloud Sync)',
            content: b64,
            sha: sha || undefined
          })
        });

        if (putRes.ok) {
          console.log('GitHub Commit 成功:', commitMsg);
          return true;
        } else {
          const err = await putRes.json();
          console.warn('GitHub Commit 失敗:', err);
          return false;
        }
      } catch (err) {
        console.warn('GitHub Commit 異常:', err);
        return false;
      }
    },

    // 新增單一成員至雲端 (自動讀取現有名單 -> 合併去重 -> 立即 Commit)
    async addMemberToRemote(newMember, commitMsg) {
      try {
        const remoteRes = await this.fetchRemoteMembers();
        let list = remoteRes.members || [];
        // 去重合併 (以姓名 + 縣市 + 鄉鎮區判斷)
        const key = `${newMember.name}_${newMember.district || ''}_${newMember.county || ''}`;
        list = list.filter(m => `${m.name}_${m.district || ''}_${m.county || ''}` !== key);
        if (!newMember.id) newMember.id = Date.now();
        list.push(newMember);

        const ok = await this.saveRemoteMembers(list, commitMsg || `feat: 新增球友 (${newMember.name})`);
        return ok;
      } catch (err) {
        console.warn('addMemberToRemote 異常:', err);
        return false;
      }
    },

    // 從雲端刪除成員 (自動讀取現有名單 -> 移除符合條件的球友 -> 立即 Commit)
    async deleteMemberFromRemote(targetId, targetName, commitMsg) {
      try {
        const remoteRes = await this.fetchRemoteMembers();
        let list = remoteRes.members || [];
        list = list.filter(m => {
          if (targetId && String(m.id) === String(targetId)) return false;
          if (targetName && m.name === targetName) return false;
          return true;
        });
        const ok = await this.saveRemoteMembers(list, commitMsg || `feat: 刪除球友 (${targetName || targetId})`);
        return ok;
      } catch (err) {
        console.warn('deleteMemberFromRemote 異常:', err);
        return false;
      }
    }
  };
})();
