const lodash = require('lodash');

export const service = {
    processData(data: any[]): any[] {
        return data.map(item => ({
            ...item,
            processed: true,
            timestamp: new Date().toISOString()
        }));
    },

    filterData(data: any[], condition: (item: any) => boolean): any[] {
        return data.filter(condition);
    },

    sortData(data: any[], key: string): any[] {
        return lodash.sortBy(data, key);
    },

    aggregateData(data: any[]): { total: number, count: number, average: number } {
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        const count = data.length;
        const average = count > 0 ? total / count : 0;

        return { total, count, average };
    }
};

export class ComponentService {
    processData() {
        return 'Processed data';
    }
} 