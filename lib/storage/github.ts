/**
 * ذخیره‌سازی تصویر روی Contents API گیت‌هاب.
 *
 * SERVER-ONLY. این ماژول فقط از اکشن‌های سرور و روت‌هندرها صدا زده می‌شود؛ توکن
 * هرگز به مرورگر نمی‌رود و `NEXT_PUBLIC_` نمی‌گیرد.
 *
 * چرا ریپو به‌جای سرویس ابری: پروژه دانشگاهی است و جایی برای هزینه‌ی ماهانه‌ی
 * فضای ابری ندارد؛ گیت‌هاب رایگان CDN می‌دهد و هر نوشتن یک کامیت است —
 * یعنی تاریخچه‌ی کاملی از رسیدها، که برای حسابرسی فروشگاه مزیت است نه عیب.
 *
 * سه نکته که اینجا رعایت شده، چون هر کدام راهی است که پیاده‌سازی ساده داده را
 * از دست می‌دهد:
 *
 *  - **نام فایل ساخته می‌شود، از کاربر گرفته نمی‌شود.** نام فایلی که از مرورگر
 *    می‌آید به URL و تاریخچه‌ی گیت می‌رسد و ممکن است چیزی فاش کند.
 *  - **پسوند از نوع MIME می‌آید، نه از نام فایل.** فایلی به نام `photo.txt` که
 *    در واقع PNG است، PNG ذخیره می‌شود.
 *  - **جایگزینی به SHA فعلی نیاز دارد**؛ وگرنه گیت‌هاب ۴۲۲ می‌دهد. پس
 *    «جایگزینی» یک خواندن-و-نوشتن است، نه یک نوشتن.
 */

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const RAW = "https://raw.githubusercontent.com";

export type BucketConfig = {
  owner: string;
  repo: string;
  branch: string;
  /** توکن fine-grained با دسترسی Contents: read+write روی همین یک ریپو. */
  token: string;
  /** پوشه‌ای داخل ریپو که فایل‌های این سایت آنجاست. */
  dir: string;
};

export type StoredImage = {
  /** مسیر داخل ریپو، مثلاً `mr-jeton/receipts/2026/abc.webp`. */
  path: string;
  name: string;
  size: number;
  /** URL عمومی و CDN‌دار که `<Image>` مستقیم می‌خواند. */
  url: string;
};

export class BucketError extends Error {
  readonly status?: number;
  /** true یعنی خطا از سمت ماست و باید 4xx برگردد، نه 5xx. */
  readonly local: boolean;

  constructor(message: string, status?: number, local = false) {
    super(message);
    this.name = "BucketError";
    this.status = status;
    this.local = local;
  }
}

const DEFAULT_DIR = "mr-jeton";

/**
 * پوشه‌ی پیش‌فرض: `mr-jeton` داخل ریپوی باکت.
 *
 * یک ریپو می‌تواند چند سایت را نگه دارد؛ این پوشه مرز آن‌هاست.
 */
export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
): BucketConfig | null {
  const owner = env.GITHUB_BUCKET_OWNER?.trim() ?? "";
  const repo = env.GITHUB_BUCKET_REPO?.trim() ?? "";
  const token = env.GITHUB_TOKEN?.trim() ?? "";
  if (!owner || !repo || !token) return null;

  return {
    owner,
    repo,
    branch: env.GITHUB_BUCKET_BRANCH?.trim() || "main",
    token,
    dir: env.GITHUB_BUCKET_DIR?.trim() || DEFAULT_DIR,
  };
}

/** پوشه‌ی معتبر: یک کلمه از حروف، ارقام، خط تیره و زیرخط. چون در URL می‌نشیند. */
function safeDir(dir: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(dir)) {
    throw new BucketError(
      "نام پوشه‌ی باکت معتبر نیست؛ فقط حروف انگلیسی، ارقام، خط تیره و زیرخط.",
      400,
      true,
    );
  }
  return dir;
}

export function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function rawUrl(config: BucketConfig, path: string): string {
  return `${RAW}/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/${encodeURIComponent(config.branch)}/${encodePath(path)}`;
}

function contentsPath(config: BucketConfig, path: string): string {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}`;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);

async function request<T>(
  config: BucketConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": API_VERSION,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new BucketError("ارتباط با گیت‌هاب برقرار نشد.", 502);
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const detail = body?.message ?? response.statusText;

    // پیام‌های خودمان: «Bad credentials» به کاربر چیزی نمی‌گوید.
    if (response.status === 401) {
      throw new BucketError(
        "توکن گیت‌هاب نامعتبر است یا منقضی شده. GITHUB_TOKEN را به‌روز کنید.",
        response.status,
      );
    }
    if (response.status === 403) {
      throw new BucketError(
        "دسترسی توکن کافی نیست؛ توکن باید روی همین ریپو مجوز Contents: نوشتن داشته باشد.",
        response.status,
      );
    }
    if (response.status === 409 || response.status === 422) {
      throw new BucketError(
        "نوشتن در گیت‌هاب ناموفق بود؛ ممکن است فایل هم‌زمان تغییر کرده باشد.",
        response.status,
      );
    }

    throw new BucketError(`GitHub ${response.status}: ${detail}`, response.status);
  }

  return response.json() as Promise<T>;
}

export function extensionFor(file: { type: string; name: string }): string | null {
  const byType = EXT_BY_TYPE[file.type];
  if (byType) return byType;

  const match = /\.([a-z0-9]{1,5})$/i.exec(file.name);
  const ext = match?.[1]?.toLowerCase() ?? "";
  const byExt = Object.entries(EXT_BY_TYPE).find(([, e]) => e === ext);
  return byExt ? byExt[1]! : null;
}

/** نامی که نه برخورد دارد، نه چیزی فاش می‌کند. */
export function storageName(ext: string): string {
  return `${crypto.randomUUID()}.${ext}`;
}

/** اعتبارسنجی فایل پیش از اینکه به باکت برسد. */
export function validateFile(
  file: { type: string; size: number },
  maxBytes: number,
): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "قالب مجاز: JPG، PNG، WebP، GIF یا AVIF";
  }
  if (file.size === 0) return "فایل خالی است.";
  if (file.size > maxBytes) {
    return `حجم فایل بیشتر از ${Math.round(maxBytes / 1024 / 1024)} مگابایت است.`;
  }
  return null;
}

type Content = {
  name: string;
  path: string;
  sha: string;
  size: number;
  type?: string;
  download_url?: string | null;
};

async function toBase64(file: Blob): Promise<string> {
  try {
    return Buffer.from(await file.arrayBuffer()).toString("base64");
  } catch (error) {
    throw new BucketError(
      `خواندن فایل ناموفق بود.${error instanceof Error ? ` (${error.message})` : ""}`,
      400,
      true,
    );
  }
}

/**
 * یک تصویر را در باکت ذخیره می‌کند و مسیر و URL عمومی‌اش را برمی‌گرداند.
 *
 * `subdir` پوشه‌ی دسته‌بندی است (`receipts`, `avatars`, `menus`) و تاریخ هم به
 * آن اضافه می‌شود: ریپویی که هزار فایل در یک پوشه دارد، از راه دور غیرقابل
 * استفاده است.
 */
export async function put(
  config: BucketConfig,
  file: File,
  options: { subdir: string; maxBytes: number; date?: Date },
): Promise<StoredImage> {
  const invalid = validateFile(file, options.maxBytes);
  if (invalid) throw new BucketError(invalid, 400, true);

  const ext = extensionFor(file);
  if (!ext) throw new BucketError("قالب فایل پشتیبانی نمی‌شود.", 415, true);

  const now = options.date ?? new Date();
  const path = [
    safeDir(config.dir),
    safeDir(options.subdir),
    String(now.getUTCFullYear()),
    storageName(ext),
  ].join("/");

  const result = await request<{ content: Content }>(
    config,
    contentsPath(config, path),
    {
      method: "PUT",
      body: JSON.stringify({
        message: `Add ${path}`,
        branch: config.branch,
        content: await toBase64(file),
      }),
    },
  );

  return {
    path,
    name: result.content.name,
    size: result.content.size,
    url: result.content.download_url ?? rawUrl(config, path),
  };
}

/** فهرست فایل‌های یک پوشه — نبودن پوشه یعنی فهرست خالی، نه خطا. */
export async function list(
  config: BucketConfig,
  subdir: string,
): Promise<StoredImage[]> {
  const path = `${contentsPath(config, `${safeDir(config.dir)}/${safeDir(subdir)}`)}?ref=${encodeURIComponent(config.branch)}`;

  try {
    const entries = await request<Content[]>(config, path);
    return entries
      .filter((e) => e.type === "file" || e.download_url)
      .map((e) => ({
        path: e.path,
        name: e.name,
        size: e.size,
        url: e.download_url ?? rawUrl(config, e.path),
      }));
  } catch (error) {
    if (error instanceof BucketError && error.status === 404) return [];
    throw error;
  }
}

/** حذف با SHA — بدون آن گیت‌هاب درخواست را رد می‌کند. */
export async function remove(
  config: BucketConfig,
  path: string,
  sha: string,
): Promise<void> {
  await request<void>(config, contentsPath(config, path), {
    method: "DELETE",
    body: JSON.stringify({
      message: `Remove ${path}`,
      branch: config.branch,
      sha,
    }),
  });
}