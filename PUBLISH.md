# 📋 Hướng dẫn Publish VSCode Extension lên Marketplace

Hướng dẫn chi tiết từng bước để publish extension "Import Map Explorer" lên Visual Studio Marketplace.

## https://code.visualstudio.com/api/working-with-extensions/publishing-extension

## 🚀 Tổng quan quy trình

1. **Chuẩn bị** → 2. **Build** → 3. **Cài đặt vsce** → 4. **Tạo Publisher** → 5. **Package** → 6. **Publish**

---

## 📝 Bước 1: Chuẩn bị trước khi publish

### 1.1 Kiểm tra và cập nhật package.json

Đảm bảo `package.json` có đầy đủ thông tin cần thiết:

```json
{
  "name": "import-map-explorer",
  "displayName": "Import Map Explorer",
  "description": "Visualize import/require relationships between files in your project as an interactive map",
  "version": "0.0.1",
  "publisher": "YOUR_PUBLISHER_ID",              // ⚠️ CẦN THAY ĐỔI
  "repository": {
    "type": "git",
    "url": "https://github.com/LampardNguyen/import-map-explorer.git"
  },
  "bugs": {
    "url": "https://github.com/LampardNguyen/import-map-explorer/issues"
  },
  "homepage": "https://github.com/LampardNguyen/import-map-explorer#readme",
  "author": "Your Name <your.email@example.com>", // ⚠️ CẦN THAY ĐỔI
  "icon": "icon.png",                            // ⚠️ CẦN TẠO ICON
  "engines": {
    "vscode": "^1.74.0"
  }
  // ... phần còn lại
}
```

### 1.2 Tạo icon cho extension

- **Kích thước**: 128x128 pixels
- **Định dạng**: PNG
- **Tên file**: `icon.png`
- **Vị trí**: Thư mục root của project

### 1.3 Tạo file .vscodeignore

```gitignore
.vscode/**
.vscode-test/**
src/**
.gitignore
.yarnrc
vsc-extension-quickstart.md
**/tsconfig.json
**/.eslintrc.json
**/*.map
**/*.ts
node_modules/**
demo/**
*.todo.md
SETUP.md
PUBLISH.md
```

### 1.4 Cập nhật README.md

- Thêm screenshots/GIF demo
- Cập nhật thông tin tác giả
- Thêm badge marketplace (sau khi publish)

---

## 🔧 Bước 2: Build extension

```bash
# Compile TypeScript code
npm run compile

# Kiểm tra không có lỗi compilation
# Đảm bảo folder ./out/ được tạo với file extension.js
```

---

## 🛠️ Bước 3: Cài đặt và cấu hình vsce

### 3.1 Cài đặt vsce (Visual Studio Code Extension Manager)

```bash
npm install -g vsce
```

### 3.2 Tạo tài khoản Azure DevOps

1. Truy cập: https://dev.azure.com
2. Đăng nhập hoặc tạo tài khoản Microsoft
3. Tạo organization mới (có thể dùng tên cá nhân)

### 3.3 Tạo Personal Access Token

1. Trong Azure DevOps: Avatar → **Personal Access Tokens**
2. Click **+ New Token**
3. Cấu hình:
   - **Name**: `VSCode Marketplace Publishing`
   - **Organization**: Chọn organization vừa tạo
   - **Expiration**: Chọn thời gian hết hạn (khuyến nghị 1 năm)
   - **Scopes**: Chọn **Custom defined**
   - ✅ Check **Marketplace (Manage)**
4. Click **Create**
5. **⚠️ QUAN TRỌNG**: Copy token ngay (chỉ hiện 1 lần!)

---

## 👤 Bước 4: Tạo Publisher

### https://code.visualstudio.com/api/working-with-extensions/publishing-extension#create-a-publisher

**Lưu ý**: 
- `YOUR_PUBLISHER_ID` phải là unique (duy nhất)
- Không thể thay đổi sau khi tạo
- Nên dùng tên đơn giản, dễ nhớ

### 4.2 Nhập thông tin

- **Personal Access Token**: Paste token vừa tạo
- **Display Name**: Tên hiển thị cho publisher
- **Email**: Email liên hệ

### 4.3 Cập nhật package.json

Thay `YOUR_PUBLISHER_ID` trong `package.json` bằng publisher ID thực tế:

```json
{
  "publisher": "your-actual-publisher-id"
}
```

---

## 📦 Bước 5: Package extension

### 5.1 Tạo package để test

```bash
# Tạo file .vsix để test local
vsce package

# Output: import-map-explorer-0.0.1.vsix
```

### 5.2 Test extension locally (Tùy chọn)

Nếu có VSCode command line tools:

```bash
# Cài đặt extension từ file .vsix
code --install-extension import-map-explorer-0.0.1.vsix

# Test các tính năng trong VSCode
```

**Nếu lỗi "command not found: code":**
- Mở VSCode → Command Palette (`Cmd+Shift+P`)
- Gõ: `Shell Command: Install 'code' command in PATH`
- Hoặc cài đặt extension thủ công qua VSCode UI

---

## 🚀 Bước 6: Publish extension

### 6.1 Login với publisher

```bash
vsce login YOUR_PUBLISHER_ID
```

Nhập Personal Access Token khi được yêu cầu.

### 6.2 Publish extension

**Cách 1: Publish trực tiếp**
```bash
vsce publish
```

**Cách 2: Publish từ file .vsix**
```bash
vsce publish --packagePath import-map-explorer-0.0.1.vsix
```

### 6.3 Xác nhận publish thành công

Sau khi publish, bạn sẽ thấy:
- URL của extension trên marketplace
- Thông báo publish thành công
- Extension sẽ có sẵn sau 5-10 phút

---

## ✅ Bước 7: Verify và quản lý extension

### 7.1 Kiểm tra trên Marketplace

1. Truy cập: https://marketplace.visualstudio.com
2. Tìm kiếm extension của bạn
3. Kiểm tra:
   - Icon hiển thị đúng
   - Mô tả rõ ràng
   - Screenshots (nếu có)
   - Install count

### 7.2 Các lệnh quản lý extension

```bash
# Xem danh sách extensions của publisher
vsce ls

# Xem thông tin chi tiết extension
vsce show YOUR_PUBLISHER_ID.import-map-explorer

# Unpublish extension (nếu cần)
vsce unpublish YOUR_PUBLISHER_ID.import-map-explorer
```

---

## 🔄 Bước 8: Update extension trong tương lai

### 8.1 Cập nhật version

```bash
# Tăng version patch (0.0.1 → 0.0.2)
vsce publish patch

# Tăng version minor (0.0.1 → 0.1.0)  
vsce publish minor

# Tăng version major (0.0.1 → 1.0.0)
vsce publish major

# Hoặc chỉ định version cụ thể
vsce publish 1.2.3
```

### 8.2 Quy trình update

1. Sửa đổi code
2. Test extension
3. Cập nhật CHANGELOG.md (nếu có)
4. Compile: `npm run compile`
5. Publish với version mới

---

## ⚠️ Lưu ý quan trọng

### Bảo mật
- **Personal Access Token**: Lưu trữ an toàn, có thời hạn
- **Publisher ID**: Không thể thay đổi sau khi tạo
- **Repository**: Nên public để người dùng xem source code

### Version Management
- Tuân thủ **Semantic Versioning** (semver)
- `MAJOR.MINOR.PATCH`
- Chỉ có thể tăng version, không thể giảm

### Required Files
- ✅ `package.json` với đầy đủ thông tin
- ✅ `icon.png` (128x128px)
- ✅ `README.md` với mô tả chi tiết
- ✅ `LICENSE` file
- ✅ Compiled code trong `./out/`

### Testing
- Test extension local trước khi publish
- Kiểm tra tất cả commands hoạt động
- Test trên các loại project khác nhau

---

## 🚀 Checklist trước khi publish

- [ ] ✅ Cập nhật `package.json` với publisher ID thực tế
- [ ] ✅ Tạo icon 128x128px (`icon.png`)
- [ ] ✅ Cập nhật README.md với thông tin đầy đủ
- [ ] ✅ Tạo `.vscodeignore` để loại bỏ file không cần thiết
- [ ] ✅ Compile extension: `npm run compile`
- [ ] ✅ Tạo Azure DevOps account và Personal Access Token
- [ ] ✅ Tạo publisher: `vsce create-publisher`
- [ ] ✅ Test package local: `vsce package`
- [ ] ✅ Login: `vsce login`
- [ ] ✅ Publish: `vsce publish`
- [ ] ✅ Verify trên marketplace

---

## 🔗 Links hữu ích

- **Visual Studio Marketplace**: https://marketplace.visualstudio.com
- **Azure DevOps**: https://dev.azure.com
- **vsce Documentation**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Extension Guidelines**: https://code.visualstudio.com/api/references/extension-guidelines

---

## ❓ Troubleshooting

### Lỗi thường gặp:

1. **"command not found: code"**
   - Solution: Cài đặt VSCode command line tools

2. **"Publisher not found"**
   - Solution: Chạy `vsce create-publisher` trước

3. **"Invalid Personal Access Token"**
   - Solution: Tạo token mới với scope "Marketplace (Manage)"

4. **"Package size too large"**
   - Solution: Kiểm tra `.vscodeignore`, loại bỏ file không cần thiết

5. **"Icon not found"**
   - Solution: Đảm bảo có file `icon.png` 128x128px trong root

---

**🎉 Chúc mừng! Extension của bạn đã sẵn sàng publish lên Visual Studio Marketplace!** 