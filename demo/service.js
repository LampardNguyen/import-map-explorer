"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.service = void 0;
const lodash = require('lodash');
exports.service = {
    processData(data) {
        return data.map(item => ({
            ...item,
            processed: true,
            timestamp: new Date().toISOString()
        }));
    },
    filterData(data, condition) {
        return data.filter(condition);
    },
    sortData(data, key) {
        return lodash.sortBy(data, key);
    },
    aggregateData(data) {
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        const count = data.length;
        const average = count > 0 ? total / count : 0;
        return { total, count, average };
    }
};
//# sourceMappingURL=service.js.map