# Hướng dẫn Setup Import Map Explorer Extension

## Yêu cầu hệ thống

- Node.js 16+ 
- Visual Studio Code 1.74.0+
- npm hoặc yarn

## Cài đặt và chạy extension

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Compile TypeScript

```bash
npm run compile
```

### 3. Chạy extension trong Development Mode

```bash
# Watch mode (auto compile khi có thay đổi)
npm run watch
```

Sau đó:
1. Mở VSCode
2. Nhấn `F5` để mở Extension Development Host
3. Extension sẽ được load trong cửa sổ VSCode mới

### 4. Test extension

Trong Extension Development Host:
1. Mở một dự án JavaScript/TypeScript
2. Mở Command Palette (`Ctrl+Shift+P`)
3. Tìm "Import Map Explorer" commands:
   - `Show Current File Import Map` - Hiển thị bản đồ cho file hiện tại
   - `Show Import Map` - Hiển thị bản đồ toàn dự án

Hoặc sử dụng phím tắt `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac)

## Cấu trúc dự án

```
├── src/
│   ├── extension.ts          # Entry point của extension
│   ├── importAnalyzer.ts     # Logic phân tích import/require 
│   ├── importMapPanel.ts     # WebView panel hiển thị bản đồ
│   └── types.ts              # Type definitions
├── .vscode/
│   └── launch.json           # Debug configuration
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation

```

## Tính năng chính

### 1. Phân tích Import/Require
- Hỗ trợ `import` và `require` statements
- Phân tích cả TypeScript và JavaScript
- Xử lý relative imports và node_modules
- Hỗ trợ các file extensions: .ts, .js, .tsx, .jsx, .vue, .svelte

### 2. Visualization Canvas
- Bản đồ tương tác với Canvas HTML5
- Zoom, pan, và click để tương tác
- Layout tự động với current file ở trung tâm
- Màu sắc phân biệt các loại file

### 3. UI/UX Features
- Click để xem thông tin chi tiết file
- Double-click để mở file
- Controls để reset view, center, toggle labels
- Legend giải thích màu sắc
- Info panel hiển thị dependencies

## Commands và Shortcuts

| Command | Shortcut | Mô tả |
|---------|----------|-------|
| `importMapExplorer.showCurrentFileMap` | `Ctrl+Shift+M` | Hiển thị bản đồ cho file hiện tại |
| `importMapExplorer.showMap` | - | Hiển thị bản đồ toàn dự án |

## Context Menus

- **Explorer context menu**: Chuột phải vào file → "Show Import Map"
- **Editor context menu**: Chuột phải trong editor → "Show Current File Import Map"

## Debugging

1. Set breakpoints trong TypeScript code
2. Press `F5` để start debugging
3. Extension sẽ chạy trong Extension Development Host
4. Debug console sẽ hiển thị logs

## Build & Package

```bash
# Compile
npm run compile

# Package extension (.vsix file)
npm install -g vsce
vsce package
```

## Testing với project thực

1. Tạo hoặc mở project có cấu trúc như sau:
```
test-project/
├── src/
│   ├── main.ts
│   ├── utils.ts
│   ├── service.ts
│   └── components/
│       └── component.ts
└── package.json
```

2. Thêm imports vào các file:
```typescript
// main.ts
import { utils } from './utils';
import { service } from './service';
import { component } from './components/component';

// utils.ts
import * as fs from 'fs';
import { service } from './service';
```

3. Mở `main.ts` và chạy `Ctrl+Shift+M`

## Troubleshooting

### Extension không load
- Kiểm tra TypeScript compile thành công
- Xem Console trong Extension Development Host
- Restart Extension Development Host

### Không phân tích được imports
- Kiểm tra file syntax hợp lệ
- Kiểm tra đường dẫn imports đúng
- Xem error logs trong Console

### Bản đồ trống
- Kiểm tra workspace folder được mở
- Kiểm tra có files được hỗ trợ (.ts, .js, etc.)
- Kiểm tra files có import statements

## Tối ưu performance

- Extension chỉ phân tích files trong workspace
- Ignore node_modules, .git, dist folders
- Sử dụng cache để tránh re-parse files
- Lazy loading cho large projects 