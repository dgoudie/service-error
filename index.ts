import { getLogger } from '@log4js-node/log4js-api';
import express from 'express';
import HttpStatus from 'http-status-codes';
import { Mailgun, messages } from 'mailgun-js';

export class ServiceError {
  public timestamp: string;
  public error: string;
  public path: string;

  constructor(public status: number, public message: string) {
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
      throw new ServiceError(500, err instanceof Error ? err.message : JSON.stringify(err));
    } else {
      next(err);
    }
  };
}

export function sendNotifications(mailgun: Mailgun, sendTo: string) {
  return (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const emailData: messages.SendData = {
      to: sendTo,
      from: `do-not-reply@${mailgun['domain']}`,
      subject: 'test',
      html: '<div>test</div>'
    };
    mailgun.messages().send(emailData, err => !!err && getLogger().error(err));
    next(err);
  };
}

export function translateServiceErrors() {
  return (err: ServiceError, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
