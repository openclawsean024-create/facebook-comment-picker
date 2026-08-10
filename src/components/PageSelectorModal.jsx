import React, { useEffect, useState, useCallback } from 'react';

/**
 * 粉專選擇 Modal — 三欄式（左：粉專 / 中：貼文 / 右：留言預覽）
 *
 * Props:
 *  - isOpen: boolean
 *  - accessToken: string (user-level token from OAuth callback)
 *  - onClose(): void
 *  - onConfirm(payload): (payload) => void
 *      payload = {
 *        pageId, pageName, postId, postMessage, postUrl,
 *        comments: [{name, comment, ...}], pageAccessToken
 *      }
 */
export default function PageSelectorModal({ isOpen, accessToken, onClose, onConfirm }) {
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState(null);

  const [selectedPage, setSelectedPage] = useState(null); // {id, name, accessToken, ...}
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null); // {id, message, ...}
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(null);

  // Reset state every time modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPages([]);
    setSelectedPage(null);
    setPosts([]);
    setSelectedPost(null);
    setComments([]);
    setPagesError(null);
    setPostsError(null);
    setCommentsError(null);
  }, [isOpen]);

  // Load pages when modal opens
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let cancelled = false;

    const load = async () => {
      setLoadingPages(true);
      setPagesError(null);
      try {
        const resp = await fetch(`/api/facebook/accounts?token=${encodeURIComponent(accessToken)}`);
        const data = await resp.json();
        if (cancelled) return;
        if (!resp.ok || !data.ok) {
          setPagesError(data.error || data.details?.error?.message || '拉取粉專列表失敗');
          return;
        }
        setPages(data.accounts || []);
      } catch (err) {
        if (!cancelled) setPagesError(err.message);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, accessToken]);

  // Load posts when page selected
  const loadPosts = useCallback(async (page) => {
    if (!page) return;
    setLoadingPosts(true);
    setPostsError(null);
    setPosts([]);
    setSelectedPost(null);
    setComments([]);
    try {
      const resp = await fetch(`/api/facebook/page-posts?pageId=${page.id}&token=${encodeURIComponent(page.accessToken)}&limit=25`);
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setPostsError(data.error || '拉取貼文失敗');
        return;
      }
      setPosts(data.posts || []);
    } catch (err) {
      setPostsError(err.message);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // Load comments when post selected
  const loadComments = useCallback(async (post, page) => {
    if (!post || !page) return;
    setLoadingComments(true);
    setCommentsError(null);
    setComments([]);
    try {
      const resp = await fetch(`/api/facebook/page-comments?postId=${post.id}&token=${encodeURIComponent(page.accessToken)}&limit=100&maxPages=20`);
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setCommentsError(data.error || '拉取留言失敗');
        return;
      }
      setComments(data.comments || []);
    } catch (err) {
      setCommentsError(err.message);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handleClose = () => {
    if (loadingPages || loadingPosts || loadingComments) return; // 防止拉取中關閉
    onClose();
  };

  // ── ESC 鍵關閉 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loadingPages, loadingPosts, loadingComments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (!selectedPage || !selectedPost || comments.length === 0) return;
    onConfirm({
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      pageAccessToken: selectedPage.accessToken,
      postId: selectedPost.id,
      postMessage: selectedPost.message,
      postUrl: selectedPost.permalinkUrl,
      postTitle: (selectedPost.message || '').slice(0, 80),
      comments,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warning/10">
          <div>
            <h2 className="text-xl font-black text-warning">從粉專選擇貼文</h2>
            <p className="mt-1 text-xs text-warning/60">Select post from fanpage — Step 1 选粉專 / Step 2 选貼文 / Step 3 確認留言</p>
          </div>
          <button
            className="rounded-full bg-warning/8 px-4 py-2 text-xs font-black text-warning hover:bg-warning/15"
            onClick={handleClose}
          >
            ✕ 關閉
          </button>
        </div>

        {/* Three columns */}
        <div className="grid flex-1 overflow-hidden grid-cols-1 md:grid-cols-[260px_1fr_1fr]">
          {/* Left: Fanpages */}
          <div className="border-r border-warning/10 overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-warning/10 z-10">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">粉絲專頁 Fanpages</div>
            </div>
            {loadingPages && (
              <div className="p-6 text-sm text-warning/60 text-center">
                <div className="animate-spin inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full mb-2" />
                <div>載入粉專中...</div>
              </div>
            )}
            {pagesError && (
              <div className="p-6 text-sm text-red-600">
                ❌ {pagesError}
                <div className="mt-2 text-xs text-warning/60">
                  請確認 OAuth scope 包含 <code>pages_show_list</code>，重新登入後再試。
                </div>
              </div>
            )}
            {!loadingPages && !pagesError && pages.length === 0 && (
              <div className="p-6 text-sm text-warning/50 text-center">
                沒有找到您管理的粉專
              </div>
            )}
            <div className="divide-y divide-warning/5">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => { setSelectedPage(page); loadPosts(page); }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition hover:bg-warning/5 ${
                    selectedPage?.id === page.id ? 'bg-primary/8 border-l-4 border-primary' : ''
                  }`}
                >
                  {page.picture ? (
                    <img src={page.picture} alt={page.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center text-warning font-black">
                      {page.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-warning truncate">{page.name}</div>
                    <div className="text-[10px] text-warning/50 truncate">{page.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Middle: Posts */}
          <div className="border-r border-warning/10 overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-warning/10 z-10">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                貼文 Posts
                {selectedPage && <span className="ml-2 text-warning/60">— {selectedPage.name}</span>}
              </div>
            </div>
            {!selectedPage && (
              <div className="p-6 text-sm text-warning/50 text-center">
                請從左側選擇一個粉絲專頁
              </div>
            )}
            {selectedPage && loadingPosts && (
              <div className="p-6 text-sm text-warning/60 text-center">
                <div className="animate-spin inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full mb-2" />
                <div>載入貼文中...</div>
              </div>
            )}
            {selectedPage && postsError && (
              <div className="p-6 text-sm text-red-600">❌ {postsError}</div>
            )}
            {selectedPage && !loadingPosts && !postsError && posts.length === 0 && (
              <div className="p-6 text-sm text-warning/50 text-center">此粉專沒有可顯示的貼文</div>
            )}
            <div className="divide-y divide-warning/5">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => { setSelectedPost(post); loadComments(post, selectedPage); }}
                  className={`w-full px-4 py-3 text-left transition hover:bg-warning/5 ${
                    selectedPost?.id === post.id ? 'bg-primary/8 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {post.picture && (
                      <img src={post.picture} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-warning/50 mb-1">
                        {new Date(post.createdTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-warning/80 line-clamp-2 leading-5">{post.message}</div>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-warning/50">
                        <span>💬 {post.commentCount}</span>
                        <span>❤️ {post.reactionCount}</span>
                        <span>↗️ {post.shareCount}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Comments preview */}
          <div className="overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-warning/10 z-10">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                留言預覽 Comments
                {comments.length > 0 && <span className="ml-2 text-info">— {comments.length} 則</span>}
              </div>
            </div>
            {!selectedPost && (
              <div className="p-6 text-sm text-warning/50 text-center">請從中間選擇一篇貼文</div>
            )}
            {selectedPost && loadingComments && (
              <div className="p-6 text-sm text-warning/60 text-center">
                <div className="animate-spin inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full mb-2" />
                <div>抓取留言中...</div>
              </div>
            )}
            {selectedPost && commentsError && (
              <div className="p-6 text-sm text-red-600">❌ {commentsError}</div>
            )}
            {selectedPost && !loadingComments && comments.length === 0 && !commentsError && (
              <div className="p-6 text-sm text-warning/50 text-center">此貼文沒有留言</div>
            )}
            <div className="divide-y divide-warning/5">
              {comments.slice(0, 50).map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    {c.picture && <img src={c.picture} alt="" className="h-6 w-6 rounded-full" />}
                    <span className="text-xs font-bold text-warning">{c.name}</span>
                    <span className="text-[10px] text-warning/40">{new Date(c.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-warning/70 line-clamp-2 leading-5">{c.comment}</div>
                </div>
              ))}
            </div>
            {comments.length > 50 && (
              <div className="px-4 py-3 text-[10px] text-warning/50 text-center">
                預覽前 50 筆，匯入後可看到全部 {comments.length} 筆
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-warning/10 bg-warning/3">
          <div className="text-xs text-warning/60">
            {selectedPage && selectedPost
              ? `已選：${selectedPage.name} → ${selectedPost.message.slice(0, 30)}...`
              : '請選擇粉專、貼文並確認留言'}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleClose}>取消</button>
            <button
              className="btn-primary"
              disabled={!selectedPage || !selectedPost || comments.length === 0}
              onClick={handleConfirm}
            >
              ✓ 匯入 {comments.length} 筆留言
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
