import { getLogger } from '@log4js-node/log4js-api';
import express from 'express';
import HttpStatus from 'http-status-codes';

export class ServiceError {
    public timestamp: string;
    public error: string;
    public path: string;

    constructor(
        public status: number,
        public message: string,
    ) {
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
        if (err instanceof ServiceError) {
            err.path = req.path;
            if (err.status >= 500) {
                getLogger().error(err.message);
            }
            res.status(err.status).send(err);
        } else {
            next(err);
        }
    };
}
