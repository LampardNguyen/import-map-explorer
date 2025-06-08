# Import Map Explorer

Extension VSCode để trực quan hóa mối quan hệ import/require giữa các file trong dự án của bạn dưới dạng bản đồ tương tác.

## Demo

![Import Map Explorer Demo](https://github.com/LampardNguyen/import-map-explorer/blob/main/images/import-export.gif?raw=true)


## Tính năng

- 🗺️ **Bản đồ tương tác**: Hiển thị mối quan hệ import/require dưới dạng graph với canvas
- 🔍 **Phân tích thông minh**: Hỗ trợ cả `import` và `require` statements  
- 📦 **Node Modules**: Hiển thị cả dependencies từ node_modules
- 🎯 **Focus trên file hiện tại**: Xem mối quan hệ của file đang mở
- 🖱️ **Tương tác trực tiếp**: Click đúp để mở file, hover để xem thông tin
- 📁 **Đa định dạng**: Hỗ trợ .ts, .js, .tsx, .jsx, .vue, .svelte
- 🚫 **Tự động bỏ qua .gitignore**: Không phân tích file/folder được liệt kê trong .gitignore

## Cách sử dụng

### 1. Hiển thị bản đồ cho file hiện tại
- Mở file bất kỳ trong editor
- Sử dụng Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Tìm kiếm "Show Current File Import Map" 
- Hoặc sử dụng phím tắt: `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac)
- Hoặc chuột phải trong editor → "Show Current File Import Map"

### 2. Hiển thị bản đồ cho toàn bộ dự án
- Chuột phải vào file trong Explorer → "Show Import Map"
- Hoặc Command Palette → "Show Import Map"

### 3. Tương tác với bản đồ
- **Zoom**: Sử dụng scroll wheel
- **Pan**: Kéo thả để di chuyển view
- **Click**: Chọn node để xem thông tin chi tiết
- **Double click**: Mở file tương ứng
- **Reset View**: Nút reset để về vị trí ban đầu
- **Center on Current**: Tập trung vào file hiện tại
- **Toggle Labels**: Ẩn/hiện tên file

## Cách thức hoạt động

Extension sẽ:
1. **Đọc .gitignore**: Tự động đọc file .gitignore để bỏ qua các file/folder không cần thiết
2. **Phân tích syntax**: Phân tích syntax của các file JavaScript/TypeScript
3. **Trích xuất imports**: Trích xuất tất cả import/require statements
4. **Xây dựng graph**: Xây dựng graph dependencies từ dữ liệu đã phân tích
5. **Hiển thị Canvas**: Hiển thị bằng Canvas với layout tự động
6. **Tương tác real-time**: Cho phép tương tác trực tiếp với bản đồ

## Hỗ trợ .gitignore

Extension tự động đọc và tuân thủ file `.gitignore` trong thư mục gốc của dự án:

### Patterns được hỗ trợ
- ✅ **Wildcard patterns**: `*.js`, `*.log`, `temp*`
- ✅ **Directory patterns**: `node_modules/`, `dist/`, `build/`
- ✅ **Absolute patterns**: `/config.local.js`
- ✅ **Negation patterns**: `!important.js` (file được phép dù match pattern khác)

### Ví dụ .gitignore
```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/
*.min.js

# Log files
*.log
logs/

# Local config files
.env.local
/config.local.js

# Temporary files
temp/
*.tmp

# Exception - file quan trọng không bỏ qua
!important.config.js
```

### Hoạt động
- 🚫 **File bị bỏ qua**: Không được phân tích hoặc hiển thị trong bản đồ
- 📁 **Folder bị bỏ qua**: Toàn bộ nội dung folder không được duyệt
- 🔗 **Import bị bỏ qua**: Import đến file bị gitignore cũng bị bỏ qua
- 📝 **Console log**: Hiển thị thông tin về file/folder bị bỏ qua trong Developer Console

## Các loại node

- 🔵 **File thường**: Các file trong dự án của bạn
- 🔷 **File hiện tại**: File đang được focus (màu xanh đậm)
- 🟠 **Node Module**: Dependencies từ node_modules

## Yêu cầu

- Visual Studio Code 1.74.0 trở lên
- Dự án có chứa các file JavaScript/TypeScript
- File .gitignore (tuỳ chọn) - nếu có sẽ được tự động áp dụng

## Extension Settings

Hiện tại extension không có settings đặc biệt. Tất cả cấu hình được tự động detect.

## Phát triển

```bash
# Clone repository
git clone [your-repo-url]
cd import-map-explorer

# Install dependencies  
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Debug extension
F5 trong VSCode để mở Extension Development Host
```

## Change Log

See Change Log [here](CHANGELOG.md)

## Đóng góp

Chào mừng mọi đóng góp! Vui lòng tạo issue hoặc pull request [repo](https://github.com/LampardNguyen/import-map-explorer).

## Issues

Submit the [issues](https://github.com/LampardNguyen/import-map-explorer/issues) if you find any bug or have any suggestion.

## License

MIT License

## Tác giả

Phát triển bởi LampardNguyen

---

**Enjoy visualizing your code dependencies!** 🚀 
