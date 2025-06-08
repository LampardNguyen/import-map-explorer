import { service } from './service';

export const utils = {
    getData(): any[] {
        return [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
        ];
    },

    formatData(data: any): string {
        return JSON.stringify(data, null, 2);
    },

    validateData(data: any): boolean {
        return data && typeof data === 'object';
    },

    processWithService(data: any): any {
        return service.processData(data);
    }
}; 