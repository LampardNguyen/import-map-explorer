hãy giúp tôi tạo 1 dự án extension cho vscode bạn xem nội dung dưới đây và gợi ý đặt tên luôn nhé

dự án này thể hiện sự quan hệ import của các file trong 1 dự án ra thành 1 bản đồ (có thể dùng canvas để vẽ hay svg gì đó tùy bạn)
thí dụ: tôi có 1 file main.ts, 1 file utils.ts, 1 file service.ts, 1 file component.ts, 1 file app.ts
thì dự án này sẽ thể hiện sự quan hệ import của các file trên ra thành 1 bản đồ

thí dụ:
main.ts
import { utils } from './utils';
import { service } from './service';
import { component } from './component';

file app.ts
import { main } from './main';

khi tôi đang ở file main.ts và tôi muốn tìm kiếm các file được import vào file main.ts và file main.ts đang được các file nào import vào

Lưu ý: import hoặc require đều như nhau, tôi muốn dự án này có thể xử lý cả 2
nếu đang là import các node_modules thì hiển thị tên của node_modules đó
nếu đang là import các file trong dự án thì hiển thị tên của file đó bao gồm cả đường dẫn của file đó

thì dự án này sẽ thể hiện ra bản đồ như hình



