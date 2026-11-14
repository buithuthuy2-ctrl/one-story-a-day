"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createDictation, isCorrectDictationAnswer } from "@/lib/dictation";
import type { Story } from "@/lib/types";
import { youtubeId } from "@/lib/catalog";

export function Dictation({ story }: { story: Story }) {
  const blanks = useMemo(() => createDictation(story), [story]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const video = youtubeId(story.youtube_url);
  const score = blanks.filter((blank, index) => isCorrectDictationAnswer(answers[index] || "", blank.answer)).length;

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  function toggleNarration() {
    if (!("speechSynthesis" in window)) { setMessage("Trình duyệt này chưa hỗ trợ phát giọng đọc."); return; }
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(story.content);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); setMessage("Không phát được giọng đọc trên thiết bị này. Em có thể dùng video nếu truyện có video."); };
    setMessage("");
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  if (!blanks.length) return <div className="dictation-card"><p>Truyện này chưa có đủ từ tiếng Anh để tạo bài nghe điền từ.</p></div>;

  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const [index, blank] of blanks.entries()) {
    pieces.push(story.content.slice(cursor, blank.start));
    const correct = checked && isCorrectDictationAnswer(answers[index] || "", blank.answer);
    pieces.push(<span className="dictation-field" key={blank.start}>
      <input
        aria-label={`Từ còn thiếu số ${index + 1}`}
        autoComplete="off"
        spellCheck={false}
        value={answers[index] || ""}
        onChange={event => { const next = [...answers]; next[index] = event.target.value; setAnswers(next); setChecked(false); setMessage(""); }}
        className={checked ? correct ? "correct" : "incorrect" : ""}
        style={{ width: `${Math.max(7, Math.min(blank.answer.length + 3, 15))}ch` }}
        placeholder={String(index + 1)}
      />
      {checked && <span className={correct ? "dictation-correct" : "dictation-answer"}>{correct ? "✓" : `→ ${blank.answer}`}</span>}
    </span>);
    cursor = blank.end;
  }
  pieces.push(story.content.slice(cursor));

  return <div className="dictation-card">
    <div className="quiz-intro"><span className="kicker">LUYỆN NGHE · MOVERS</span><h2>Nghe và điền từ</h2><p>Nghe câu chuyện rồi điền {blanks.length} từ còn thiếu. Em có thể nghe nhiều lần và làm lại.</p></div>
    <div className="dictation-tools"><button type="button" className="button primary" onClick={toggleNarration}>{speaking ? "■ Dừng giọng đọc" : "▶ Nghe giọng đọc"}</button><span>{video ? "Hoặc nghe video bên dưới." : "Giọng đọc được tạo trên thiết bị của em."}</span></div>
    {video && <div className="video-wrap dictation-video"><iframe src={`https://www.youtube-nocookie.com/embed/${video}`} title={`Video dictation ${story.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
    <form onSubmit={event => { event.preventDefault(); if (blanks.some((_, index) => !answers[index]?.trim())) { setMessage("Hãy điền đủ các ô trước khi kiểm tra."); return; } setChecked(true); setMessage(""); }}>
      <div className="dictation-story">{pieces}</div>
      {message && <p className="form-error" role="alert">{message}</p>}
      {checked && <div className="dictation-result" role="status"><strong>Em đúng {score}/{blanks.length} từ.</strong><span>{score === blanks.length ? "Giỏi lắm!" : "Từ cần sửa hiện bên cạnh ô trả lời. Hãy nghe lại và thử tiếp nhé."}</span></div>}
      <div className="dictation-actions"><button className="button primary" type="submit">Kiểm tra kết quả →</button><button className="button soft" type="button" onClick={() => { setAnswers([]); setChecked(false); setMessage(""); }}>Làm lại ↻</button></div>
    </form>
  </div>;
}
