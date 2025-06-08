# Quick Start - Import Map Explorer

## 🚀 Bắt đầu nhanh

### 1. Cài đặt và chạy extension

```bash
# Clone hoặc download project này
cd import-map-explorer

# Cài đặt dependencies
npm install

# Compile TypeScript
npm run compile

# Chạy watch mode
npm run watch
```

### 2. Test extension

1. Mở VSCode và nhấn `F5` để mở Extension Development Host
2. Trong cửa sổ mới, mở thư mục `demo/` làm workspace
3. Mở file `demo/main.ts`
4. Nhấn `Ctrl+Shift+M` (Windows/Linux) hoặc `Cmd+Shift+M` (Mac)

### 3. Kết quả mong đợi

Bạn sẽ thấy bản đồ hiển thị:
- **main.ts** (màu xanh đậm) ở giữa - file hiện tại
- **utils.ts**, **service.ts**, **component.ts** (màu xanh) - project files
- **fs**, **express** (màu cam) - node modules
- Các mũi tên kết nối thể hiện import relationships

### 4. Tương tác với bản đồ

- **Zoom**: Scroll wheel
- **Pan**: Kéo thả để di chuyển 
- **Click node**: Xem thông tin chi tiết
- **Double-click**: Mở file (chỉ project files)
- **Reset View**: Nút "Reset View"
- **Center Current**: Nút "Center Current" 
- **Toggle Labels**: Nút "Toggle Labels"

## 📋 Commands có sẵn

| Command | Mô tả |
|---------|-------|
| `Import Map Explorer: Show Current File Import Map` | Hiển thị bản đồ cho file hiện tại |
| `Import Map Explorer: Show Import Map` | Hiển thị bản đồ toàn dự án |

## 🎯 Context Menu Options

- **Explorer**: Chuột phải vào file → "Show Import Map"
- **Editor**: Chuột phải trong editor → "Show Current File Import Map"

## 🎨 Màu sắc trong bản đồ

- 🔵 **Xanh đậm**: File hiện tại đang focus
- 🔵 **Xanh nhạt**: Các file khác trong project
- 🟠 **Cam**: Node modules từ npm

## 🔧 Supported File Types

- `.ts` - TypeScript
- `.js` - JavaScript  
- `.tsx` - TypeScript React
- `.jsx` - JavaScript React
- `.vue` - Vue.js
- `.svelte` - Svelte

## 📝 Demo Project Structure

```
demo/
├── main.ts              # Entry point với imports
├── utils.ts             # Utility functions
├── service.ts           # Business logic  
├── components/
│   └── component.ts     # UI component
└── package.json         # Dependencies
```

## 🐛 Troubleshooting

**Extension không xuất hiện trong Command Palette?**
- Kiểm tra compile thành công: `npm run compile`
- Restart Extension Development Host

**Bản đồ trống?**
- Kiểm tra file có import statements
- Kiểm tra đường dẫn imports chính xác
- Kiểm tra workspace folder được mở

**Không thể click mở file?**
- Chỉ project files có thể mở được (không phải node modules)
- Double-click vào node để mở file

## ⚡ Performance Tips

- Extension tự động ignore thư mục: `node_modules`, `.git`, `dist`, `build`
- Chỉ phân tích files được hỗ trợ
- Cache kết quả để tăng tốc độ

## 🎉 Bước tiếp theo

Sau khi test thành công với demo:
1. Thử với project thực của bạn
2. Customize theo nhu cầu 
3. Contribute hoặc báo bug nếu có!

---

**Chúc bạn khám phá dependencies vui vẻ!** 🗺️✨ 