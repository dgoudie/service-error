import FormData from 'form-data';
import HttpStatus from 'http-status-codes';
import Mailgun from 'mailgun.js';
import express from 'express';
import { getLogger } from '@log4js-node/log4js-api';

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
  logWarnByCode = (httpStatusCode: number) => httpStatusCode >= 400 && httpStatusCode < 500,
  logErrorByCode = (httpStatusCode: number) => httpStatusCode >= 500 && httpStatusCode < 600
) {
  return (err: ServiceError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    err.path = req.path;
    if (logWarnByCode(err.status)) {
      getLogger().warn(err.message);
    }
    if (logErrorByCode(err.status)) {
      getLogger().error(err.message);
    }
    res.status(err.status).send(err);
    next(err);
  };
}

export function sendNotifications(
  serviceName: string,
  mailgunUserName: string,
  mailgunApiKey: string,
  mailgunDomain: string,
  mailgunSender: string,
  mailgunRecipient: string,
  sendByCode = (httpStatusCode: number) => httpStatusCode >= 500 && httpStatusCode < 600
) {
  //@ts-ignore
  const mailgun = new Mailgun(FormData);
  const client = mailgun.client({ username: mailgunUserName, key: mailgunApiKey });
  return (err: ServiceError, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!sendByCode(err.status)) {
      return;
    }
    const { stackTrace, trimmedError } = (({ stackTrace, ...err }) => ({ stackTrace, trimmedError: err }))(err);
    client.messages
      .create(mailgunDomain, {
        from: mailgunSender,
        to: [mailgunRecipient],
        subject: `[${serviceName}] - ${err.error}`,
        html: `<header>Error:</header>
      <pre>${JSON.stringify(trimmedError)}</pre>
      <header>Stack Trace:</header>
      <pre>${stackTrace}</pre>
      `,
      })
      .catch((e) => !!e && getLogger().error(e));
    next(err);
  };
}
