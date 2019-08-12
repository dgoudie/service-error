import express from 'express';
import HttpStatus from 'http-status-codes';

export class ServiceError extends Error {
    public timestamp: string;
    public error: string;
    public message: string;

    constructor(
        public status: number,
        message: string,
        public path: string,
    ) {
        super(message);
        this.message = message;
        this.error = HttpStatus.getStatusText(status);
        this.timestamp = new Date().toISOString();
    }
}

export function serviceErrorHandler() {
    return (
        err: ServiceError,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        if (err.status >= 500) {
            console.error(err.message);
        }
        res.status(err.status).send(err);
    };
}
