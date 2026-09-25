import type { Question, Story } from "./types";
import septemberStories from "@/data/september.json";

export const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const MONTH_COLORS = [
  "#dedaf7", "#d6e9fb", "#f9dfe5", "#d7efdc", "#fff0c7", "#ffdaca",
  "#dce9fc", "#e8e0f6", "#fbe5d0", "#e4edcf", "#d6e8e3", "#f1dfdf",
];

const q = (storyId: string, n: number, prompt: string, options: string[], answer: number, explanation: string): Question => ({
  id: `${storyId}-q${n}`,
  story_id: storyId,
  prompt,
  options,
  answer_index: answer,
  explanation,
  sort_order: n,
});

export const DEMO_STORIES: Story[] = [
  {
    id: "demo-jan-01", month: 1, day: 1, title: "Chiếc lá và ngọn gió",
    summary: "Một chiếc lá nhỏ học cách tin vào hành trình của mình.",
    content: "Trong khu vườn yên tĩnh, một chiếc lá nhỏ sống trên cành cây cao. Mỗi ngày, lá nhìn những đám mây trôi qua và tự hỏi thế giới bên ngoài khu vườn rộng đến đâu.\n\nMột buổi sáng, ngọn gió ghé thăm. Gió kể cho lá nghe về dòng suối, cánh đồng và những con đường quanh co. Lá hơi sợ, nhưng vẫn muốn được nhìn thấy những nơi ấy.\n\nKhi mùa thu đến, chiếc lá nhẹ nhàng rời cành. Gió đưa lá bay qua khu vườn rồi đáp xuống bên cạnh một hạt mầm nhỏ. Lá che nắng cho hạt mầm. Lúc ấy, lá hiểu rằng mỗi hành trình đều có thể mang lại điều tốt đẹp cho ai đó.",
    youtube_url: "", image_url: "", level: "Cơ bản", duration_minutes: 5, status: "published",
    questions: [
      q("demo-jan-01", 1, "Chiếc lá muốn tìm hiểu điều gì?", ["Thế giới ngoài khu vườn", "Cách xây tổ", "Màu của mặt trăng", "Tên các loài cá"], 0, "Chiếc lá tự hỏi thế giới bên ngoài khu vườn rộng đến đâu."),
      q("demo-jan-01", 2, "Ai kể cho chiếc lá nghe về dòng suối và cánh đồng?", ["Hạt mầm", "Ngọn gió", "Đám mây", "Cành cây"], 1, "Ngọn gió ghé thăm và kể cho lá nghe về những nơi ấy."),
      q("demo-jan-01", 3, "Cuối câu chuyện, chiếc lá đã giúp ai?", ["Một chú chim", "Một bông hoa", "Một hạt mầm", "Một con kiến"], 2, "Chiếc lá đáp xuống cạnh hạt mầm và che nắng cho nó."),
    ],
  },
  {
    id: "demo-jan-02", month: 1, day: 2, title: "Bức thư trong chai",
    summary: "Một lời nhắn nhỏ mở đầu cho một tình bạn mới.",
    content: "An sống gần một bãi biển đầy nắng. Mỗi chiều, em thường đi dọc bờ cát và nhặt những vỏ sò đẹp.\n\nMột ngày nọ, An nhìn thấy một chiếc chai thủy tinh nằm cạnh tảng đá. Bên trong là mảnh giấy ghi: “Nếu bạn tìm thấy thư này, hãy vẽ một bức tranh về nơi bạn sống.”\n\nAn mang chai về nhà, vẽ ngọn hải đăng và những con thuyền. Em đặt bức tranh vào chai rồi gửi lại biển. An không biết ai sẽ tìm thấy nó, nhưng em vui vì đã chia sẻ một góc nhỏ quê hương mình.",
    youtube_url: "", image_url: "", level: "Cơ bản", duration_minutes: 4, status: "published",
    questions: [q("demo-jan-02", 1, "An tìm thấy gì trên bãi biển?", ["Một quyển sách", "Một chiếc chai", "Một chiếc đồng hồ", "Một chiếc mũ"], 1, "An nhìn thấy một chiếc chai thủy tinh cạnh tảng đá.")],
  },
  {
    id: "demo-feb-01", month: 2, day: 1, title: "Hạt mầm dũng cảm",
    summary: "Một hạt mầm kiên nhẫn vươn lên tìm ánh nắng.",
    content: "Dưới lớp đất ẩm, một hạt mầm nhỏ đang chờ mùa xuân. Hạt nghe tiếng mưa rơi và cảm nhận hơi ấm từ mặt trời.\n\nHạt bắt đầu mọc rễ. Đất xung quanh vừa tối vừa chật, nhưng hạt không bỏ cuộc. Mỗi ngày, nó lại vươn lên một chút.\n\nCuối cùng, một chiếc lá xanh nhô khỏi mặt đất. Hạt mầm nhìn thấy bầu trời lần đầu tiên và biết rằng sự kiên trì đã giúp mình lớn lên.",
    youtube_url: "", image_url: "", level: "Cơ bản", duration_minutes: 4, status: "published",
    questions: [q("demo-feb-01", 1, "Điều gì giúp hạt mầm lớn lên?", ["Sự kiên trì", "Một chiếc chai", "Cơn gió mạnh", "Một con thuyền"], 0, "Hạt mầm vươn lên mỗi ngày và không bỏ cuộc.")],
  },
  ...(septemberStories as Story[]),
];

export function youtubeId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || null;
    }
    if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") return parsed.pathname.slice(1) || null;
  } catch { return null; }
  return null;
}
