import { NextFunction, Request, Response } from 'express';

import FormData from 'form-data';
import HttpStatus from 'http-status-codes';
import Mailgun from 'mailgun.js';
import { getLogger } from '@log4js-node/log4js-api';

export class ServiceError {
    public timestamp: string;
    public error: string;
    public path: string | null = null;

    constructor(
        public status: number,
        public message: string,
        public stack: string | null = null
    ) {
        this.error = HttpStatus.getStatusText(status);
        this.timestamp = new Date().toISOString();
    }
}

export function handleNotFound() {
    return (req: Request, _res: Response, next: NextFunction) => {
        next(new ServiceError(404, `${req.url} not found.`));
    };
}

export function handleRemainingErrors() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
        if (!(err instanceof ServiceError)) {
            next(
                new ServiceError(
                    500,
                    err instanceof Error ? err.message : JSON.stringify(err),
                    err instanceof Error ? err.stack : null
                )
            );
        } else {
            next(err);
        }
    };
}

export function translateServiceErrors(
    logWarnByCode = (httpStatusCode: number) =>
        httpStatusCode >= 400 && httpStatusCode < 500,
    logErrorByCode = (httpStatusCode: number) =>
        httpStatusCode >= 500 && httpStatusCode < 600
) {
    return (
        err: ServiceError,
        req: Request,
        res: Response,
        _next: NextFunction
    ) => {
        err.path = req.path;
        if (logWarnByCode(err.status)) {
            getLogger().warn(err.message);
        }
        if (logErrorByCode(err.status)) {
            getLogger().error(err.message, err.stack);
        }
        res.status(err.status).send(err);
    };
}

export function sendNotifications(
    serviceName: string,
    mailgunUserName: string,
    mailgunApiKey: string,
    mailgunDomain: string,
    mailgunSender: string,
    mailgunRecipient: string,
    sendByCode = (httpStatusCode: number) =>
        httpStatusCode >= 500 && httpStatusCode < 600
) {
    //@ts-ignore
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
        username: mailgunUserName,
        key: mailgunApiKey,
    });
    return (
        err: ServiceError,
        _req: Request,
        _res: Response,
        next: NextFunction
    ) => {
        if (!sendByCode(err.status)) {
            return;
        }
        const { stack, ...trimmedError } = err;
        client.messages
            .create(mailgunDomain, {
                from: mailgunSender,
                to: [mailgunRecipient],
                subject: `[${serviceName}] - ${err.error}`,
                html: `<header>Error:</header>
      <pre>${JSON.stringify(trimmedError)}</pre>
      <header>Stack Trace:</header>
      <pre>${stack}</pre>
      `,
            })
            .catch((e: any) => !!e && getLogger().error(e));
        next(err);
    };
}
