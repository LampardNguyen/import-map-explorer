"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.component = void 0;
const utils_1 = require("../utils");
exports.component = {
    render(data) {
        const formattedData = utils_1.utils.formatData(data);
        return `
            <html>
                <head>
                    <title>Demo Component</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .data-container { background: #f5f5f5; padding: 15px; border-radius: 5px; }
                        pre { background: #333; color: #fff; padding: 10px; border-radius: 3px; }
                    </style>
                </head>
                <body>
                    <h1>Demo Component</h1>
                    <div class="data-container">
                        <h2>Processed Data:</h2>
                        <pre>${formattedData}</pre>
                    </div>
                </body>
            </html>
        `;
    },
    renderList(items) {
        const listItems = items.map(item => `<li>${item.name}: ${item.value}</li>`).join('');
        return `<ul>${listItems}</ul>`;
    },
    renderTable(data) {
        if (!data.length)
            return '<p>No data available</p>';
        const headers = Object.keys(data[0]);
        const headerRow = headers.map(h => `<th>${h}</th>`).join('');
        const dataRows = data.map(item => `<tr>${headers.map(h => `<td>${item[h]}</td>`).join('')}</tr>`).join('');
        return `
            <table border="1" style="border-collapse: collapse;">
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${dataRows}</tbody>
            </table>
        `;
    }
};
//# sourceMappingURL=component.js.map