export type TreeEntry = { path: string; type: "blob" | "tree"; size?: number };

const EXCLUDED_DIRECTORIES =
  /(^|\/)(node_modules|vendor|dist|build|out|\.next|\.nuxt|\.svelte-kit|target|bin|obj|coverage|__pycache__|\.git|\.idea|\.vscode|\.gradle|Pods|DerivedData|bower_components|\.venv|venv|env|site-packages|\.terraform|\.cache|storybook-static|public\/build|\.yarn)(\/|$)/i;
const SECRET_FILES =
  /(^|\/)(\.env(\.|$)|.*\.(pem|key|p12|pfx|jks|keystore|crt|cer|der|gpg|asc)$|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$|.*(secret|credential|password|token|private[-_]?key|service[-_]?account|firebase-adminsdk|serviceaccount).*\.(json|ya?ml|txt|cfg|ini|toml|xml|env|properties)$|\.netrc$|\.npmrc$|\.pypirc$|\.htpasswd$|\.aws\/|\.ssh\/|\.docker\/config\.json$|.*\.tfvars$|.*\.tfstate.*$)/i;
const LOCKFILES =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum|mix\.lock|pubspec\.lock|packages\.lock\.json|flake\.lock|uv\.lock|shrinkwrap\.yaml|npm-shrinkwrap\.json)$/i;
const BINARY_OR_GENERATED =
  /\.(png|jpe?g|gif|webp|avif|ico|icns|bmp|tiff?|psd|ai|sketch|fig|svg|mp3|mp4|mov|avi|mkv|wav|ogg|flac|webm|woff2?|ttf|otf|eot|zip|tar|gz|tgz|bz2|xz|7z|rar|jar|war|ear|class|pyc|pyo|so|dylib|dll|exe|bin|dat|db|sqlite3?|mdb|parquet|pdf|docx?|xlsx?|pptx?|wasm|o|a|lib|pdb|min\.js|min\.css|map|bundle\.js|chunk\.js|snap|lock|log|ipynb|csv|tsv|h5|pkl|pt|onnx|npy|npz|ckpt|safetensors)$/i;
const MAX_TREE_FILE_BYTES = 120_000;

export function excludedFromAnalysis(path: string, size?: number) {
  if (EXCLUDED_DIRECTORIES.test(path)) return true;
  if (SECRET_FILES.test(path)) return true;
  if (LOCKFILES.test(path)) return true;
  if (BINARY_OR_GENERATED.test(path)) return true;
  if (size !== undefined && size > MAX_TREE_FILE_BYTES) return true;
  return false;
}

type Rule = { test: RegExp; weight: number };
/** Higher weights describe architecture better. Depth is a tie breaker. */
const RULES: Rule[] = [
  {
    test: /(^|\/)(package\.json|pyproject\.toml|setup\.py|setup\.cfg|requirements(-dev)?\.txt|Pipfile|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|Gemfile|composer\.json|mix\.exs|pubspec\.yaml|Package\.swift|.*\.csproj|.*\.fsproj|.*\.sln|CMakeLists\.txt|Makefile|deno\.json|bun\.toml|project\.clj|deps\.edn|build\.sbt|stack\.yaml|.*\.cabal|rebar\.config|elm\.json|spago\.dhall|dune-project)$/i,
    weight: 100,
  },
  {
    test: /(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml|fly\.toml|vercel\.json|netlify\.toml|render\.yaml|Procfile|serverless\.ya?ml|app\.yaml|railway\.(json|toml)|k8s\/[^/]+\.ya?ml|helm\/Chart\.yaml|terraform\/main\.tf|main\.tf)$/i,
    weight: 85,
  },
  {
    test: /(^|\/)(prisma\/schema\.prisma|schema\.(prisma|sql|graphql|gql)|drizzle\.config\.[cm]?[jt]s|supabase\/migrations\/[^/]+\.sql|db\/schema\.rb|migrations?\/[^/]+\.(sql|py|rb|ts|js)|models\.py|openapi\.(ya?ml|json)|swagger\.(ya?ml|json))$/i,
    weight: 80,
  },
  {
    test: /(^|\/)(next\.config\.[cm]?[jt]s|nuxt\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|webpack\.config\.[cm]?[jt]s|astro\.config\.[cm]?[jt]s|svelte\.config\.[cm]?[jt]s|remix\.config\.[cm]?[jt]s|angular\.json|tsconfig\.json|tailwind\.config\.[cm]?[jt]s|babel\.config\.[cm]?[jt]s|\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.yml|manifest\.json|app\.json|expo\.json|AndroidManifest\.xml|Info\.plist|wrangler\.toml)$/i,
    weight: 70,
  },
  {
    test: /(^|\/)(ARCHITECTURE|DESIGN|CONTRIBUTING|CHANGELOG|ROADMAP|TODO|NOTES|SPEC|PLAN|DECISIONS?|ADR[^/]*)\.(md|mdx|txt|rst|adoc)$/i,
    weight: 65,
  },
  {
    test: /(^|\/)(docs?\/[^/]+\.(md|mdx|rst)|\.github\/ISSUE_TEMPLATE\/[^/]+\.md)$/i,
    weight: 50,
  },
  {
    test: /^(src\/|app\/|lib\/)?(index|main|app|server|cli|entry|bootstrap|program|application)\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|swift|dart|cs|php|ex|exs|scala|clj|hs|elm|zig|c|cc|cpp|m|mm)$/i,
    weight: 75,
  },
  {
    test: /(^|\/)(src\/app\/(layout|page)\.(tsx|jsx)|app\/(layout|page)\.(tsx|jsx)|src\/App\.(tsx|jsx|vue|svelte)|src\/routes\/[^/]+\.(ts|tsx|js|jsx|svelte)|pages\/_app\.(tsx|jsx)|pages\/index\.(tsx|jsx|vue)|src\/main\.(rs|go|py|ts|js|swift|kt|dart)|cmd\/[^/]+\/main\.go|manage\.py|wsgi\.py|asgi\.py|urls\.py|settings\.py|config\/routes\.rb|config\/application\.rb|lib\/[^/]+\.ex|lib\/main\.dart|Sources\/[^/]+\/[^/]+\.swift|MainActivity\.(kt|java)|Program\.cs|Startup\.cs)$/i,
    weight: 78,
  },
  {
    test: /(^|\/)(src|lib|app|server|api|core|internal|pkg|packages|services|domain)\/[^/]+\/?[^/]*\.(ts|tsx|js|jsx|py|go|rs|rb|java|kt|swift|dart|cs|php|ex|scala|vue|svelte)$/i,
    weight: 40,
  },
  {
    test: /\.(ts|tsx|js|jsx|mjs|py|go|rs|rb|java|kt|swift|dart|cs|php|ex|exs|scala|clj|hs|elm|zig|c|cc|cpp|h|hpp|vue|svelte|sql|graphql|gql|proto|toml|ya?ml|json|md)$/i,
    weight: 15,
  },
];

const README = /(^|\/)readme(\.[^/]+)?$/i;
const TEST_FILE =
  /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress|fixtures|mocks?|stories|examples?|samples?|benchmarks?)\/|\.(test|spec|stories|e2e)\.[^/]+$|_test\.go$|test_[^/]+\.py$/i;

export function rankFile(path: string) {
  const depth = path.split("/").length - 1;
  let weight = 0;
  for (const rule of RULES)
    if (rule.test.test(path)) {
      weight = rule.weight;
      break;
    }
  if (weight === 0) return -1;
  if (TEST_FILE.test(path)) weight -= 30;
  if (/\.(json|ya?ml|toml)$/i.test(path) && weight <= 40) weight -= 10;
  return weight * 10 - Math.min(depth, 9);
}

/**
 * Chooses up to `limit` architecture-defining files. README is handled separately
 * by the collector, so it is skipped here. Ordering is deterministic.
 */
export function selectFiles(entries: TreeEntry[], limit: number) {
  return entries
    .filter(
      (e) =>
        e.type === "blob" &&
        !README.test(e.path) &&
        !excludedFromAnalysis(e.path, e.size),
    )
    .map((e) => ({ path: e.path, rank: rankFile(e.path), size: e.size ?? 0 }))
    .filter((e) => e.rank >= 0)
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        a.size - b.size ||
        a.path.localeCompare(b.path, "en"),
    )
    .slice(0, limit)
    .map((e) => e.path);
}

const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const SECRET_ASSIGNMENT =
  /((?:api[_-]?key|secret|token|passw(?:or)?d|authorization|client[_-]?secret|private[_-]?key|access[_-]?key|connection[_-]?string|database[_-]?url|dsn)[\w.-]*\s*[:=]\s*["'`]?)([^\s"'`,;]{8,})/gi;
const KNOWN_TOKEN_SHAPES =
  /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})\b/g;

/** Returns null when the content must not be shared at all. */
export function scrubSecrets(content: string) {
  if (PRIVATE_KEY_BLOCK.test(content)) return null;
  return content
    .replace(SECRET_ASSIGNMENT, "$1[REDACTED]")
    .replace(KNOWN_TOKEN_SHAPES, "[REDACTED]");
}

export function looksBinary(content: string) {
  const sample = content.slice(0, 2000);
  let control = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13))
      control++;
  }
  return sample.length > 0 && control / sample.length > 0.02;
}

/** Cuts text on a line boundary so partial files still read cleanly. */
export function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return { text, truncated: false };
  const cut = text.lastIndexOf("\n", maxChars);
  return {
    text: text.slice(0, cut > maxChars / 2 ? cut : maxChars),
    truncated: true,
  };
}
