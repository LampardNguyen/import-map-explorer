import { utils } from './utils';
import { service } from './service';
import { component } from './components/component';
import * as fs from 'fs';
import express from 'express';

// Main application entry point
export class App {
    private server: express.Application;

    constructor() {
        this.server = express();
        this.initializeMiddleware();
        this.initializeRoutes();
    }

    private initializeMiddleware() {
        this.server.use(express.json());
    }

    private initializeRoutes() {
        this.server.get('/', (req, res) => {
            const data = utils.getData();
            const processedData = service.processData(data);
            const componentHtml = component.render(processedData);
            
            res.send(componentHtml);
        });
    }

    public start(port: number = 3000) {
        this.server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
} 