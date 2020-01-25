import { getLogger } from '@log4js-node/log4js-api';
import express from 'express';
import HttpStatus from 'http-status-codes';
import { Mailgun, messages } from 'mailgun-js';

export class ServiceError {
  public timestamp: string;
  public error: string;
  public path: string;

  constructor(public status: number, public message: string, public stackTrace: string = null) {
    this.error = HttpStatus.getStatusText(status);
    this.timestamp = new Date().toISOString();
  }
}

export function handleNotFound() {
  return (req: express.Request) => {
    throw new ServiceError(404, `${req.url} not found.`);
  };
}

export function handleRemainingErrors() {
  return (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!(err instanceof ServiceError)) {
      throw new ServiceError(
        500,
        err instanceof Error ? err.message : JSON.stringify(err),
        err instanceof Error ? err.stack : null
      );
    } else {
      next(err);
    }
  };
}

export function translateServiceErrors(
  logByCode = (httpStatusCode: number) => httpStatusCode >= 500 && httpStatusCode < 600
) {
  return (err: ServiceError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    err.path = req.path;
    if (logByCode(err.status)) {
      getLogger().error(err.message);
    }
    res.status(err.status).send(err);
    next(err);
  };
}

export function sendNotifications(
  mailgun: Mailgun,
  sendTo: string,
  serviceName: string,
  sendByCode = (httpStatusCode: number) => httpStatusCode >= 500 && httpStatusCode < 600
) {
  return (err: ServiceError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!sendByCode(err.status)) {
      return;
    }
    const { stackTrace, trimmedError } = (({ stackTrace, ...err }) => ({ stackTrace, trimmedError: err }))(err);
    const emailData: messages.SendData = {
      to: sendTo,
      from: `do-not-reply@${mailgun['domain']}`,
      subject: `[${serviceName}] - ${err.error}`,
      html: `<header>Error:</header>
      <pre>${JSON.stringify(trimmedError)}</pre>
      <header>Stack Trace:</header>
      <pre>${stackTrace}</pre>
      `
    };
    mailgun.messages().send(emailData, err => !!err && getLogger().error(err));
    next(err);
  };
}
