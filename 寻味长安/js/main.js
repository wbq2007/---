/* ============================================================
   寻味长安 · 主脚本（自 index.html 抽离）
   一、页面交互：进度条 / 滚动浮现 / 导航高亮 / 回到顶部
   二、社区讨论：Bmob 增删查（发帖、点赞、评论）
   注意：本文件在 </body> 前同步加载，DOM 已就绪。
   ============================================================ */

/* ================================================================
   一、页面交互
   ================================================================ */

/* ---------- 1. 顶部滚动进度条 + 回到顶部按钮 ---------- */
const progressBar = document.getElementById("progress");
const backtopBtn  = document.getElementById("backtop");
window.addEventListener("scroll", () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
  progressBar.style.width = pct + "%";
  backtopBtn.classList.toggle("show", window.scrollY > 400);
}, { passive: true });

/* ---------- 2. 滚动浮现动画 ---------- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => {
  const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains("reveal"));
  el.style.transitionDelay = (siblings.indexOf(el) % 3) * 0.08 + "s";
  revealObserver.observe(el);
});

/* ---------- 3. 导航高亮 ---------- */
const navLinks = document.querySelectorAll("#nav a");
const spyObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }
  });
}, { rootMargin: "-35% 0px -55% 0px" });
["foods", "timeline", "culture", "map", "community"]
  .forEach(id => spyObserver.observe(document.getElementById(id)));

/* ---------- 4. hero 照片覆盖（imgOk/imgFail 已在 <head> 定义） ---------- */
(function () {
  const heroPhoto = document.getElementById("hero-photo");
  function show() {
    Object.assign(heroPhoto.style, {
      display: "block", position: "absolute", inset: "0",
      width: "100%", height: "100%", objectFit: "cover", zIndex: "0"
    });
  }
  heroPhoto.onload  = show;
  heroPhoto.onerror = function () { heroPhoto.style.display = "none"; };
  if (heroPhoto.complete && heroPhoto.naturalWidth > 0) show();
})();

/* ---------- 5. 时间格式化 ---------- */
function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || "");
  const diff = Date.now() - d.getTime();
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (diff < min)        return "刚刚";
  if (diff < hour)       return Math.floor(diff / min)  + " 分钟前";
  if (diff < day)        return Math.floor(diff / hour) + " 小时前";
  if (diff < 7 * day)    return Math.floor(diff / day)  + " 天前";
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/* ================================================================
   二、社区讨论（Bmob 后端云）
   ================================================================ */
const APP_ID  = "69b7d9119eae3b93ba558e37babb2924";
const REST_KEY = "ef8e6bae5e5634ab4067538e1e18df55";
const API = "https://api.codenow.cn/1";

function bmobFetch(method, path, body) {
  return fetch(API + path, {
    method: method,
    headers: {
      "X-Bmob-Application-Id": APP_ID,
      "X-Bmob-REST-API-Key": REST_KEY,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(res => res.json());
}

/* 防 XSS 转义 */
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* 内嵌小图标：点赞心形 / 评论气泡（避免 emoji 跨平台不一致） */
const ICON_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.2C.4 8.6 2.2 5 5.6 5c2 0 3.4 1.1 4.4 2.6C11 6.1 12.4 5 14.4 5c3.4 0 5.2 3.6 3.6 6.8C19.5 16.1 12 21 12 21z"/></svg>';
const ICON_CHAT  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 1-2z" transform="translate(0,-1)"/></svg>';

/* ========== 功能 1：加载帖子列表 ========== */
function loadPosts() {
  bmobFetch("GET", "/classes/Post?order=-createdAt&limit=50")
    .then(data => {
      const list = document.getElementById("post-list");

      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<p class="list-tip">还没有帖子，来抢沙发吧！</p>';
        return;
      }

      list.innerHTML = data.results.map(p => {
        const initial = esc(String(p.nickname || "友").trim().charAt(0));
        return `
        <div class="post-item">
          <div class="post-head">
            <div class="post-avatar">${initial}</div>
            <div class="who">
              <b>${esc(p.nickname)}</b><br>
              <span class="meta">${fmtTime(p.createdAt)}</span>
            </div>
          </div>
          <h4>${esc(p.title)}</h4>
          <div class="content">${esc(p.content)}</div>

          ${p.imageUrl ? `
            <div class="post-img">
              <div class="art">
                <img src="${esc(p.imageUrl)}" alt="帖子配图"
                     style="opacity:1;" onerror="imgFail(this)">
              </div>
            </div>` : ""}

          <div class="post-actions">
            <button class="btn" onclick="likePost('${p.objectId}', this)">
              ${ICON_HEART} 点赞 <span>${p.likes || 0}</span>
            </button>
            <button class="btn btn-comment"
                    onclick="toggleComments('${p.objectId}')">
              ${ICON_CHAT} 评论
            </button>
          </div>

          <div class="comment-box" id="comments-${p.objectId}">
            <div class="comment-list" id="clist-${p.objectId}">加载中……</div>
            <div class="comment-form">
              <input class="nick" id="cnick-${p.objectId}" placeholder="昵称">
              <input id="ctext-${p.objectId}" placeholder="友善评论哦~" maxlength="200">
              <button class="btn" onclick="addComment('${p.objectId}')">发送</button>
            </div>
          </div>
        </div>
      `}).join("");
    })
    .catch(err => {
      document.getElementById("post-list").innerHTML =
        '<p class="list-error">帖子加载失败：' + esc(err.message) + '</p>';
    });
}

/* ========== 功能 2：发布新帖子 ========== */
function publishPost() {
  const nickname = document.getElementById("inp-nickname").value.trim();
  const title    = document.getElementById("inp-title").value.trim();
  const content  = document.getElementById("inp-content").value.trim();
  const imageUrl = document.getElementById("inp-image").value.trim();

  if (!nickname || !title || !content) {
    alert("昵称、标题、内容都要填写哦~");
    return;
  }

  const btn = document.getElementById("btn-publish");
  btn.disabled = true;
  btn.textContent = "发布中…";

  bmobFetch("POST", "/classes/Post", {
    nickname, title, content, imageUrl, likes: 0
  })
  .then(res => {
    if (res.objectId) {
      document.getElementById("inp-title").value = "";
      document.getElementById("inp-content").value = "";
      document.getElementById("inp-image").value = "";
      loadPosts();
    } else {
      alert("发布失败：" + (res.error || "未知错误"));
    }
  })
  .catch(err => alert("网络错误：" + err.message))
  .finally(() => {
    btn.disabled = false;
    btn.textContent = "发 布";
  });
}

/* ========== 功能 3：点赞（原子自增） ========== */
function likePost(postId, btn) {
  bmobFetch("PUT", "/classes/Post/" + postId, {
    likes: { "__op": "Increment", "amount": 1 }
  })
  .then(res => {
    if (res.updatedAt) {
      const span = btn.querySelector("span");
      span.textContent = Number(span.textContent) + 1;
      btn.classList.remove("pop");
      void btn.offsetWidth;
      btn.classList.add("pop");
    }
  })
  .catch(err => alert("点赞失败：" + err.message));
}

/* ========== 功能 4：展开/收起评论区并加载 ========== */
function toggleComments(postId) {
  const box = document.getElementById("comments-" + postId);
  const isOpen = box.style.display === "block";
  box.style.display = isOpen ? "none" : "block";

  if (!isOpen) {
    const where = JSON.stringify({
      post: { "__type": "Pointer", "className": "Post", "objectId": postId }
    });
    bmobFetch("GET", "/classes/Comment?where=" + encodeURIComponent(where) + "&order=createdAt&limit=100")
      .then(data => {
        const clist = document.getElementById("clist-" + postId);
        if (!data.results || data.results.length === 0) {
          clist.innerHTML = '<div class="comment-item">暂无评论，来说两句~</div>';
          return;
        }
        clist.innerHTML = data.results.map(c =>
          `<div class="comment-item"><b>${esc(c.nickname)}</b>：${esc(c.content)}<span class="ctime">${fmtTime(c.createdAt)}</span></div>`
        ).join("");
      })
      .catch(err => {
        document.getElementById("clist-" + postId).textContent = "评论加载失败";
      });
  }
}

/* ========== 功能 5：发表评论 ========== */
function addComment(postId) {
  const nick = document.getElementById("cnick-" + postId).value.trim();
  const text = document.getElementById("ctext-" + postId).value.trim();

  if (!nick || !text) { alert("昵称和评论内容都要填写哦~"); return; }

  bmobFetch("POST", "/classes/Comment", {
    nickname: nick,
    content: text,
    post: { "__type": "Pointer", "className": "Post", "objectId": postId }
  })
  .then(res => {
    if (res.objectId) {
      document.getElementById("ctext-" + postId).value = "";
      const box = document.getElementById("comments-" + postId);
      box.style.display = "none";
      toggleComments(postId);
    } else {
      alert("评论失败：" + (res.error || "未知错误"));
    }
  })
  .catch(err => alert("网络错误：" + err.message));
}

/* ---------- 6. 街巷手风琴：触屏设备点按展开（桌面端由 CSS :hover 驱动，不启用） ---------- */
if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
  document.querySelectorAll(".street-panel").forEach(panel => {
    panel.addEventListener("click", () => {
      const wasActive = panel.classList.contains("active");
      document.querySelectorAll(".street-panel.active")
        .forEach(p => p.classList.remove("active"));
      if (!wasActive) panel.classList.add("active");
    });
  });
}

/* ---------- 7. 深浅主题切换按钮（applyTheme 定义于 js/img-utils.js） ---------- */
document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
});

/* ---------- 8. 点击任意非文字区域，取消文字选中 ----------
   浏览器默认行为下，点按背景/图片/按钮等已经会收起选区；
   这里显式补齐，确保"任何地方"都能取消（拖拽选字不受影响，
   因为拖动结束后 click 的目标是文字元素本身）。 */
document.addEventListener("click", e => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("input, textarea, select, [contenteditable='true']")) return;
  const TEXT_TAGS = ["P","H1","H2","H3","H4","H5","H6","LI","TD","TH",
                     "PRE","CODE","BLOCKQUOTE","SPAN","A","B","STRONG","EM",
                     "I","LABEL","SMALL"];
  if (!TEXT_TAGS.includes(t.tagName)) sel.removeAllRanges();
});

loadPosts();
