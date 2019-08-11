import HttpStatus from 'http-status-codes';
import express from 'express';

export class ServiceError extends Error {
    public timestamp: string;
    public error: string;

    constructor(
        public status: number,
        public message: string,
        public path: string
    ) {
        super(message);
        this.error = HttpStatus.getStatusText(status)
        this.timestamp = new Date().toISOString();
    }
}

export function serviceErrorHandler() {
    return (
        err: ServiceError,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        if (err.status >= 500) {
            console.error(err.message);
        }
        res.status(err.status).send(err);
    }
}