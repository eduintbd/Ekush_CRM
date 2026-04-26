// Provider-agnostic SMS gateway. v1 ships with a console-only default;
// real providers (Alpha SMS, SSL Wireless, Twilio, etc.) plug in by
// adding a new branch in `getSmsProvider()` keyed on env. The route
// layer never imports a specific provider — it always goes through the
// `SmsProvider` interface so we can swap gateways without touching it.

export type SmsMessage = {
  // Phone in canonical national form (e.g. "01712345678") or with the
  // country dial code prefixed (e.g. "8801712345678"). The provider is
  // responsible for any further normalization required by its API.
  to: string;
  body: string;
};

export type SmsResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export interface SmsProvider {
  // The provider's identity, used in audit logs and the
  // PROSPECTS_SMS_PROVIDER env diagnostic.
  readonly name: string;
  send(msg: SmsMessage): Promise<SmsResult>;
}

// Default: log to the server console. Useful in dev / staging so the
// signup → OTP flow is end-to-end testable without SMS credentials.
// Production must override via PROSPECTS_SMS_PROVIDER.
class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  async send(msg: SmsMessage): Promise<SmsResult> {
    // eslint-disable-next-line no-console
    console.log(`[SMS:${this.name}] To ${msg.to}: ${msg.body}`);
    return { ok: true, messageId: `console-${Date.now()}` };
  }
}

// Returns the configured provider based on env.
//
//   PROSPECTS_SMS_PROVIDER=console   (default)
//   PROSPECTS_SMS_PROVIDER=alpha     (Alpha SMS BD — TODO: implement)
//   PROSPECTS_SMS_PROVIDER=ssl       (SSL Wireless BD — TODO: implement)
//   PROSPECTS_SMS_PROVIDER=twilio    (TODO: implement)
//
// Each real provider should read its own credentials from env and
// expose the same SmsProvider shape. Until added, requesting an
// unknown provider name silently falls back to console — never throws,
// since signup must remain functional during a credential rotation.
export function getSmsProvider(): SmsProvider {
  const choice = (process.env.PROSPECTS_SMS_PROVIDER ?? "console").toLowerCase();
  switch (choice) {
    case "console":
      return new ConsoleSmsProvider();
    default:
      // eslint-disable-next-line no-console
      console.warn(
        `[SMS] PROSPECTS_SMS_PROVIDER="${choice}" is not implemented yet. Falling back to console provider.`,
      );
      return new ConsoleSmsProvider();
  }
}
