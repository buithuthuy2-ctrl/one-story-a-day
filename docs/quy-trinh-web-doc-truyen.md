# Quy trình xây dựng và triển khai web đọc truyện One Story a Day

Cập nhật: 16/11/2026. Tài liệu này dùng để dựng lại website từ mã nguồn hoặc thêm các tháng truyện sau này. Không lưu mật khẩu hay secret key trong tài liệu hoặc repository GitHub.

## 1. Website hiện gồm những gì?

- **Học sinh:** chọn một trong 12 tháng, xem video YouTube, đọc truyện, làm trắc nghiệm đọc hiểu, xem bài đúng/sai, nghe và điền 5–6 từ trong phần dictation. Các em đăng nhập tại `/login`, bấm **Đánh dấu đã đọc** để lưu truyện, và xem tiến độ tại `/progress`.
- **Quản trị viên:** đăng nhập tại `/admin`; thêm/sửa/xóa truyện; nhập JSON; đặt đáp án đúng và link YouTube; tải ảnh bìa tháng và ảnh từng truyện; cấp tài khoản học sinh; xem tiến độ và điểm đọc hiểu của từng em.
- **Dữ liệu:** Supabase lưu truyện, câu hỏi, ảnh bìa, tài khoản, lượt đọc và bài trắc nghiệm. Kết quả dictation và câu đúng/sai chỉ được kiểm tra trên trang, **chưa lưu vào tiến độ**. Việc mở truyện không tự tính là đã đọc.

| Thành phần | Dự án hiện tại |
| --- | --- |
| Mã nguồn | [GitHub: one-story-a-day](https://github.com/buithuthuy2-ctrl/one-story-a-day) |
| Website | [one-story-a-day-teal.vercel.app](https://one-story-a-day-teal.vercel.app/) |
| Supabase | Project `yzpckbwyoaonnheunmfe` |
| Mã nguồn giao diện | [`src/components/story-app.tsx`](../src/components/story-app.tsx) |
| Mẫu nhập truyện | [`public/sample-import.json`](../public/sample-import.json) |

## 2. Dựng một website mới từ mã nguồn

### Bước 1 — Chuẩn bị mã nguồn và chạy thử

Máy phát triển cần Node.js và pnpm; dự án khai báo `pnpm@11.19.0` trong [`package.json`](../package.json). Sao chép repository về máy, rồi chạy:

```powershell
git clone https://github.com/buithuthuy2-ctrl/one-story-a-day.git
cd one-story-a-day
pnpm install --frozen-lockfile
pnpm dev
```

Mở `http://localhost:3000`. Nếu chưa điền hai biến Supabase, đây là **bản xem trước**: dữ liệu mẫu nằm trong trình duyệt và các thay đổi chỉ lưu ở `localStorage` của máy đó. Bản xem trước không thay thế cơ sở dữ liệu dùng cho học sinh.

### Bước 2 — Tạo Supabase và cấu trúc dữ liệu

Tạo một project Supabase mới. Trong **SQL Editor**, chạy **mỗi tệp một lần**, theo đúng thứ tự sau trên project mới:

1. [`supabase/schema.sql`](../supabase/schema.sql): bảng `stories`, `questions`, `attempts` và quyền cơ bản.
2. [`supabase/cover_images.sql`](../supabase/cover_images.sql): bảng `month_covers` và bucket ảnh `story-covers`.
3. [`supabase/student_progress.sql`](../supabase/student_progress.sql): `student_profiles`, `story_reads` và quyền xem tiến độ.
4. [`supabase/admin_student_attempts.sql`](../supabase/admin_student_attempts.sql): cho admin xem kết quả bài trắc nghiệm của học sinh.

Các tệp SQL có câu lệnh tạo policy; **đừng chạy lại nguyên bộ trên project đã có dữ liệu**. Khi cần cập nhật project cũ, xem những thay đổi nào chưa áp dụng rồi chạy migration tương ứng. Supabase bật Row Level Security (RLS) để học sinh chỉ xem dữ liệu của mình, còn admin xem dữ liệu quản lý. [Tài liệu RLS của Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Trong Supabase **Edge Functions**, triển khai hàm tên `create-student` từ [`supabase/functions/create-student/index.ts`](../supabase/functions/create-student/index.ts). Project hiện tại dùng `verify_jwt = true`; hàm còn kiểm tra người gọi có `app_metadata.role = "admin"`. Hàm này tạo tài khoản học sinh và đặt lại mật khẩu cho học sinh. [Hướng dẫn triển khai Edge Function](https://supabase.com/docs/guides/functions/quickstart-dashboard), [hướng dẫn xác thực](https://supabase.com/docs/guides/functions/auth).

### Bước 3 — Tạo tài khoản quản trị

Tạo người dùng bằng email và mật khẩu trong **Supabase → Authentication → Users**. Gán `app_metadata.role` của người đó bằng `admin` qua **Admin API ở môi trường tin cậy**, rồi đăng nhập thử tại `/admin`. Quyền admin phải nằm trong `app_metadata`, không đặt trong `user_metadata` vì người dùng có thể tự sửa `user_metadata`. Không chạy Admin API bằng key bí mật trong trình duyệt. [Supabase Auth Users](https://supabase.com/docs/guides/auth/users), [Admin API cập nhật app metadata](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

Sau khi đổi quyền của một tài khoản đã đăng nhập, đăng xuất và đăng nhập lại để JWT nhận quyền mới. Mật khẩu admin không được ghi vào GitHub hoặc tài liệu này.

### Bước 4 — Nối ứng dụng với Supabase

Lấy **Project URL** và **publishable key** trong Supabase Dashboard. Sao chép `.env.example` thành `.env.local` trên máy phát triển rồi điền:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Khởi động lại `pnpm dev`. Chỉ dùng publishable key ở biến `NEXT_PUBLIC_`; **secret key/service role key chỉ được dùng ở phía máy chủ tin cậy**. Tệp `.env.local` đã nằm trong `.gitignore`.

### Bước 5 — Đưa web lên Vercel

Trong Vercel, tạo Project bằng cách nhập repository GitHub. Chọn nhánh triển khai `main`; Vercel tự nhận diện Next.js. Thêm đúng **hai biến môi trường** ở bước 4 cho Production (và Preview nếu dùng), rồi triển khai. Khi thay đổi biến môi trường, tạo deployment mới. Đẩy commit mới lên `main` sẽ tạo bản triển khai mới. [Vercel với GitHub](https://vercel.com/docs/git/vercel-for-github), [biến môi trường Vercel](https://vercel.com/docs/environment-variables).

Repository đã có [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) cho phép script cài đặt của `unrs-resolver`. Nếu Vercel báo `ERR_PNPM_IGNORED_BUILDS`, kiểm tra tệp này và `pnpm-lock.yaml` đã được đưa lên GitHub; sau đó triển khai lại. Chỉ coi triển khai hoàn tất khi trạng thái Vercel là **Ready**.

### Bước 6 — Đặt URL khôi phục mật khẩu

Trong **Supabase → Authentication → URL Configuration**:

- **Site URL:** địa chỉ website thật, ví dụ `https://one-story-a-day-teal.vercel.app`.
- **Redirect URLs:** thêm đúng `https://one-story-a-day-teal.vercel.app/reset-password`.

Sau khi đổi tên miền, cập nhật cả hai địa chỉ trên. Nếu email reset dẫn tới `localhost`, thông thường Site URL vẫn là `http://localhost:3000` hoặc URL chuyển hướng chưa được cho phép. Yêu cầu một **email reset mới** sau khi sửa cấu hình. [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Thêm một tháng truyện mới

1. **Chuẩn bị nguồn:** một danh sách câu chuyện, câu hỏi và đáp án đúng theo ngày; một bảng link YouTube theo đúng ngày/tên truyện. Đối chiếu số ngày của tháng; ngày thiếu nguồn thì ghi nhận là thiếu, không tự sáng tác nội dung để lấp chỗ trống.
2. **Chuẩn hóa dữ liệu:** mỗi ngày có `month`, `day`, `title`, `content`; nên có `summary`, `youtube_url`, `questions` và các hoạt động bổ sung. Đối chiếu link video với tiêu đề/ngày trước khi nhập. Chỉ dùng URL video mà bạn có quyền nhúng.
3. **Lập tệp JSON:** bắt đầu từ [`public/sample-import.json`](../public/sample-import.json). Một câu trắc nghiệm có bốn `options`; `answer_index` là **0=A, 1=B, 2=C, 3=D**. Đáp án đúng phải khớp nội dung truyện. Ví dụ:

   ```json
   [{
     "month": 12,
     "day": 1,
     "title": "Story title",
     "content": "First paragraph.\n\nSecond paragraph.",
     "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID",
     "questions": [{
       "prompt": "What happened?",
       "options": ["A choice", "B choice", "C choice", "D choice"],
       "answer_index": 2,
       "explanation": "The story says ..."
     }],
     "activities": {
       "true_false": ["The character visited a shop."],
       "true_false_answers": [true],
       "short_answer": ["Who visited the shop?"],
       "short_answer_keys": ["The brother and narrator."],
       "discussion": [],
       "cloze_text": "",
       "vocabulary": [{"term": "shop", "meaning": "a place to buy things"}]
     }
   }]
   ```

4. **Rà soát:** kiểm tra không trùng tháng/ngày, chính tả, đáp án đúng/sai, video hoạt động và cách phân bố đáp án A–D. [`scripts/balance-answers.mjs`](../scripts/balance-answers.mjs) hiện chỉ xử lý ba tệp tháng 9–11 và yêu cầu **đúng bốn câu trắc nghiệm mỗi truyện**; muốn dùng cho tháng mới phải thêm tên tệp vào script rồi xem lại đáp án bằng mắt.
5. **Nhập và xuất bản:** đăng nhập `/admin` → **Nhập JSON**, chọn tệp. Truyện được nhập thành **bản nháp**; ngày đã có truyện sẽ bị bỏ qua. Mở từng truyện để kiểm tra và chuyển trạng thái sang **Xuất bản**. Việc thêm JSON vào `src/data` hoặc push GitHub **không tự nhập dữ liệu vào Supabase**.
6. **Ảnh bìa:** tại `/admin`, tải ảnh cho tháng và từng truyện. Hỗ trợ JPG, PNG, WebP, tối đa 5 MB; ảnh lưu trong Supabase Storage. Nếu không tải ảnh, trang dùng hình/màu mặc định.
7. **Kiểm tra như học sinh:** mở `/months/<tháng>` và một truyện; xem video, thử câu hỏi, dictation, nút đánh dấu đã đọc và tiến độ. Truyện chưa xuất bản sẽ không xuất hiện với học sinh.

## 4. Tài khoản học sinh và tiến độ

- Admin vào `/admin` → **Tài khoản học sinh**, nhập tên, email, mật khẩu ban đầu (ít nhất 8 ký tự) và bấm **Cấp tài khoản**. Gửi riêng thông tin đăng nhập cho học sinh.
- Học sinh dùng `/login`, đọc truyện và bấm **Đánh dấu đã đọc**. Mỗi truyện được tính một lần. Khi nộp trắc nghiệm, điểm được lưu vào `attempts`.
- Admin bấm **Xem tiến độ học sinh** ở đầu trang quản trị rồi **Xem tiến độ** tại tài khoản cần xem. Có tổng số truyện đã đọc, số liệu từng tháng, danh sách truyện và kết quả đọc hiểu. Bấm **Làm mới tiến độ** sau khi học sinh vừa học.
- Người đã đăng nhập đổi mật khẩu tại `/change-password`. Người quên mật khẩu dùng `/forgot-password` và email reset; admin cũng có thể đặt lại mật khẩu học sinh tại mục tài khoản.

## 5. Dùng tên miền mamandsister.com

Nếu website chính đang ở HawkHost, có thể dùng một tên miền phụ như `stories.mamandsister.com` cho ứng dụng này, giữ website chính ở chỗ cũ. Thêm tên miền phụ trong **Vercel → Project → Domains**, rồi tạo bản ghi DNS tại nơi đang quản lý DNS của tên miền theo **giá trị Vercel hiển thị cho chính dự án**. Sau khi DNS và HTTPS hoạt động, cập nhật Site URL/Redirect URLs ở bước 6. [Hướng dẫn tên miền Vercel](https://vercel.com/docs/domains/set-up-custom-domain).

## 6. Kiểm tra trước khi giao cho học sinh

- `pnpm build` và `pnpm lint` chạy xong không lỗi; Vercel ở trạng thái **Ready**.
- Hai biến môi trường trên Vercel trỏ đúng Supabase project; trang đọc truyện tải được nội dung.
- Admin đăng nhập được; học sinh chỉ thấy truyện đã xuất bản và tiến độ của chính mình.
- Một truyện thử có video, đáp án đúng, ảnh bìa và dictation hoạt động.
- Email quên mật khẩu đưa về `/reset-password` trên tên miền thật, không đưa về `localhost`.
- Lưu bản sao nguồn truyện và ảnh gốc bên ngoài website; GitHub lưu mã nguồn và JSON mẫu, còn dữ liệu thật và ảnh đã tải lên nằm trong Supabase.

**Lưu ý khi gặp lỗi:** Nếu trang báo không tải được nội dung, kiểm tra trạng thái Supabase, hai biến môi trường Vercel, RLS/bảng dữ liệu và runtime logs. Nếu web chỉ hiện truyện mẫu, kiểm tra ứng dụng có đang ở chế độ xem trước do thiếu biến Supabase hay không. Nếu cấp tài khoản học sinh lỗi, kiểm tra Edge Function `create-student` đã triển khai và nhận JWT admin. Nếu link reset sai, kiểm tra bước 6 và gửi email mới.
