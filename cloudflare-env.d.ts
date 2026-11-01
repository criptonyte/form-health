declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
declare namespace Cloudflare { interface Env { APP_ENCRYPTION_KEY?: string; APP_ORIGIN?: string; } }
