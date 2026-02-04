import { UAParser } from "ua-parser-js";
import { RequestData } from "../types";

export class Utils {
  public static parseRequestData(req: Request): RequestData {
    let userAgent = "Unknown";
    let ipAddress = "Unknown";
    let platform = "Unknown";
    let device = "Unknown";
    let browser = "Unknown";

    if (req) {
      if (req.headers.get("user-agent")) {
        const parser = new UAParser(req.headers.get("user-agent")!);
        const result = parser.getResult();

        userAgent = result.ua;
        browser = `${result.browser.name} ${result.browser.version}`;
        platform = `${result.os.name} ${result.os.version}`;
        device =
          result.device.vendor && result.device.model
            ? `${result.device.vendor} ${result.device.model}`
            : "Desktop";
      }

      const forwardedFor = req.headers.get("x-forwarded-for");
      if (forwardedFor) {
        ipAddress = forwardedFor.split(",")[0];
      }
    }

    return {
      userAgent,
      ipAddress,
      platform,
      device,
      browser,
    };
  }

  public static generateUUID(
    prefix: string = "",
    length: number = 8
  ): string {
    let result = "";
    const characters = "abcdef0123456789";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return prefix + result;
  }

}