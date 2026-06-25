"""
Adega Imperial — Servidor Local Seguro
=======================================
Este servidor é destinado ao DESENVOLVIMENTO LOCAL.
Para produção, use Nginx + Cloudflare + HTTPS real.

Proteções ativas:
  - Rate limiting por IP (bloqueio progressivo)
  - Bloqueio de paths sensíveis (.env, .git, backups, admin...)
  - Bloqueio de path traversal (../)
  - Bloqueio de métodos HTTP não usados (PUT, DELETE, TRACE...)
  - Headers de segurança completos (CSP, HSTS, X-Frame-Options...)
  - Banner de versão suprimido (não vaza "Python/3.x")
  - Log de atividades suspeitas
  - Respostas genéricas (não vaza stack trace)
"""

import http.server
import socketserver
import os
import sys
import time
import logging
from collections import defaultdict
from datetime import datetime

# =====================================================
# CONFIGURAÇÕES
# =====================================================
PORT = 8000

# Rate limiting
RATE_LIMIT_WINDOW   = 60     # janela de tempo em segundos
RATE_LIMIT_MAX      = 80     # máximo de requisições na janela
RATE_LIMIT_BLOCK    = 120    # segundos de bloqueio após exceder

# Padrões de paths sensíveis a bloquear
# (proteção contra Gobuster, FFUF, Dirb, Nikto, etc.)
BLOCKED_PATH_PATTERNS = [
    '.env', '.git', '.gitignore', '.gitconfig',
    '.htaccess', '.htpasswd', '.npmrc', '.yarnrc',
    'server.py', 'package.json', 'package-lock.json',
    'node_modules', 'webpack.config', 'vite.config',
    '.sql', '.db', '.sqlite', '.sqlite3',
    '.bak', '.old', '.orig', '.swp', '.dump',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.log', '.cache',
    'backup', 'backups', 'dump', 'dumps',
    'wp-admin', 'phpmyadmin', 'adminer',
    'config', 'configs', 'secret', 'secrets', 'private',
    'api/admin', 'api/internal', 'api/debug',
    '.well-known/security.txt',
    'Thumbs.db', '.DS_Store', 'desktop.ini',
    'readme', 'README', 'CHANGELOG', 'LICENSE',
    'Dockerfile', 'docker-compose',
    '.env.local', '.env.production', '.env.development',
]

# Métodos HTTP permitidos para um site estático
ALLOWED_METHODS = {'GET', 'HEAD'}

# =====================================================
# ESTADO GLOBAL (em memória — só para dev local)
# =====================================================
ip_requests: dict = defaultdict(list)  # IP -> lista de timestamps
ip_blocked:  dict = {}                 # IP -> timestamp do bloqueio

# =====================================================
# LOGGING
# =====================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('adega-security')


def log_suspicious(ip: str, reason: str, path: str = '') -> None:
    """Registra atividade suspeita no console."""
    # NUNCA logar senha, token, cartão ou segredo
    safe_path = path[:120] if path else ''
    log.warning(f"SUSPEITO | ip={ip} | motivo={reason} | path={safe_path}")


# =====================================================
# RATE LIMITING
# =====================================================
def is_rate_limited(ip: str) -> bool:
    now = time.monotonic()

    # IP está em bloqueio ativo?
    if ip in ip_blocked:
        elapsed = now - ip_blocked[ip]
        if elapsed < RATE_LIMIT_BLOCK:
            return True
        # Bloqueio expirou — limpar
        del ip_blocked[ip]
        ip_requests.pop(ip, None)

    # Filtrar requisições antigas fora da janela
    ip_requests[ip] = [t for t in ip_requests[ip] if now - t < RATE_LIMIT_WINDOW]
    ip_requests[ip].append(now)

    count = len(ip_requests[ip])
    if count > RATE_LIMIT_MAX:
        ip_blocked[ip] = now
        log_suspicious(ip,
            f"RATE_LIMIT ({count}/{RATE_LIMIT_WINDOW}s) "
            f"— bloqueado por {RATE_LIMIT_BLOCK}s")
        return True

    return False


# =====================================================
# VERIFICAÇÃO DE PATH
# =====================================================
def is_blocked_path(path: str) -> bool:
    p = path.lower().split('?')[0]  # ignorar query string
    for pattern in BLOCKED_PATH_PATTERNS:
        if pattern.lower() in p:
            return True
    return False


def has_path_traversal(path: str) -> bool:
    decoded = path.replace('%2e', '.').replace('%2f', '/').replace('%5c', '\\')
    return '..' in decoded or '\\' in decoded


# =====================================================
# HANDLER SEGURO
# =====================================================
class SecureHandler(http.server.SimpleHTTPRequestHandler):

    # --- Suprimir banner "Server: BaseHTTP/0.6 Python/3.x" ---
    server_version = ''
    sys_version    = ''

    def version_string(self) -> str:
        return ''  # header Server: vazio — não vaza tecnologia

    # --- Silenciar log padrão (usamos o nosso) ---
    def log_message(self, fmt, *args) -> None:
        pass

    # ---- Headers de Segurança ----
    def _send_security_headers(self) -> None:
        """
        Proteção contra:
          - Clickjacking            → X-Frame-Options + frame-ancestors
          - MIME sniffing           → X-Content-Type-Options
          - Info leakage            → Referrer-Policy
          - Feature abuse           → Permissions-Policy
          - XSS (parcial)           → Content-Security-Policy
          - MITM downgrade          → Strict-Transport-Security
          - Cross-origin leakage    → CORP / COOP
          - CORS irrestrito         → Access-Control-Allow-Origin restrito
        """
        h = self.send_header

        h('X-Frame-Options', 'DENY')
        h('X-Content-Type-Options', 'nosniff')
        h('Referrer-Policy', 'strict-origin-when-cross-origin')
        h('Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
        h('Cross-Origin-Opener-Policy',   'same-origin')
        h('Cross-Origin-Resource-Policy', 'same-origin')
        h('Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload')

        # CORS — apenas origem local em dev
        h('Access-Control-Allow-Origin', f'http://localhost:{PORT}')

        # CSP — balanceia segurança com os CDNs que o site usa
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' "
                "https://cdn.tailwindcss.com "
                "https://unpkg.com "
                "https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' "
                "https://fonts.googleapis.com "
                "https://unpkg.com "
                "https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "frame-src https://www.google.com; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self' https://wa.me https://api.whatsapp.com; "
            "frame-ancestors 'none';"
        )
        h('Content-Security-Policy', csp)

        # Cache — sem armazenamento em dev
        h('Cache-Control', 'no-store, no-cache, must-revalidate')
        h('Pragma',  'no-cache')
        h('Expires', '0')

    def end_headers(self) -> None:
        self._send_security_headers()
        super().end_headers()

    # ---- Resposta genérica de bloqueio (sem vazar detalhes) ----
    def _block(self, code: int) -> None:
        body = b'Access Denied'
        self.send_response(code)
        self.send_header('Content-Type',   'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._send_security_headers()
        self.end_headers()
        try:
            self.wfile.write(body)
        except Exception:
            pass

    # ---- Bloquear métodos não usados num site estático ----
    def do_POST(self):    self._reject_method()
    def do_PUT(self):     self._reject_method()
    def do_DELETE(self):  self._reject_method()
    def do_PATCH(self):   self._reject_method()
    def do_TRACE(self):   self._reject_method()
    def do_OPTIONS(self): self._reject_method()
    def do_CONNECT(self): self._reject_method()

    def _reject_method(self) -> None:
        ip = self.client_address[0]
        log_suspicious(ip, f'METODO_BLOQUEADO={self.command}', self.path)
        self._block(405)

    # ---- GET e HEAD — com todas as verificações ----
    def do_GET(self):  self._handle('GET')
    def do_HEAD(self): self._handle('HEAD')

    def _handle(self, method: str) -> None:
        ip   = self.client_address[0]
        path = self.path

        # 1. Rate limiting
        if is_rate_limited(ip):
            self._block(429)
            return

        # 2. URL excessivamente longa (scanner / fuzzer)
        if len(path) > 512:
            log_suspicious(ip, f'URL_LONGA len={len(path)}')
            self._block(414)
            return

        # 3. Path traversal
        if has_path_traversal(path):
            log_suspicious(ip, 'PATH_TRAVERSAL', path)
            self._block(400)
            return

        # 4. Paths sensíveis
        if is_blocked_path(path):
            log_suspicious(ip, 'PATH_SENSIVEL', path)
            self._block(404)   # 404, não 403, para não confirmar existência
            return

        # 5. Servir arquivo normalmente — nunca vazar exceção
        try:
            if method == 'GET':
                super().do_GET()
            else:
                super().do_HEAD()
        except BrokenPipeError:
            pass   # cliente fechou conexão — normal
        except Exception:
            # Nunca vazar stack trace para o cliente
            self._block(500)


# =====================================================
# INICIAR SERVIDOR
# =====================================================
def run_server() -> None:
    import webbrowser
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(('', PORT), SecureHandler) as httpd:
            print('=' * 58)
            print('  Adega Imperial — Servidor Local')
            print(f'  http://localhost:{PORT}')
            print('=' * 58)
            print(f'  Rate limit : {RATE_LIMIT_MAX} req/{RATE_LIMIT_WINDOW}s por IP')
            print(f'  Paths bloq.: {len(BLOCKED_PATH_PATTERNS)} padrões')
            print(f'  Seg. headers: ATIVOS')
            print(f'  Banner versão: OCULTO')
            print('=' * 58)
            print('  Pressione CTRL+C para parar.')
            webbrowser.open(f'http://localhost:{PORT}')
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n  Servidor parado.')
        sys.exit(0)
    except Exception as e:
        log.error(f'Erro ao iniciar servidor: {e}')
        sys.exit(1)


if __name__ == '__main__':
    run_server()

