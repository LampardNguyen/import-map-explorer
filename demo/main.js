"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const utils_1 = require("./utils");
const service_1 = require("./service");
const component_1 = require("./components/component");
const express_1 = require("express");
// Main application entry point
class App {
    constructor() {
        this.server = (0, express_1.default)();
        this.initializeMiddleware();
        this.initializeRoutes();
    }
    initializeMiddleware() {
        this.server.use(express_1.default.json());
    }
    initializeRoutes() {
        this.server.get('/', (req, res) => {
            const data = utils_1.utils.getData();
            const processedData = service_1.service.processData(data);
            const componentHtml = component_1.component.render(processedData);
            res.send(componentHtml);
        });
    }
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
}
exports.App = App;
//# sourceMappingURL=main.js.map