/* ============================================================
   寻味长安 · 头部工具脚本（在 <head> 中同步加载）
   一、深浅主题初始化：必须在首帧渲染前执行，避免深色用户
       进页面时闪一下白屏（大厂标准的 anti-FOUC 做法）
   二、图片加载回调：美食卡片/首屏的 <img> 内联引用了
       imgOk / imgFail，要赶在图片可能加载完成之前定义好。
       - imgOk：照片加载成功 -> 淡入显示（盖住 SVG 插画）
       - imgFail：照片不存在 -> 隐藏 <img>，露出手绘插画
   ============================================================ */

/* ---------- 一、深浅主题 ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("xwc-theme", theme); } catch (e) { /* 隐私模式兜底 */ }
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#17171A" : "#F53F3F");
}
(function initTheme() {
  var saved = null;
  try { saved = localStorage.getItem("xwc-theme"); } catch (e) {}
  if (!saved) {
    /* 首次访问跟随系统偏好 */
    saved = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" : "light";
  }
  applyTheme(saved);
})();

/* ---------- 二、图片加载回调 ---------- */
function imgOk(img)  { img.style.opacity = 1; }
function imgFail(img) { img.style.display = "none"; }
