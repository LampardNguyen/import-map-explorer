"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const service_1 = require("./service");
exports.utils = {
    getData() {
        return [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
        ];
    },
    formatData(data) {
        return JSON.stringify(data, null, 2);
    },
    validateData(data) {
        return data && typeof data === 'object';
    },
    processWithService(data) {
        return service_1.service.processData(data);
    }
};
//# sourceMappingURL=utils.js.map