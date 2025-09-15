declare module 'jQuery-QueryBuilder' {
    interface QueryBuilderOptions {
        plugins?: any
        rules?: any[]
        operators?: any[]
        [key: string]: any
    }

    interface JQuery {
        queryBuilder(options?: QueryBuilderOptions): JQuery
        queryBuilder(method: string, ...args: any[]): any
    }
}

declare module 'jquery' {
    interface JQuery {
        queryBuilder(options?: any): JQuery
        queryBuilder(method: string, ...args: any[]): any
    }
}
