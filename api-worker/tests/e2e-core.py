#!/usr/bin/env python3
"""E2E core (NON-payment) tests for oao_to against local wrangler dev.

Covers auth, links CRUD + IDOR ownership, analytics auth/ownership,
admin role permissions, API keys + scope + revoke cache invalidation,
and a couple of security regressions. Payment/subscription paths live in
tests/e2e-payment.py — this suite deliberately does NOT touch Stripe.

Usage (mirrors e2e-payment.py — same isolated worker + DB):
    cd api-worker
    npx wrangler dev --test-scheduled --port 8787 --persist-to .wrangler/e2e-state &
    python3 tests/e2e-core.py

隔離設計與 e2e-payment.py 相同：worker 與測試都跑在獨立的 .wrangler/e2e-state
D1（migrations 由本腳本自動套用），不碰開發者平常的本地 D1。所有測試資料自己
seed、atexit 清理。JWT 用 HS256 + JWT_SECRET 現簽。

注意（與 e2e-payment.py 同一個坑）：`wrangler d1 execute --json` 會把 SQL NULL
序列化成字串 "null"，本腳本查 DB 時已還原成 Python None。
"""
import base64, hashlib, hmac, json, os, subprocess, sys, time, urllib.error, urllib.request

API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E2E_STATE = os.path.join('.wrangler', 'e2e-state')  # 相對 API_DIR，與 README 啟動指令一致
WORKER = os.environ.get('E2E_WORKER_URL', 'http://localhost:8787')

# 測試用戶（三個角色 + 兩個一般用戶做 IDOR）
USER_A = 'user_e2e_core_a'      # 一般用戶，連結/分析擁有者
USER_B = 'user_e2e_core_b'      # 一般用戶，攻擊者（IDOR）
USER_ADMIN = 'user_e2e_core_admin'       # role=admin
USER_SUPER = 'user_e2e_core_super'       # role=superadmin
ALL_USERS = [USER_A, USER_B, USER_ADMIN, USER_SUPER]

# --- load secrets from .dev.vars（只需要 JWT_SECRET；不碰 Stripe）---
secrets = {}
try:
    for line in open(os.path.join(API_DIR, '.dev.vars')):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            secrets[k.strip()] = v.strip().strip('"')
    JWT_SECRET = secrets['JWT_SECRET']
except (FileNotFoundError, KeyError) as e:
    sys.exit(f'需要 api-worker/.dev.vars 內的 JWT_SECRET（{e}）')

results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(f"{'✅ PASS' if cond else '❌ FAIL'}  {name}" + (f"  [{detail}]" if detail and not cond else ''))

def mint_jwt(user_id, email, role='user'):
    """HS256 JWT，claim 與 middleware/auth.ts 讀取的欄位一致（userId/email/role）。"""
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
    header = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    payload = b64(json.dumps({'userId': user_id, 'email': email, 'role': role,
                              'exp': int(time.time()) + 3600}).encode())
    sig = b64(hmac.new(JWT_SECRET.encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
    return f'{header}.{payload}.{sig}'

def req(method, path, token=None, body=None, raw_authorization=None, headers=None):
    """發一個請求，回 (status, parsed_json_or_text)。

    token：JWT，會包成 `Bearer <token>` 塞進 Authorization。
    raw_authorization：直接當作完整 Authorization header 值（呼叫端自帶 'Bearer ' 前綴，
      用於 API key / 故意畸形的 header）。兩者擇一。
    連 4xx/5xx 也一併吃 HTTPError 回傳，方便斷言狀態碼。
    """
    url = f'{WORKER}{path}'
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        r.add_header('Content-Type', 'application/json')
    if raw_authorization is not None:
        r.add_header('Authorization', raw_authorization)
    elif token:
        r.add_header('Cookie', f'token={token}')
        r.add_header('Origin', 'http://localhost:5173')  # CSRF: state-changing 需允許的 Origin
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            txt = resp.read().decode()
            try:
                return resp.status, json.loads(txt)
            except json.JSONDecodeError:
                return resp.status, txt
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except json.JSONDecodeError:
            return e.code, txt

def d1(sql):
    out = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'oao-to-db', '--local', '--persist-to', E2E_STATE,
         '--json', '--command', sql],
        cwd=API_DIR, capture_output=True, text=True)
    try:
        rows = json.loads(out.stdout)[0]['results']
    except Exception:
        print('D1 ERROR:', out.stdout[-500:], out.stderr[-500:])
        raise
    # wrangler d1 --json 把 SQL NULL 序列化成字串 "null"
    return [{k: (None if v == 'null' else v) for k, v in row.items()} for row in rows]

print('=== Setup: isolated D1 / worker wiring ===')
try:
    urllib.request.urlopen(f'{WORKER}/health', timeout=3).read()
except urllib.error.HTTPError:
    pass  # 有回應即可
except Exception:
    sys.exit(f'本地 worker 未啟動（{WORKER}）：先跑 '
             f'npx wrangler dev --test-scheduled --port 8787 --persist-to {E2E_STATE}')

# 隔離測試 DB 套用 migrations（冪等）
mig = subprocess.run(
    ['npx', 'wrangler', 'd1', 'migrations', 'apply', 'oao-to-db', '--local', '--persist-to', E2E_STATE],
    cwd=API_DIR, capture_output=True, text=True)
if mig.returncode != 0:
    sys.exit(f'migrations apply 失敗：{mig.stdout[-300:]}{mig.stderr[-300:]}')

# --- seed users + credits ---------------------------------------------------
now_ms = int(time.time() * 1000)
reset_at = now_ms + 30 * 86400000

def seed_user(uid, email, role):
    d1(f"INSERT OR REPLACE INTO users (id, email, name, role, created_at) "
       f"VALUES ('{uid}', '{email}', '{uid}', '{role}', {now_ms})")
    # credits row：links/analytics 不需要，但 api-keys 建立與 set-plan 需要
    d1(f"INSERT OR REPLACE INTO credits (id, user_id, balance, purchased_balance, total_purchased, "
       f"total_used, plan_type, monthly_used, monthly_reset_at, created_at, updated_at) "
       f"VALUES ('cred_{uid}', '{uid}', 1000, 0, 0, 0, 'free', 0, {reset_at}, {now_ms}, {now_ms})")

seed_user(USER_A, 'e2e_core_a@test.oao.to', 'user')
seed_user(USER_B, 'e2e_core_b@test.oao.to', 'user')
seed_user(USER_ADMIN, 'e2e_core_admin@test.oao.to', 'admin')
seed_user(USER_SUPER, 'e2e_core_super@test.oao.to', 'superadmin')

TOKEN_A = mint_jwt(USER_A, 'e2e_core_a@test.oao.to', 'user')
TOKEN_B = mint_jwt(USER_B, 'e2e_core_b@test.oao.to', 'user')
TOKEN_ADMIN = mint_jwt(USER_ADMIN, 'e2e_core_admin@test.oao.to', 'admin')
TOKEN_SUPER = mint_jwt(USER_SUPER, 'e2e_core_super@test.oao.to', 'superadmin')

# wiring probe：worker 必須讀到同一個隔離 DB。用 /api/auth/me 驗一趟。
pcode, pbody = req('GET', '/api/auth/me', token=TOKEN_A)
if not (pcode == 200 and isinstance(pbody, dict) and pbody.get('id') == USER_A):
    sys.exit(f'worker 與測試 DB 不同步（/api/auth/me code={pcode} body={pbody}）— '
             f'worker 必須用 --persist-to {E2E_STATE} 啟動')

# 記錄要清掉的 link slug（KV 由建立/刪除 API 自己管，殘留的用 admin delete 收尾）
CREATED_SLUGS = set()

import atexit
def _cleanup():
    # 用 admin API 刪掉測試連結（同時清 KV + D1），避免殘留污染下次執行
    for slug in list(CREATED_SLUGS):
        try:
            req('DELETE', f'/api/admin/links/{slug}', token=TOKEN_SUPER)
        except Exception as e:
            print(f'cleanup warning (link {slug}):', e)
    uid_list = ','.join(f"'{u}'" for u in ALL_USERS)
    # 逐句刪，任一句失敗不影響其餘（audit_logs 先清，users 最後）
    for stmt in [
        f"DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id IN ({uid_list}))",
        f"DELETE FROM support_tickets WHERE user_id IN ({uid_list})",
        f"DELETE FROM audit_logs WHERE user_id IN ({uid_list})",
        f"DELETE FROM api_keys WHERE user_id IN ({uid_list})",
        f"DELETE FROM credit_transactions WHERE user_id IN ({uid_list})",
        f"DELETE FROM link_index WHERE user_id IN ({uid_list})",
        f"DELETE FROM links WHERE user_id IN ({uid_list})",
        f"DELETE FROM credits WHERE user_id IN ({uid_list})",
        f"DELETE FROM users WHERE id IN ({uid_list})",
    ]:
        try:
            d1(stmt)
        except Exception as e:
            print('cleanup warning:', str(e)[:80])
    print('cleanup: core test data removed')
atexit.register(_cleanup)

# ============================================================================
# 1. AUTH — /api/auth/me
# ============================================================================
print('\n=== 1. Auth (/api/auth/me) ===')
code, body = req('GET', '/api/auth/me', token=TOKEN_A)
check('1.1 valid JWT → 200', code == 200, f'code={code}')
check('1.2 valid JWT → 回正確 user', isinstance(body, dict) and body.get('id') == USER_A and body.get('role') == 'user', body)

code, body = req('GET', '/api/auth/me')  # 無 token
check('1.3 no token → 401', code == 401, f'code={code}')

code, body = req('GET', '/api/auth/me', raw_authorization='Bearer garbage.token.value')
check('1.4 garbage token → 401', code == 401, f'code={code}')

# ============================================================================
# 2. LINKS CRUD + OWNERSHIP (IDOR)
# ============================================================================
print('\n=== 2. Links CRUD + ownership (IDOR) ===')
SLUG = f'e2e-core-{now_ms}'
CREATED_SLUGS.add(SLUG)

# anonymous 建立 → 401（requireAuth 攔）
code, body = req('POST', '/api/links', body={'url': 'https://example.com/a', 'slug': SLUG})
check('2.1 anon POST /api/links → 401', code == 401, f'code={code}')

# user A 建立（POST 寫 KV + D1）→ 後端回 201 Created
code, body = req('POST', '/api/links', token=TOKEN_A, body={'url': 'https://example.com/a', 'slug': SLUG, 'title': 'A link'})
check('2.2 user A create link → 2xx (實為 201)', 200 <= code < 300, f'code={code} body={body}')
check('2.3 create 回 slug', isinstance(body, dict) and body.get('slug') == SLUG, body)

# user A 可以 PUT 自己的 link
code, body = req('PUT', f'/api/links/{SLUG}', token=TOKEN_A, body={'title': 'A link edited'})
check('2.4 owner (A) PUT own link → 200', code == 200, f'code={code} body={body}')

# 🔒 IDOR：user B 不能 PUT user A 的 link → 403
code, body = req('PUT', f'/api/links/{SLUG}', token=TOKEN_B, body={'title': 'hijacked by B'})
check('2.5 user B PUT A\'s link → 403 (IDOR blocked)', code == 403, f'code={code} body={body}')

# 確認 B 的 PUT 沒改到資料（title 仍是 A 編輯後的值）
d1_row = d1(f"SELECT title FROM links WHERE slug='{SLUG}'")
check('2.6 B\'s PUT 未污染資料', bool(d1_row) and d1_row[0]['title'] == 'A link edited', d1_row)

# user B 不能刪除 user A 的 link（DELETE 用 D1 WHERE slug+user_id → 查無 → 404）
code, body = req('DELETE', f'/api/links/{SLUG}', token=TOKEN_B)
check('2.7 user B DELETE A\'s link → 404 (not owner)', code == 404, f'code={code} body={body}')

# link 仍存在（B 沒刪掉）
still = d1(f"SELECT COUNT(*) as n FROM links WHERE slug='{SLUG}'")
check('2.8 link 仍存在（B 刪不掉）', still[0]['n'] == 1, still)

# anonymous 不能 PUT → 401
code, body = req('PUT', f'/api/links/{SLUG}', body={'title': 'anon'})
check('2.9 anon PUT → 401', code == 401, f'code={code}')

# owner A 可以刪自己的 link → 200
code, body = req('DELETE', f'/api/links/{SLUG}', token=TOKEN_A)
check('2.10 owner (A) DELETE own link → 200', code == 200, f'code={code} body={body}')

# ============================================================================
# 3. ANALYTICS AUTH / OWNERSHIP
# ============================================================================
print('\n=== 3. Analytics auth/ownership ===')
ASLUG = f'e2e-core-an-{now_ms}'
CREATED_SLUGS.add(ASLUG)
# A 建立一個 link 供分析用（POST 寫入 KV，analytics 由 KV 讀 ownership）
code, _ = req('POST', '/api/links', token=TOKEN_A, body={'url': 'https://example.com/an', 'slug': ASLUG})
check('3.0 setup analytics link created', 200 <= code < 300, f'code={code}')

# 無 token → 401
code, body = req('GET', f'/api/analytics/{ASLUG}')
check('3.1 analytics no token → 401', code == 401, f'code={code}')

# user B 看 user A 的 link 分析 → 404（非擁有者，避免洩漏存在性）
code, body = req('GET', f'/api/analytics/{ASLUG}', token=TOKEN_B)
check('3.2 user B view A\'s analytics → 404 (ownership)', code == 404, f'code={code} body={body}')

# owner A → 200（queryAnalytics 在本地 AE 不可用時回 [] 不拋錯，端點仍 200）
code, body = req('GET', f'/api/analytics/{ASLUG}', token=TOKEN_A)
check('3.3 owner (A) analytics → 200', code == 200, f'code={code} body={body}')
check('3.4 analytics 回正確 slug', isinstance(body, dict) and body.get('slug') == ASLUG, body)

# summary/all 無 token → 401
code, body = req('GET', '/api/analytics/summary/all')
check('3.5 analytics summary/all no token → 401', code == 401, f'code={code}')

# summary/all 有 token → 200
code, body = req('GET', '/api/analytics/summary/all', token=TOKEN_A)
check('3.6 analytics summary/all with token → 200', code == 200, f'code={code}')

# 清掉分析用 link
req('DELETE', f'/api/links/{ASLUG}', token=TOKEN_A)

# ============================================================================
# 4. ADMIN PERMISSIONS
# ============================================================================
print('\n=== 4. Admin permissions ===')
# user 角色打 admin 端點 → 403
code, body = req('GET', '/api/admin/users', token=TOKEN_A)
check('4.1 user role GET /api/admin/users → 403', code == 403, f'code={code} body={body}')

# admin 角色 → 200
code, body = req('GET', '/api/admin/users', token=TOKEN_ADMIN)
check('4.2 admin role GET /api/admin/users → 200', code == 200, f'code={code}')
check('4.3 admin users 回 list', isinstance(body, dict) and 'users' in body, list(body.keys()) if isinstance(body, dict) else body)

# set-plan 需要 superadmin：admin（非 superadmin）→ 403
code, body = req('POST', f'/api/admin/users/{USER_B}/set-plan', token=TOKEN_ADMIN,
                 body={'planType': 'starter', 'billingPeriod': 'monthly'})
check('4.4 admin (non-super) set-plan → 403', code == 403, f'code={code} body={body}')

# superadmin → 200
code, body = req('POST', f'/api/admin/users/{USER_B}/set-plan', token=TOKEN_SUPER,
                 body={'planType': 'starter', 'billingPeriod': 'monthly'})
check('4.5 superadmin set-plan → 200', code == 200, f'code={code} body={body}')
# 確認真的改了 plan
prow = d1(f"SELECT plan_type FROM credits WHERE user_id='{USER_B}'")
check('4.6 set-plan 實際寫入 (plan_type=starter)', bool(prow) and prow[0]['plan_type'] == 'starter', prow)
# 還原 B 的方案，避免影響其他斷言
req('POST', f'/api/admin/users/{USER_B}/set-plan', token=TOKEN_SUPER, body={'planType': 'free'})

# ============================================================================
# 5. API KEY + SCOPE + REVOKE CACHE INVALIDATION
# ============================================================================
print('\n=== 5. API key + scope + revoke ===')
# 建立一把只有 links:read 的 key
code, body = req('POST', '/api/account/keys', token=TOKEN_A,
                 body={'name': 'e2e-core-readonly', 'scopes': ['links:read']})
check('5.1 create API key → 201', code == 201, f'code={code} body={body}')
api_key = body.get('data', {}).get('key') if isinstance(body, dict) else None
key_id = body.get('data', {}).get('id') if isinstance(body, dict) else None
check('5.2 回傳 key 值 (只此一次)', bool(api_key) and api_key.startswith('oao_'), api_key)

# 用 key 打 GET /v1/links（需要 links:read）→ 200
code, body = req('GET', '/v1/links', raw_authorization=f'Bearer {api_key}')
check('5.3 read-scope key GET /v1/links → 200', code == 200, f'code={code} body={body}')

# 缺 Authorization → 401
code, body = req('GET', '/v1/links')
check('5.4 v1 no Authorization → 401', code == 401, f'code={code}')

# 格式錯誤的 key → 401
code, body = req('GET', '/v1/links', raw_authorization='Bearer oao_bogus_key')
check('5.5 malformed key → 401', code == 401, f'code={code}')

# scope 強制：只有 links:read 的 key 打需要 links:write 的 POST /v1/links → 403
code, body = req('POST', '/v1/links', raw_authorization=f'Bearer {api_key}',
                 body={'url': 'https://example.com/should-fail'})
check('5.6 read-only key POST /v1/links → 403 (scope enforced)', code == 403, f'code={code} body={body}')

# 停用/重啟用（PUT is_active，前端 dashboard 開關走這條）→ 必須立即生效
# 此刻快取是熱的（5.6 剛用過 key）；PUT 端點若沒清 apikey:cache，停用的 key 在 TTL 內仍可用
code, body = req('PUT', f'/api/account/keys/{key_id}', token=TOKEN_A, body={'is_active': False})
check('5.7 toggle off (snake_case is_active) → 200', code == 200, f'code={code} body={body}')
code, body = req('GET', '/v1/links', raw_authorization=f'Bearer {api_key}')
check('5.8 deactivated key rejected immediately → 401 (cache invalidated on toggle)', code == 401,
      f'code={code}（若為 200 表示 PUT 沒清 apikey:cache）')
code, body = req('PUT', f'/api/account/keys/{key_id}', token=TOKEN_A, body={'is_active': True})
check('5.9 toggle back on → 200', code == 200, f'code={code}')
code, body = req('GET', '/v1/links', raw_authorization=f'Bearer {api_key}')
check('5.10 reactivated key works immediately → 200', code == 200, f'code={code} body={body}')

# 撤銷（delete）key → DELETE 端點會立即清 KV 快取，撤銷後應被拒
code, body = req('DELETE', f'/api/account/keys/{key_id}', token=TOKEN_A)
check('5.11 delete API key → 200', code == 200, f'code={code}')
code, body = req('GET', '/v1/links', raw_authorization=f'Bearer {api_key}')
# DELETE 端點主動清了 apikey:cache:<hash>，所以不在 TTL 窗口內，應直接 401
check('5.12 deleted key rejected → 401 (cache invalidated on delete)', code == 401,
      f'code={code}（若為 200 表示 5 分鐘快取 TTL 尚未清除）')

# ============================================================================
# 6. SECURITY REGRESSIONS
# ============================================================================
print('\n=== 6. Security regressions ===')
# /test-list 已移除 → 落到 catch-all /:slug，KV miss → 404
code, body = req('GET', '/test-list')
check('6.1 GET /test-list → 404 (removed)', code == 404, f'code={code} body={body}')

# summary/all 無 auth → 401（再次確認 regression）
code, body = req('GET', '/api/analytics/summary/all')
check('6.2 analytics summary/all no auth → 401', code == 401, f'code={code}')

# ============================================================================
# 7. SUPPORT TICKETS（用戶端建單/回覆 + admin 端處理 + IDOR）
# ============================================================================
print('\n=== 7. Support tickets ===')

# anonymous 建單 → 401
code, body = req('POST', '/api/support/tickets', body={'subject': 'x', 'message': 'y'})
check('7.1 anonymous create ticket → 401', code == 401, f'code={code}')

# user A 建單 → 201 + id
code, body = req('POST', '/api/support/tickets', token=TOKEN_A,
                 body={'subject': 'E2E ticket', 'message': 'Something is broken', 'category': 'technical'})
ticket_id = (body.get('data') or {}).get('id')
check('7.2 user A create ticket → 201 with id', code == 201 and bool(ticket_id), f'code={code} body={body}')

# 缺 message → 400
code, body = req('POST', '/api/support/tickets', token=TOKEN_A, body={'subject': 'no message'})
check('7.3 create without message → 400', code == 400, f'code={code}')

# A 列表看得到自己的單
code, body = req('GET', '/api/support/tickets', token=TOKEN_A)
ids = [t['id'] for t in (body.get('data') or {}).get('tickets', [])]
check('7.4 A list contains own ticket', code == 200 and ticket_id in ids, f'code={code} ids={ids[:3]}')

# A 詳情 → description 正確
code, body = req('GET', f'/api/support/tickets/{ticket_id}', token=TOKEN_A)
desc = ((body.get('data') or {}).get('ticket') or {}).get('description')
check('7.5 A detail → 200 with description', code == 200 and desc == 'Something is broken', f'code={code} desc={desc}')

# 🔒 IDOR：B 看不到 A 的單 → 404
code, body = req('GET', f'/api/support/tickets/{ticket_id}', token=TOKEN_B)
check('7.6 IDOR: B cannot read A ticket → 404', code == 404, f'code={code}')

# 🔒 IDOR：B 不能回覆 A 的單 → 404
code, body = req('POST', f'/api/support/tickets/{ticket_id}/reply', token=TOKEN_B, body={'message': 'hijack'})
check('7.7 IDOR: B cannot reply to A ticket → 404', code == 404, f'code={code}')

# A 自己回覆 → 200
code, body = req('POST', f'/api/support/tickets/{ticket_id}/reply', token=TOKEN_A, body={'message': 'More details here'})
check('7.8 A reply own ticket → 200', code == 200, f'code={code} body={body}')

# admin 列表看得到這張單（/api/admin/support）
code, body = req('GET', '/api/admin/support/tickets', token=TOKEN_ADMIN)
admin_ids = [t['id'] for t in (body.get('data') or {}).get('tickets', [])]
check('7.9 admin list sees ticket', code == 200 and ticket_id in admin_ids, f'code={code}')

# admin 回覆 → 200
code, body = req('POST', f'/api/admin/support/tickets/{ticket_id}/reply', token=TOKEN_ADMIN, body={'message': 'We are on it'})
check('7.10 admin reply → 200', code == 200, f'code={code} body={body}')

# A 詳情看到兩則訊息（user + admin）
code, body = req('GET', f'/api/support/tickets/{ticket_id}', token=TOKEN_A)
msgs = (body.get('data') or {}).get('messages', [])
roles = [m['user_role'] for m in msgs]
check('7.11 A sees both messages (user+admin)', code == 200 and roles == ['user', 'admin'], f'code={code} roles={roles}')

# admin 標記 resolved → A 回覆 → 自動重開 open
code, body = req('PUT', f'/api/admin/support/tickets/{ticket_id}', token=TOKEN_ADMIN, body={'status': 'resolved'})
check('7.12 admin resolve → 200', code == 200, f'code={code}')
code, body = req('POST', f'/api/support/tickets/{ticket_id}/reply', token=TOKEN_A, body={'message': 'still broken!'})
new_status = (body.get('data') or {}).get('status')
check('7.13 user reply reopens resolved ticket', code == 200 and new_status == 'open', f'code={code} status={new_status}')

# admin 關單 → A 不能再回覆 → 400
code, body = req('PUT', f'/api/admin/support/tickets/{ticket_id}', token=TOKEN_ADMIN, body={'status': 'closed'})
check('7.14 admin close → 200', code == 200, f'code={code}')
code, body = req('POST', f'/api/support/tickets/{ticket_id}/reply', token=TOKEN_A, body={'message': 'reply after close'})
check('7.15 reply to closed ticket → 400', code == 400, f'code={code}')

# 一般 user 摸不到 admin support 端點 → 403
code, body = req('GET', '/api/admin/support/tickets', token=TOKEN_A)
check('7.16 user cannot access admin ticket list → 403', code == 403, f'code={code}')

# --- email inbound 建單（mailhandler service token）---
INBOUND_TOKEN = secrets.get('INBOUND_TICKET_TOKEN', '')

# 無 token → 401
code, body = req('POST', '/api/support/inbound', body={'from_email': 'e2e_core_a@test.oao.to', 'message': 'x'})
check('7.17 inbound without token → 401', code == 401, f'code={code}')

# 有 token + 已註冊寄件者 → 201
code, body = req('POST', '/api/support/inbound',
                 headers={'X-Inbound-Token': INBOUND_TOKEN},
                 body={'from_email': 'E2E_Core_A@test.oao.to', 'subject': 'Email ticket', 'message': 'from email', 'category': 'billing'})
inbound_id = (body.get('data') or {}).get('id')
check('7.18 inbound known sender (case-insensitive) → 201', code == 201 and bool(inbound_id), f'code={code} body={body}')

# 建出來的單 A 自己看得到
code, body = req('GET', f'/api/support/tickets/{inbound_id}', token=TOKEN_A)
cat = ((body.get('data') or {}).get('ticket') or {}).get('category')
check('7.19 inbound ticket visible to owner with category', code == 200 and cat == 'billing', f'code={code} cat={cat}')

# 未註冊寄件者 → 404
code, body = req('POST', '/api/support/inbound',
                 headers={'X-Inbound-Token': INBOUND_TOKEN},
                 body={'from_email': 'stranger@nowhere.example', 'message': 'hello'})
check('7.20 inbound unknown sender → 404', code == 404, f'code={code}')

# ============================================================================
print('\n========================================')
passed = sum(1 for _, ok, _ in results if ok)
print(f'RESULT: {passed}/{len(results)} passed')
for name, ok, detail in results:
    if not ok:
        print(f'  FAILED: {name} [{detail}]')
sys.exit(0 if passed == len(results) else 1)
