"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DAYS_IN_MONTH, MONTH_COLORS, MONTHS, youtubeId } from "@/lib/catalog";
import { blankStory, createStudentAccount, deleteStory, getAccess, getAttempts, getMonthCovers, getStories, getStoryReads, getStudentProfiles, getStudentReadCounts, isDemo, markStoryRead, saveAttempt, saveMonthCover, saveStory, saveStoryWithCover, signIn, signOut, validateCoverFile } from "@/lib/data";
import type { Attempt, MonthCover, Question, Story, StoryActivities, StoryRead, StudentProfile } from "@/lib/types";

type View = "home" | "month" | "story" | "admin" | "login" | "progress";
type Props = { view: View; month?: number; storyId?: string };

function totalQuestions(story: Story): number {
  return (story.questions?.length || 0)
    + (story.activities?.true_false.length || 0)
    + (story.activities?.short_answer.length || 0)
    + (story.activities?.discussion.length || 0);
}

export function StoryApp({ view, month = 1, storyId }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [monthCovers, setMonthCovers] = useState<MonthCover[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [reads, setReads] = useState<StoryRead[]>([]);
  const [access, setAccess] = useState<{ email: string | null; admin: boolean }>({ email: null, admin: isDemo });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Story | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const currentAccess = await getAccess();
      setAccess(currentAccess);
      const [allStories, allAttempts, allMonthCovers, allReads] = await Promise.all([
        getStories(view === "admin" && currentAccess.admin),
        getAttempts(),
        getMonthCovers(),
        getStoryReads(),
      ]);
      setStories(allStories);
      setAttempts(allAttempts);
      setMonthCovers(allMonthCovers);
      setReads(allReads);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const published = stories.filter(story => story.status === "published");
  const selectedStory = stories.find(story => story.id === storyId);
  const completedIds = new Set(reads.map(read => read.story_id));

  async function handleSave(story: Story, coverFile: File | null) {
    const previousUrl = stories.find(item => item.id === story.id)?.image_url || "";
    await saveStoryWithCover(story, coverFile, previousUrl);
    setEditor(null);
    await reload();
  }

  async function handleSaveMonthCover(targetMonth: number, file: File | null) {
    const previousUrl = monthCovers.find(item => item.month === targetMonth)?.image_url || "";
    await saveMonthCover(targetMonth, file, previousUrl);
    await reload();
  }

  async function handleDelete(story: Story) {
    if (!confirm(`Xóa truyện “${story.title || "Chưa đặt tên"}”?`)) return;
    await deleteStory(story.id, story.image_url);
    setEditor(null);
    await reload();
  }

  return <div className="app-shell">
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Về trang chủ"><span className="brand-mark">✦</span><span>one story<span className="brand-light"> a day</span><small>Góc đọc mỗi ngày</small></span></Link>
      <nav className="topnav" aria-label="Điều hướng chính">
        <Link href="/" className={view === "home" ? "active" : ""}>Trang chủ</Link>
        <Link href="/months/1" className={view === "month" ? "active" : ""}>Thư viện truyện</Link>
        {(!access.email || access.admin) && <Link href="/admin" className={view === "admin" ? "active" : ""}>Quản lý nội dung</Link>}
        {access.email && !access.admin && <Link href="/progress" className={view === "progress" ? "active" : ""}>Tiến độ của em</Link>}
        {!isDemo && !access.email && <Link href="/login" className="mobile-login">Đăng nhập</Link>}
        {access.email && <button className="mobile-login mobile-signout" onClick={async () => { await signOut(); await reload(); }}>Đăng xuất</button>}
      </nav>
      <div className="top-actions"><span className="mode-pill">{isDemo ? "BẢN XEM TRƯỚC" : access.email ? "ĐÃ ĐĂNG NHẬP" : "HỌC MỖI NGÀY"}</span>{!isDemo && !access.email ? <Link href="/login" className="account-link">Đăng nhập</Link> : <span className="avatar">{access.email?.[0]?.toUpperCase() || "S"}</span>}{access.email && <button className="account-link signout-top" onClick={async () => { await signOut(); await reload(); }}>Đăng xuất</button>}</div>
    </header>

    {error && <div className="notice error" role="alert">{error}</div>}
    {loading ? <main className="page loading"><div className="spinner"/><p>Đang mở thư viện truyện...</p></main> : <>
      {view === "home" && <Home stories={published} reads={reads} monthCovers={monthCovers} />}
      {view === "month" && <Month month={month} stories={published} completedIds={completedIds} coverUrl={monthCovers.find(item => item.month === month)?.image_url || ""} />}
      {view === "story" && (selectedStory ? <StoryReader story={selectedStory} attempts={attempts.filter(a => a.story_id === selectedStory.id)} isRead={completedIds.has(selectedStory.id)} onMarkRead={async () => { await markStoryRead(selectedStory.id); setReads(await getStoryReads()); }} onDone={async attempt => { await saveAttempt(attempt); setAttempts(await getAttempts()); }} /> : <main className="page empty-state"><h1>Không tìm thấy câu chuyện</h1><p>Truyện này có thể chưa được xuất bản.</p><Link href="/" className="button primary">Về trang chủ</Link></main>)}
      {view === "progress" && (access.email ? <Progress stories={published} reads={reads} attempts={attempts} email={access.email} /> : <StudentLogin onLogin={reload} />)}
      {view === "admin" && (access.admin ? <Admin stories={stories} monthCovers={monthCovers} editor={editor} setEditor={setEditor} onSave={handleSave} onSaveMonthCover={handleSaveMonthCover} onDelete={handleDelete} onReload={reload} email={access.email} /> : <Login onLogin={reload} />)}
      {view === "login" && <StudentLogin onLogin={reload} />}
    </>}
    <footer className="footer"><span>✦ one story a day</span><span>Một câu chuyện nhỏ, một khám phá mới mỗi ngày.</span><span>Thiết kế mẫu • 2026</span></footer>
  </div>;
}

function Home({ stories, reads, monthCovers }: { stories: Story[]; reads: StoryRead[]; monthCovers: MonthCover[] }) {
  const completed = new Set(reads.map(a => a.story_id));
  const first = stories[0];
  return <main className="page">
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> MỖI NGÀY MỘT CÂU CHUYỆN</div><h1>Mở trang sách.<br/><em>Mở cả thế giới.</em></h1><p>Nghe câu chuyện, đọc theo nhịp của riêng em và khám phá xem mình đã hiểu được bao nhiêu qua những câu hỏi thú vị.</p><div className="hero-actions"><Link href={first ? `/stories/${first.id}` : "/months/1"} className="button primary">Bắt đầu đọc <span>↗</span></Link><Link href="/months/1" className="button soft">Khám phá thư viện <span>→</span></Link></div><div className="hero-foot"><div className="mini-avatars"><span>🌼</span><span>⭐</span><span>📚</span></div><span>365 ngày kể chuyện · 12 tập sách</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="sun"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sparkle sp-one">✦</div><div className="sparkle sp-two">✧</div><div className="sparkle sp-three">✦</div><div className="book"><div className="book-left"><span className="book-line"/><span className="book-line short"/><span className="book-line"/><span className="book-line short"/></div><div className="book-right"><div className="book-illustration"><span className="hill hill-a"/><span className="hill hill-b"/><span className="tree">♣</span><span className="butterfly">✦</span></div></div></div><div className="floating-card"><span>✨</span><div><strong>Hôm nay đọc gì?</strong><small>Một câu chuyện đang chờ em</small></div></div></div>
    </section>
    <section className="stats-row" aria-label="Tổng quan"><div><span className="stat-icon violet">▣</span><strong>12 <small>tập sách</small></strong><p>Mỗi tháng một hành trình</p></div><div><span className="stat-icon orange">☀</span><strong>365 <small>ngày</small></strong><p>Câu chuyện mỗi ngày</p></div><div><span className="stat-icon green">✓</span><strong>{completed.size} <small>đã hoàn thành</small></strong><p>Tiến bộ từng trang sách</p></div></section>
    <section className="section-heading"><div><span className="kicker">BỘ SƯU TẬP</span><h2>Khám phá 12 tháng truyện</h2><p>Chọn một tháng và bắt đầu chuyến phiêu lưu của riêng em.</p></div><Link href="/months/1" className="text-link">Xem thư viện <span>→</span></Link></section>
    <div className="month-grid">{MONTHS.map((label, index) => { const count = stories.filter(s => s.month === index + 1).length; const coverUrl = monthCovers.find(item => item.month === index + 1)?.image_url; return <Link href={`/months/${index + 1}`} className="month-card" key={label} style={{ "--card-color": MONTH_COLORS[index] } as React.CSSProperties}><div className={`month-art ${coverUrl ? "has-cover" : ""}`} style={coverUrl ? { backgroundImage: `url(${JSON.stringify(coverUrl)})` } : undefined}><span className="month-number">{String(index + 1).padStart(2, "0")}</span>{!coverUrl && <span className="month-symbol">{["✿", "☁", "✾", "❀", "☀", "✦", "☼", "✳", "❁", "◕", "✷", "❄"][index]}</span>}</div><div className="month-meta"><div><h3>{label}</h3><p>{DAYS_IN_MONTH[index]} ngày · {count} truyện đã có</p></div><span className="circle-arrow">↗</span></div></Link>; })}</div>
    <section className="info-banner"><div className="info-icon">✦</div><div><strong>Học theo cách em thích</strong><p>Xem video, đọc truyện và trả lời câu hỏi để ghi nhớ tốt hơn.</p></div><Link href={first ? `/stories/${first.id}` : "/months/1"} className="button white">Đọc thử ngay →</Link></section>
  </main>;
}

function Month({ month, stories, completedIds, coverUrl }: { month: number; stories: Story[]; completedIds: Set<string>; coverUrl: string }) {
  const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1;
  const list = stories.filter(story => story.month === safeMonth);
  const byDay = new Map(list.map(story => [story.day, story]));
  return <main className="page subpage"><div className="breadcrumb"><Link href="/">Trang chủ</Link><span>›</span><span>Thư viện truyện</span></div><div className="month-header"><div><span className="kicker">TẬP {String(safeMonth).padStart(2,"0")} / 12</span><h1>{MONTHS[safeMonth - 1]}: Mỗi ngày một câu chuyện</h1><p>Chọn một ngày để nghe, đọc và khám phá nội dung truyện.</p></div>{coverUrl && <div className="month-cover-feature" style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` }} role="img" aria-label={`Ảnh bìa ${MONTHS[safeMonth - 1]}`} />}<div className="month-progress"><strong>{list.filter(s => completedIds.has(s.id)).length}/{DAYS_IN_MONTH[safeMonth - 1]}</strong><span>Ngày đã hoàn thành</span><div className="progress-track"><div style={{ width: `${list.filter(s => completedIds.has(s.id)).length / DAYS_IN_MONTH[safeMonth - 1] * 100}%` }}/></div></div></div>
    <div className="month-tabs">{MONTHS.map((label, i) => <Link href={`/months/${i + 1}`} key={label} className={i + 1 === safeMonth ? "selected" : ""}>{label}</Link>)}</div>
    <div className="list-heading"><h2>Danh sách ngày học</h2><span>{list.length} truyện đã xuất bản / {DAYS_IN_MONTH[safeMonth - 1]} ngày</span></div>
    <div className="day-grid">{Array.from({ length: DAYS_IN_MONTH[safeMonth - 1] }, (_, i) => { const story = byDay.get(i + 1); return story ? <Link key={i} href={`/stories/${story.id}`} className="day-card available"><span className="day-badge">NGÀY {String(i + 1).padStart(2,"0")}</span>{story.image_url ? <span className="day-cover" style={{ backgroundImage: `url(${JSON.stringify(story.image_url)})` }} aria-hidden="true" /> : <span className="day-emoji">{["📖", "🪁", "🌱", "🌙", "🦋", "🌻"][i % 6]}</span>}<h3>{story.title}</h3><p>{story.duration_minutes} phút · {totalQuestions(story)} câu hỏi</p><span className="day-footer">{completedIds.has(story.id) ? "✓ Đã hoàn thành" : "Bắt đầu học →"}</span></Link> : <div key={i} className="day-card unavailable"><span className="day-badge">NGÀY {String(i + 1).padStart(2,"0")}</span><span className="day-emoji faded">✧</span><h3>Đang cập nhật</h3><p>Câu chuyện sẽ xuất hiện tại đây</p><span className="day-footer">Sắp có truyện</span></div>; })}</div>
  </main>;
}

function Progress({ stories, reads, attempts, email }: { stories: Story[]; reads: StoryRead[]; attempts: Attempt[]; email: string }) {
  const byId = new Map(stories.map(story => [story.id, story]));
  const readIds = new Set(reads.map(read => read.story_id));
  const recent = reads.map(read => ({ read, story: byId.get(read.story_id) })).filter(item => item.story);
  return <main className="page subpage progress-page">
    <div className="breadcrumb"><Link href="/">Trang chủ</Link><span>›</span><span>Tiến độ của em</span></div>
    <div className="admin-heading"><div><span className="kicker">HÀNH TRÌNH ĐỌC SÁCH</span><h1>Tiến độ của em</h1><p>{email}</p></div><Link href="/months/10" className="button primary">Đọc truyện tiếp →</Link></div>
    <div className="admin-stats"><div><span className="stat-icon green">✓</span><div><strong>{readIds.size}</strong><p>Truyện đã đọc</p></div></div><div><span className="stat-icon violet">▣</span><div><strong>{stories.length}</strong><p>Truyện hiện có</p></div></div><div><span className="stat-icon orange">✎</span><div><strong>{attempts.length}</strong><p>Lượt làm bài</p></div></div></div>
    <section className="admin-panel"><div className="panel-heading"><div><h2>Tiến độ theo tháng</h2><p>Mỗi truyện chỉ được tính một lần khi em bấm “Đánh dấu đã đọc”.</p></div></div><div className="progress-month-grid">{MONTHS.map((label, index) => { const monthStories = stories.filter(story => story.month === index + 1); const count = monthStories.filter(story => readIds.has(story.id)).length; return <Link key={label} href={`/months/${index + 1}`} className="progress-month"><strong>{label}</strong><span>{count}/{monthStories.length} truyện</span><div className="progress-track"><div style={{ width: monthStories.length ? `${count / monthStories.length * 100}%` : "0%" }} /></div></Link>; })}</div></section>
    <section className="admin-panel"><div className="panel-heading"><div><h2>Truyện vừa đọc</h2><p>Danh sách được lưu riêng cho tài khoản của em.</p></div></div>{recent.length ? <div className="recent-reads">{recent.slice(0, 12).map(({ read, story }) => <Link href={`/stories/${story!.id}`} key={read.story_id}><strong>{story!.title}</strong><span>{MONTHS[story!.month - 1]} · Ngày {story!.day}</span></Link>)}</div> : <p className="empty-quiz">Em chưa đánh dấu truyện nào đã đọc.</p>}</section>
  </main>;
}

function StoryReader({ story, attempts, isRead, onMarkRead, onDone }: { story: Story; attempts: Attempt[]; isRead: boolean; onMarkRead: () => Promise<void>; onDone: (attempt: Attempt) => Promise<void> }) {
  const [tab, setTab] = useState<"read" | "quiz">("read");
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [readBusy, setReadBusy] = useState(false);
  const questions = story.questions || [];
  const score = questions.reduce((sum, question, index) => sum + (answers[index] === question.answer_index ? 1 : 0), 0);
  const video = youtubeId(story.youtube_url);

  async function submitQuiz() {
    if (answers.length < questions.length || questions.some((_, i) => answers[i] === undefined)) { setNotice("Hãy chọn đáp án cho tất cả câu hỏi."); return; }
    setSaving(true); setNotice("");
    try {
      await onDone({ story_id: story.id, score, total: questions.length, answers, created_at: new Date().toISOString() });
      setSubmitted(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không lưu được bài làm."); }
    finally { setSaving(false); }
  }

  return <main className="page subpage"><div className="breadcrumb"><Link href="/">Trang chủ</Link><span>›</span><Link href={`/months/${story.month}`}>{MONTHS[story.month - 1]}</Link><span>›</span><span>Ngày {story.day}</span></div><div className="reader-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> {MONTHS[story.month - 1].toUpperCase()} · NGÀY {String(story.day).padStart(2,"0")}</div><h1>{story.title}</h1><p>{story.summary}</p><div className="chips"><span>◷ {story.duration_minutes} phút đọc</span><span>◈ {story.level}</span><span>✎ {totalQuestions(story)} câu hỏi</span></div></div><Link href={`/months/${story.month}`} className="button soft">← Về danh sách</Link></div>
    {story.image_url && <div className="reader-cover" style={{ backgroundImage: `url(${JSON.stringify(story.image_url)})` }} role="img" aria-label={`Ảnh bìa truyện ${story.title}`} />}
    <div className="reader-layout"><div className="reader-main"><div className="reader-tabs"><button className={tab === "read" ? "active" : ""} onClick={() => setTab("read")}>◧ &nbsp;Nghe & đọc truyện</button><button className={tab === "quiz" ? "active" : ""} onClick={() => setTab("quiz")}>✎ &nbsp;Câu hỏi đọc hiểu</button></div>
      {tab === "read" ? <div className="reader-card"><div className="video-wrap">{video ? <iframe src={`https://www.youtube-nocookie.com/embed/${video}`} title={`Video ${story.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="video-placeholder"><div className="play-icon">▶</div><strong>Video câu chuyện</strong><span>Quản trị viên sẽ thêm video YouTube tại đây</span></div>}</div><div className="story-text"><div className="story-text-header"><span className="kicker">CÙNG ĐỌC TRUYỆN</span><span>✦ &nbsp;Đọc chậm, hiểu sâu</span></div>{story.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="reader-next"><div><strong>Em đã đọc xong rồi chứ?</strong><p>{isRead ? "Truyện này đã có trong tiến độ của em." : "Đánh dấu đã đọc để lưu vào tiến độ của em."}</p></div><div className="reader-next-actions"><button className="button soft" disabled={isRead || readBusy} onClick={async () => { setReadBusy(true); setNotice(""); try { await onMarkRead(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không lưu được tiến độ."); } finally { setReadBusy(false); } }}>{isRead ? "✓ Đã đọc" : readBusy ? "Đang lưu..." : "✓ Đánh dấu đã đọc"}</button><button className="button primary" onClick={() => setTab("quiz")}>Làm câu hỏi →</button></div></div>{notice && <p className="form-error" role="alert">{notice}</p>}</div> : <div className="quiz-card"><div className="quiz-intro"><span className="kicker">LUYỆN ĐỌC HIỂU</span><h2>Em hiểu câu chuyện đến đâu?</h2><p>Chọn một đáp án đúng cho mỗi câu hỏi. Em có thể làm lại bất cứ lúc nào.</p></div>{questions.length === 0 ? <div className="empty-quiz">Chưa có câu hỏi cho truyện này.</div> : <><div className="questions">{questions.map((question, index) => <div className="question" key={question.id}><div className="question-title"><span>{String(index + 1).padStart(2,"0")}</span><h3>{question.prompt}</h3></div><div className="options">{question.options.map((option, optionIndex) => <button key={optionIndex} disabled={submitted} onClick={() => { const next = [...answers]; next[index] = optionIndex; setAnswers(next); setNotice(""); }} className={`option ${answers[index] === optionIndex ? "chosen" : ""} ${submitted && optionIndex === question.answer_index ? "correct" : ""} ${submitted && answers[index] === optionIndex && optionIndex !== question.answer_index ? "incorrect" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div>{submitted && question.explanation && <p className="explanation">💡 {question.explanation}</p>}</div>)}</div>{notice && <p className="form-error" role="alert">{notice}</p>}{submitted ? <div className="result-box"><div><span className="kicker">KẾT QUẢ CỦA EM</span><h3>{score}/{questions.length} câu đúng {score === questions.length ? "🎉" : "🌱"}</h3><p>{score === questions.length ? "Xuất sắc! Em đã hiểu rất rõ câu chuyện." : "Rất tốt! Hãy xem lại lời giải và thử thêm lần nữa."}</p></div><button className="button primary" onClick={() => { setSubmitted(false); setAnswers([]); }}>Làm lại ↻</button></div> : <button className="button primary submit-button" onClick={submitQuiz} disabled={saving}>{saving ? "Đang lưu..." : "Nộp bài →"}</button>}</>}<ActivityPanel activities={story.activities} /></div>}
    </div><aside className="reader-side"><div className="side-card"><div className="side-icon">📚</div><span className="kicker">HÀNH TRÌNH CỦA EM</span><h3>Mỗi trang là một bước tiến</h3><p>Nghe, đọc và luyện tập theo nhịp độ riêng. Không cần vội vàng!</p><div className="side-steps"><div><span>1</span> Nghe câu chuyện</div><div><span>2</span> Đọc lại nội dung</div><div><span>3</span> Trả lời câu hỏi</div></div></div>{attempts.length > 0 && <div className="side-card attempt-card"><span className="kicker">BÀI LÀM GẦN NHẤT</span><strong>{attempts[0].score}/{attempts[0].total}</strong><p>câu trả lời đúng</p></div>}</aside></div>
  </main>;
}

function ActivityPanel({ activities }: { activities?: StoryActivities }) {
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<number, boolean>>({});
  if (!activities) return null;
  const hasContent = Boolean(activities.cloze_text || activities.true_false.length || activities.short_answer.length || activities.discussion.length || activities.vocabulary?.length || activities.language_notice);
  if (!hasContent) return null;
  return <section className="activity-panel">
    <div className="activity-heading"><span className="kicker">LUYỆN TẬP THÊM</span><h2>Hoạt động đọc hiểu</h2><p>Các phần dưới đây được giữ theo tài liệu gốc. Phần đúng/sai và câu trả lời mở chưa tính vào điểm trắc nghiệm.</p></div>
    {activities.cloze_text && <details><summary>Điền từ vào chỗ trống</summary><p className="cloze-text">{activities.cloze_text}</p></details>}
    {activities.true_false.length > 0 && <details><summary>Đúng hay sai? · {activities.true_false.length} câu</summary><ol className="activity-list">{activities.true_false.map((prompt, index) => <li key={index}><span>{prompt}</span><div className="tf-options"><button type="button" className={trueFalseAnswers[index] === true ? "selected" : ""} onClick={() => setTrueFalseAnswers(prev => ({ ...prev, [index]: true }))}>Đúng</button><button type="button" className={trueFalseAnswers[index] === false ? "selected" : ""} onClick={() => setTrueFalseAnswers(prev => ({ ...prev, [index]: false }))}>Sai</button></div>{trueFalseAnswers[index] !== undefined && activities.true_false_answers?.[index] !== undefined && <small>{trueFalseAnswers[index] === activities.true_false_answers[index] ? "✓ Chính xác" : `Đáp án: ${activities.true_false_answers[index] ? "Đúng" : "Sai"}`}</small>}</li>)}</ol></details>}
    {activities.short_answer.length > 0 && <details><summary>Trả lời ngắn · {activities.short_answer.length} câu</summary><ol className="activity-list">{activities.short_answer.map((prompt, index) => <li key={index}>{prompt}{activities.short_answer_keys?.[index] && <details><summary>Xem gợi ý đáp án</summary><p>{activities.short_answer_keys[index]}</p></details>}</li>)}</ol></details>}
    {Boolean(activities.vocabulary?.length) && <details><summary>Từ vựng · {activities.vocabulary?.length} từ</summary><dl className="activity-vocabulary">{activities.vocabulary?.map((item, index) => <div key={index}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></details>}
    {activities.language_notice && <details><summary>Ghi chú ngôn ngữ</summary><p>{activities.language_notice}</p></details>}
    {activities.discussion.length > 0 && <details><summary>Suy nghĩ và thảo luận · {activities.discussion.length} câu</summary><ol className="activity-list">{activities.discussion.map((prompt, index) => <li key={index}>{prompt}</li>)}</ol></details>}
  </section>;
}

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <main className="page login-page"><div className="login-card"><span className="login-icon">✦</span><span className="kicker">DÀNH CHO QUẢN TRỊ VIÊN</span><h1>Chào mừng trở lại</h1><p>Đăng nhập bằng tài khoản quản trị để quản lý bộ truyện.</p><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await signIn(email, password); await onLogin(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại."); } finally { setBusy(false); } }}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></label>{error && <p className="form-error">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập →"}</button></form><Link href="/">← Quay về trang chủ</Link></div></main>;
}

function StudentLogin({ onLogin }: { onLogin: () => Promise<void> }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <main className="page login-page"><div className="login-card"><span className="login-icon">✦</span><span className="kicker">GÓC ĐỌC CỦA EM</span><h1>Cùng đọc tiếp nhé!</h1><p>{isDemo ? "Bản xem trước không cần tài khoản." : "Dùng tài khoản do quản trị viên cấp để lưu tiến độ đọc của em."}</p>{!isDemo && <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await signIn(email,password); await onLogin(); router.push("/progress"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại."); } finally { setBusy(false); } }}><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="em@example.com" /></label><label>Mật khẩu<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu được cấp" /></label>{error && <p className="form-error">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập →"}</button></form>}<Link href="/">← Quay về trang chủ</Link></div></main>;
}

function Admin({ stories, monthCovers, editor, setEditor, onSave, onSaveMonthCover, onDelete, onReload, email }: { stories: Story[]; monthCovers: MonthCover[]; editor: Story | null; setEditor: (story: Story | null) => void; onSave: (story: Story, coverFile: File | null) => Promise<void>; onSaveMonthCover: (month: number, file: File | null) => Promise<void>; onDelete: (story: Story) => Promise<void>; onReload: () => Promise<void>; email: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [month, setMonth] = useState(0); const [message, setMessage] = useState("");
  const filtered = useMemo(() => stories.filter(s => (month === 0 || s.month === month) && `${s.title} ${s.summary}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => a.month-b.month || a.day-b.day), [stories, month, query]);
  async function importJson(file: File) {
    setMessage("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("Tệp JSON phải là một danh sách truyện.");
      const incoming = new Set<string>();
      const prepared: Story[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== "object") throw new Error("Mỗi truyện phải là một đối tượng.");
        const row = item as Partial<Story>;
        if (!Number.isInteger(row.month) || !Number.isInteger(row.day) || !row.title || !row.content || !row.month || !row.day || row.month < 1 || row.month > 12 || row.day < 1 || row.day > DAYS_IN_MONTH[row.month - 1]) throw new Error("Mỗi truyện cần tháng, ngày, tiêu đề và nội dung hợp lệ.");
        const slot = `${row.month}-${row.day}`;
        if (incoming.has(slot)) throw new Error(`Tệp có nhiều truyện cho tháng ${row.month}, ngày ${row.day}.`);
        incoming.add(slot);
        if (row.questions && !Array.isArray(row.questions)) throw new Error(`Câu hỏi ngày ${row.day} không phải danh sách.`);
        for (const question of row.questions || []) {
          if (!question.prompt || !Array.isArray(question.options) || question.options.length !== 4 || !Number.isInteger(question.answer_index) || question.answer_index < 0 || question.answer_index > 3) throw new Error(`Câu hỏi ngày ${row.day} cần nội dung, bốn lựa chọn và đáp án đúng.`);
        }
        const story: Story = { ...blankStory(row.month, row.day), ...row, id: row.id || crypto.randomUUID(), status: "draft", questions: (row.questions || []).map((q, i) => ({ id: q.id || crypto.randomUUID(), story_id: row.id || "", prompt: q.prompt, options: q.options, answer_index: q.answer_index, explanation: q.explanation || "", sort_order: i + 1 })) };
        story.questions = story.questions?.map(q => ({ ...q, story_id: story.id }));
        prepared.push(story);
      }
      const toImport = prepared.filter(story => !stories.some(existing => existing.month === story.month && existing.day === story.day));
      for (const story of toImport) {
        await saveStory(story);
      }
      setMessage(`Đã nhập ${toImport.length} truyện dưới dạng bản nháp; bỏ qua ${prepared.length - toImport.length} ngày đã có truyện.`);
      await onReload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Không thể nhập tệp."); }
  }
  return <main className="page subpage admin-page"><div className="breadcrumb"><Link href="/">Trang chủ</Link><span>›</span><span>Quản lý nội dung</span></div><div className="admin-heading"><div><span className="kicker">KHÔNG GIAN BIÊN TẬP</span><h1>Quản lý bộ truyện</h1><p>Chuẩn bị nội dung cho từng ngày học, từ câu chuyện đến câu hỏi đọc hiểu.</p></div><button className="button primary" onClick={() => setEditor(blankStory(1, 1))}>＋ Thêm câu chuyện</button></div>
    <div className="admin-stats"><div><span className="stat-icon violet">▣</span><div><strong>{stories.length}</strong><p>Tổng số truyện</p></div></div><div><span className="stat-icon green">✓</span><div><strong>{stories.filter(s => s.status === "published").length}</strong><p>Đã xuất bản</p></div></div><div><span className="stat-icon orange">✎</span><div><strong>{stories.filter(s => s.status === "draft").length}</strong><p>Bản nháp</p></div></div><div><span className="stat-icon blue">☷</span><div><strong>{stories.reduce((n,s) => n + totalQuestions(s),0)}</strong><p>Câu hỏi đọc hiểu</p></div></div></div>
    <MonthCoverManager covers={monthCovers} onSave={onSaveMonthCover} />
    <StudentAccountManager />
    <div className="admin-panel"><div className="panel-heading"><div><h2>Danh sách nội dung</h2><p>Quản lý truyện theo tháng và ngày.</p></div><div className="panel-actions"><label className="button soft import-button">↑ Nhập JSON<input type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void importJson(file); e.target.value = ""; }} /></label><a className="button soft" href="/sample-import.json" download>↓ Tệp mẫu</a></div></div>{message && <div className="notice">{message}</div>}<div className="filters"><input placeholder="⌕  Tìm theo tên truyện..." value={query} onChange={e => setQuery(e.target.value)} /><select value={month} onChange={e => setMonth(Number(e.target.value))}><option value={0}>Tất cả các tháng</option>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>CÂU CHUYỆN</th><th>THỜI GIAN</th><th>CÂU HỎI</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{filtered.map(story => <tr key={story.id}><td><div className="table-story">{story.image_url ? <span className="table-cover" style={{ backgroundImage: `url(${JSON.stringify(story.image_url)})` }} aria-hidden="true" /> : <span>📖</span>}<div><strong>{story.title || "Chưa đặt tên"}</strong><small>{story.summary || "Chưa có mô tả"}</small></div></div></td><td>{MONTHS[story.month - 1]} · Ngày {story.day}</td><td>{totalQuestions(story)} câu</td><td><span className={`status ${story.status}`}>{story.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span></td><td><button className="edit-link" onClick={() => setEditor(story)}>Chỉnh sửa →</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="table-empty">Chưa có truyện phù hợp. Hãy thêm một câu chuyện mới.</div>}</div></div>
    <div className="admin-hint"><span>💡</span><p><strong>Mẹo nhập dữ liệu:</strong> Tải tệp mẫu, thay nội dung truyện và câu hỏi rồi nhập JSON. Nội dung mới luôn ở trạng thái bản nháp để bạn kiểm tra trước khi xuất bản.</p></div>
    {email && <button className="signout" onClick={async () => { await signOut(); router.refresh(); await onReload(); }}>Đăng xuất {email}</button>}
    {editor && <StoryEditor key={editor.id} story={editor} stories={stories} onClose={() => setEditor(null)} onSave={onSave} onDelete={onDelete} />}
  </main>;
}

function StudentAccountManager() {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const [nextProfiles, nextCounts] = await Promise.all([getStudentProfiles(), getStudentReadCounts()]);
    setProfiles(nextProfiles);
    setCounts(nextCounts);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([getStudentProfiles(), getStudentReadCounts()])
        .then(([nextProfiles, nextCounts]) => { setProfiles(nextProfiles); setCounts(nextCounts); })
        .catch(cause => setError(cause instanceof Error ? cause.message : "Không tải được danh sách học sinh."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await createStudentAccount(displayName.trim(), email.trim(), password);
      setMessage(`Đã cấp tài khoản cho ${displayName.trim()} (${email.trim()}). Hãy gửi riêng mật khẩu cho học sinh.`);
      setDisplayName(""); setEmail(""); setPassword("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tạo được tài khoản."); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel student-panel"><div className="panel-heading"><div><h2>Tài khoản học sinh</h2><p>Cấp tài khoản riêng và theo dõi số truyện mỗi em đã đánh dấu đã đọc.</p></div></div>
    <form className="student-create-form" onSubmit={create}><label>Họ tên học sinh<input required maxLength={100} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nguyễn An" /></label><label>Email đăng nhập<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="an@example.com" /></label><label>Mật khẩu ban đầu<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Ít nhất 8 ký tự" autoComplete="new-password" /></label><button className="button primary" disabled={busy}>{busy ? "Đang tạo..." : "＋ Cấp tài khoản"}</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>HỌC SINH</th><th>EMAIL ĐĂNG NHẬP</th><th>TRUYỆN ĐÃ ĐỌC</th></tr></thead><tbody>{profiles.map(profile => <tr key={profile.id}><td><strong>{profile.display_name}</strong></td><td>{profile.email}</td><td>{counts[profile.id] || 0}</td></tr>)}</tbody></table>{profiles.length === 0 && <div className="table-empty">Chưa có tài khoản học sinh nào.</div>}</div>
  </section>;
}

function MonthCoverManager({ covers, onSave }: { covers: MonthCover[]; onSave: (month: number, file: File | null) => Promise<void> }) {
  const [busyMonth, setBusyMonth] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function changeCover(month: number, file: File | null) {
    try {
      if (file) validateCoverFile(file);
      setError(""); setBusyMonth(month);
      await onSave(month, file);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được ảnh tháng."); }
    finally { setBusyMonth(null); }
  }

  return <section className="admin-panel month-cover-panel">
    <div className="panel-heading"><div><h2>Ảnh bìa 12 tháng</h2><p>Tải ảnh JPG, PNG hoặc WebP (tối đa 5 MB). Ảnh sẽ hiện trên thẻ tháng và trang của tháng đó.</p></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="month-cover-grid">{MONTHS.map((label, index) => {
      const month = index + 1;
      const url = covers.find(item => item.month === month)?.image_url || "";
      return <div className="month-cover-item" key={month}>
        <div className="month-cover-preview" style={{ backgroundColor: MONTH_COLORS[index], ...(url ? { backgroundImage: `url(${JSON.stringify(url)})` } : {}) }}><span>{url ? "" : String(month).padStart(2, "0")}</span></div>
        <strong>{label}</strong>
        <div className="cover-actions"><label className="button soft cover-upload">{busyMonth === month ? "Đang lưu..." : url ? "Đổi ảnh" : "Tải ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyMonth !== null} onChange={event => { const file = event.target.files?.[0]; if (file) void changeCover(month, file); event.target.value = ""; }} /></label>{url && <button type="button" className="cover-remove" disabled={busyMonth !== null} onClick={() => void changeCover(month, null)}>Xóa</button>}</div>
      </div>;
    })}</div>
  </section>;
}

function CoverPicker({ url, onFile, onRemove }: { url: string; onFile: (file: File) => void; onRemove: () => void }) {
  const [preview, setPreview] = useState(url);
  const [error, setError] = useState("");
  function choose(file: File) {
    try { validateCoverFile(file); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Ảnh không hợp lệ."); return; }
    onFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => setError("Không đọc được ảnh.");
    reader.readAsDataURL(file);
  }
  return <div className="story-cover-field"><span className="field-label">Ảnh đại diện truyện</span><div className="story-cover-controls"><div className="story-cover-preview" style={preview ? { backgroundImage: `url(${JSON.stringify(preview)})` } : undefined}>{!preview && <span>📖</span>}</div><div><p>Ảnh hiển thị ở danh sách ngày học và trang đọc truyện. JPG, PNG hoặc WebP, tối đa 5 MB.</p><div className="cover-actions"><label className="button soft cover-upload">{preview ? "Đổi ảnh" : "Tải ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) choose(file); event.target.value = ""; }} /></label>{preview && <button type="button" className="cover-remove" onClick={() => { setPreview(""); setError(""); onRemove(); }}>Xóa ảnh</button>}</div></div></div>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

function StoryEditor({ story, stories, onClose, onSave, onDelete }: { story: Story; stories: Story[]; onClose: () => void; onSave: (story: Story, coverFile: File | null) => Promise<void>; onDelete: (story: Story) => Promise<void> }) {
  const [form, setForm] = useState<Story>({ ...story, questions: story.questions?.map(q => ({ ...q, options: [...q.options] })) || [] });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function update<K extends keyof Story>(key: K, value: Story[K]) { setForm(prev => ({ ...prev, [key]: value })); }
  function updateActivities<K extends keyof StoryActivities>(key: K, value: StoryActivities[K]) {
    setForm(prev => ({ ...prev, activities: { cloze_text: "", true_false: [], short_answer: [], discussion: [], ...prev.activities, [key]: value } }));
  }
  function updateQuestion(index: number, change: Partial<Question>) { setForm(prev => ({ ...prev, questions: prev.questions?.map((q, i) => i === index ? { ...q, ...change } : q) })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (form.day > DAYS_IN_MONTH[form.month - 1]) { setError("Ngày không hợp lệ với tháng đã chọn."); return; }
    if (stories.some(s => s.id !== form.id && s.month === form.month && s.day === form.day)) { setError("Ngày này đã có truyện. Hãy chọn ngày khác hoặc sửa truyện hiện có."); return; }
    if (form.youtube_url && !youtubeId(form.youtube_url)) { setError("Liên kết YouTube không hợp lệ."); return; }
    if (form.questions?.some(q => !q.prompt.trim() || q.options.length !== 4 || q.options.some(o => !o.trim()) || q.answer_index < 0 || q.answer_index > 3)) { setError("Mỗi câu hỏi cần nội dung, 4 đáp án và một đáp án đúng."); return; }
    setBusy(true);
    try { await onSave(form, coverFile); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được truyện."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="editor-modal" role="dialog" aria-modal="true" aria-label="Biên tập câu chuyện"><div className="editor-head"><div><span className="kicker">BIÊN TẬP NỘI DUNG</span><h2>{stories.some(s => s.id === story.id) ? "Chỉnh sửa câu chuyện" : "Thêm câu chuyện mới"}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label="Đóng">×</button></div><form onSubmit={submit}><div className="editor-body"><div className="form-grid"><label>Tháng<select value={form.month} onChange={e => { const m = Number(e.target.value); setForm(prev => ({ ...prev, month: m, day: Math.min(prev.day, DAYS_IN_MONTH[m-1]) })); }}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></label><label>Ngày<select value={form.day} onChange={e => update("day", Number(e.target.value))}>{Array.from({ length: DAYS_IN_MONTH[form.month-1] },(_,i) => <option key={i} value={i+1}>Ngày {i+1}</option>)}</select></label></div><label>Tiêu đề truyện<input required value={form.title} onChange={e => update("title",e.target.value)} placeholder="Ví dụ: Chiếc lá và ngọn gió" /></label><label>Mô tả ngắn<input value={form.summary} onChange={e => update("summary",e.target.value)} placeholder="Một câu giới thiệu hấp dẫn..." /></label><label>Nội dung truyện<textarea required rows={8} value={form.content} onChange={e => update("content",e.target.value)} placeholder="Nhập nội dung truyện. Cách một dòng trống giữa các đoạn." /></label><CoverPicker url={form.image_url} onFile={file => setCoverFile(file)} onRemove={() => { update("image_url", ""); setCoverFile(null); }} /><label>Liên kết video YouTube<input type="url" value={form.youtube_url} onChange={e => update("youtube_url",e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label><div className="form-grid"><label>Độ khó<select value={form.level} onChange={e => update("level", e.target.value)}><option>Cơ bản</option><option>Trung bình</option><option>Nâng cao</option></select></label><label>Thời gian đọc (phút)<input type="number" min="1" max="120" value={form.duration_minutes} onChange={e => update("duration_minutes",Number(e.target.value))} /></label></div><div className="editor-section-title"><div><h3>Câu hỏi đọc hiểu</h3><p>Thêm 4 lựa chọn và chọn đáp án đúng cho mỗi câu.</p></div><button type="button" className="button soft" onClick={() => update("questions", [...(form.questions || []), { id: crypto.randomUUID(), story_id: form.id, prompt: "", options: ["", "", "", ""], answer_index: 0, explanation: "", sort_order: (form.questions?.length || 0) + 1 }])}>＋ Thêm câu hỏi</button></div>{form.questions?.map((q,index) => <div className="question-editor" key={q.id}><div className="question-editor-head"><strong>Câu hỏi {index+1}</strong><button type="button" onClick={() => update("questions", form.questions?.filter((_,i) => i !== index))}>Xóa câu hỏi</button></div><input required value={q.prompt} onChange={e => updateQuestion(index,{ prompt:e.target.value })} placeholder="Nhập câu hỏi..." /><div className="answer-grid">{q.options.map((option,optionIndex) => <label key={optionIndex}><input type="radio" name={`answer-${q.id}`} checked={q.answer_index === optionIndex} onChange={() => updateQuestion(index,{ answer_index:optionIndex })} aria-label={`Đáp án ${String.fromCharCode(65+optionIndex)} đúng`} /><input required value={option} onChange={e => { const options=[...q.options]; options[optionIndex]=e.target.value; updateQuestion(index,{ options }); }} placeholder={`Đáp án ${String.fromCharCode(65+optionIndex)}`} /></label>)}</div><input value={q.explanation} onChange={e => updateQuestion(index,{ explanation:e.target.value })} placeholder="Giải thích đáp án (không bắt buộc)" /></div>)}<div className="editor-section-title"><div><h3>Hoạt động bổ sung</h3><p>Mỗi dòng là một câu hỏi. Các phần này không được chấm điểm tự động.</p></div></div><label>Điền từ vào chỗ trống<textarea rows={5} value={form.activities?.cloze_text || ""} onChange={e => updateActivities("cloze_text", e.target.value)} placeholder="Văn bản với các chỗ trống..." /></label><label>Câu đúng / sai<textarea rows={4} value={(form.activities?.true_false || []).join("\n")} onChange={e => updateActivities("true_false", e.target.value.split("\n").map(x => x.trim()).filter(Boolean))} placeholder="Một câu trên mỗi dòng" /></label><label>Câu trả lời ngắn<textarea rows={4} value={(form.activities?.short_answer || []).join("\n")} onChange={e => updateActivities("short_answer", e.target.value.split("\n").map(x => x.trim()).filter(Boolean))} placeholder="Một câu trên mỗi dòng" /></label><label>Câu suy nghĩ & thảo luận<textarea rows={4} value={(form.activities?.discussion || []).join("\n")} onChange={e => updateActivities("discussion", e.target.value.split("\n").map(x => x.trim()).filter(Boolean))} placeholder="Một câu trên mỗi dòng" /></label></div><div className="editor-footer"><div><label className="publish-label">Trạng thái <select value={form.status} onChange={e => update("status", e.target.value as Story["status"])}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option></select></label>{stories.some(s => s.id === story.id) && <button type="button" className="delete-link" onClick={() => void onDelete(story)}>Xóa truyện</button>}</div><div>{error && <span className="form-error">{error}</span>}<button type="button" className="button soft" onClick={onClose}>Hủy</button><button type="submit" className="button primary" disabled={busy}>{busy ? "Đang lưu..." : "Lưu câu chuyện"}</button></div></div></form></div></div>;
}
