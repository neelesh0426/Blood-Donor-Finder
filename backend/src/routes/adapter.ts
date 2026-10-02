import type { Request as ExpressReq, Response as ExpressRes, NextFunction } from "express";

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export type WebHandler = (
  req: Request,
  context?: any
) => Promise<Response>;

export function adaptRoute(handler: WebHandler) {
  return async (req: ExpressReq, res: ExpressRes, next: NextFunction) => {
    try {
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:5000";
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val !== undefined) {
          if (Array.isArray(val)) {
            val.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, val);
          }
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (!["GET", "HEAD"].includes(req.method.toUpperCase())) {
        if (req.body !== undefined && req.body !== null) {
          if (typeof req.body === "string" || req.body instanceof Buffer) {
            init.body = req.body;
          } else {
            init.body = JSON.stringify(req.body);
            if (!headers.has("content-type")) {
              headers.set("content-type", "application/json");
            }
          }
        }
      }

      const webReq = new Request(fullUrl, init);
      const context: RouteContext = {
        params: Promise.resolve(req.params as Record<string, string>),
      };

      const webRes = await handler(webReq, context);

      res.status(webRes.status);

      // Forward response headers and cookies
      const setCookies: string[] = [];
      webRes.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          setCookies.push(value);
        } else {
          res.setHeader(key, value);
        }
      });

      if (setCookies.length > 0) {
        res.setHeader("set-cookie", setCookies);
      }

      const responseText = await webRes.text();
      res.send(responseText);
    } catch (error) {
      next(error);
    }
  };
}
