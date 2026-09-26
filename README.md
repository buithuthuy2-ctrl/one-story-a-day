# One Story a Day — bản thiết kế ứng dụng

Ứng dụng Next.js cho học sinh nghe video, đọc truyện và làm câu hỏi đọc hiểu. Thư viện được chia thành 12 tập theo tháng, mỗi tập có 28–31 ngày. Trang quản trị cho phép tạo/sửa/xóa truyện, tải ảnh bìa cho từng tháng và từng truyện, gắn video YouTube, soạn câu hỏi và nhập hàng loạt bằng JSON.

## Chạy thử

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000`. Khi chưa khai báo Supabase, ứng dụng chạy ở **chế độ xem trước** với ba truyện minh họa, 29 truyện tháng 9 và 31 truyện tháng 10. Dữ liệu chỉnh sửa và tiến độ lưu trong `localStorage` của trình duyệt. Trang `/admin` mở trực tiếp để thử giao diện.

## Kết nối Supabase

Project Supabase của ứng dụng là `yzpckbwyoaonnheunmfe` tại Singapore. Truyện tháng 9 và tháng 10 đang ở trạng thái xuất bản. Tệp `.env.local` trên máy phát triển đã được cấu hình và được Git bỏ qua.

1. Trên máy khác hoặc môi trường triển khai, sao chép `.env.example` thành `.env.local` và điền Project URL cùng publishable key trong Supabase Dashboard → Settings → API Keys. Với môi trường triển khai, khai báo hai biến này trong phần cấu hình của nhà cung cấp dịch vụ.
2. Nếu tạo project Supabase mới, chạy [schema.sql](supabase/schema.sql), [cover_images.sql](supabase/cover_images.sql) và [student_progress.sql](supabase/student_progress.sql) trong SQL Editor; triển khai Edge Function [create-student](supabase/functions/create-student/index.ts) với `verify_jwt = true`; rồi nhập dữ liệu qua `/admin`.
3. Tạo tài khoản quản trị trong Supabase Auth, rồi đặt `app_metadata.role` của người dùng thành `admin` bằng công cụ quản trị tin cậy (Dashboard hoặc Admin API dùng secret key ở môi trường riêng). Không đặt quyền qua `user_metadata`.
4. Khởi động lại Next.js sau khi thay đổi biến môi trường. Trang `/admin` sẽ yêu cầu đăng nhập quản trị. Dữ liệu học sinh chỉ hiển thị sau khi truyện được xuất bản.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

**Lưu ý:** Không đưa secret key/service role key vào biến `NEXT_PUBLIC_`. SQL bật RLS cho mọi bảng. Quản trị viên cấp tài khoản học sinh tại `/admin`; học sinh đăng nhập tại `/login` và xem số truyện đã đọc tại `/progress`.

## Tài khoản và tiến độ học sinh

Trong `/admin` → **Tài khoản học sinh**, nhập họ tên, email và mật khẩu ban đầu (ít nhất 8 ký tự), rồi bấm **Cấp tài khoản**. Gửi riêng email và mật khẩu cho học sinh. Danh sách quản trị cho thấy số truyện mỗi em đã đọc.

Học sinh đăng nhập ở `/login`, mở truyện và bấm **Đánh dấu đã đọc**. Mỗi truyện chỉ được tính một lần cho từng tài khoản. Trang `/progress` hiển thị tổng số truyện, tiến độ theo tháng, truyện vừa đọc và số lượt làm bài. Tiến độ được lưu trong `story_reads` và chỉ học sinh đó hoặc quản trị viên xem được.

## Nhập nội dung

Vào `/admin`, chọn **Nhập JSON**. Tải [tệp mẫu](public/sample-import.json) để xem cấu trúc. Mỗi mục cần `month`, `day`, `title`, `content`; có thể thêm `summary`, `youtube_url`, `level`, `duration_minutes`, `questions`. Mỗi câu hỏi có bốn `options`, `answer_index` từ 0 đến 3, và `explanation`. Nội dung nhập hàng loạt luôn là bản nháp; mở từng truyện để kiểm tra rồi xuất bản. Mỗi tháng/ngày chỉ có một truyện.

Trong `/admin`, mục **Ảnh bìa 12 tháng** cho phép tải, thay hoặc xóa ảnh từng tập. Mở **Chỉnh sửa** ở một truyện để tải ảnh đại diện riêng cho truyện đó. Ảnh JPG, PNG hoặc WebP tối đa 5 MB được lưu trong bucket công khai `story-covers` của Supabase Storage; chỉ tài khoản quản trị có quyền tải hoặc xóa. Nếu chưa có ảnh, giao diện dùng màu và biểu tượng mặc định.

### Dữ liệu tháng 9

[Tệp JSON tháng 9](src/data/september.json) có 29 truyện, 116 câu trắc nghiệm, 116 câu đúng/sai, 145 câu trả lời ngắn và 87 câu thảo luận. Mỗi truyện còn có bài điền từ từ PowerPoint câu hỏi. Có thể chọn trực tiếp tệp này trong mục **Nhập JSON** ở trang quản trị; bản nhập sẽ là bản nháp. Nội dung được đối chiếu theo số truyện và tiêu đề giữa [PowerPoint truyện](https://drive.google.com/file/d/1S-TOezTgZv8HV3YycLIwGIo2cICVCJvX), [PowerPoint câu hỏi](https://drive.google.com/file/d/1sVBZ-LmLh4JEFXPhrr6FqBSQGy0ZqZa0) và [PDF sách gốc](https://drive.google.com/file/d/17N3OuPzEwQjK4jVuj2-DtSWPt7klqK0E).

**Ngày 22 thiếu trong cả ba nguồn**: không tạo truyện hoặc câu hỏi giả cho ngày này. Các nguồn chưa cung cấp URL YouTube, nên trường video để trống. File câu hỏi không đánh dấu đáp án trắc nghiệm; đáp án trong JSON được xác định bằng cách đối chiếu nội dung truyện, cần người quản trị rà soát trước khi xuất bản trên Supabase.

## Cấu trúc dữ liệu

- `stories`: vị trí tháng/ngày, nội dung, YouTube, cấp độ, trạng thái.
- `month_covers`: ảnh bìa của từng tháng.
- `questions`: câu hỏi, bốn lựa chọn, đáp án đúng, giải thích.
- `attempts`: bài làm và điểm số theo tài khoản học sinh.
- `student_profiles`: tên và email tài khoản học sinh do quản trị viên cấp.
- `story_reads`: một bản ghi cho mỗi truyện học sinh đã đánh dấu đọc.

Các dạng bài bổ sung (`cloze_text`, `true_false`, `short_answer`, `discussion`) nằm trong `stories.activities`; hiện chỉ phần trắc nghiệm được chấm điểm tự động.

Video được nhúng bằng miền `youtube-nocookie.com`. Trước khi tải nội dung bộ *One Story a Day* lên hệ thống, cần bảo đảm bạn có quyền sử dụng văn bản, hình ảnh và video tương ứng.
