#!/usr/bin/env python3
"""E2E payment flow tests for oao_to against local wrangler dev + Stripe test mode.

Usage (see tests/README.md):
    npx wrangler dev --test-scheduled --port 8787 --persist-to .wrangler/e2e-state &
    python3 tests/e2e-payment.py

完全隔離：worker 與測試都跑在獨立的 .wrangler/e2e-state D1（migrations 由本
腳本自動套用），不會碰開發者平常的本地 D1 資料 — 這很重要，因為 cron 測試
（/__scheduled）會觸發全表掃描的配額重置。Stripe 物件建立在 test mode，
結束時自動刪除；D1 測試資料 atexit 清理。
"""
import base64, hashlib, hmac, json, os, subprocess, sys, time, urllib.parse, urllib.request

API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E2E_STATE = os.path.join('.wrangler', 'e2e-state')  # 相對 API_DIR，與 README 的啟動指令一致
WORKER = os.environ.get('E2E_WORKER_URL', 'http://localhost:8787')
USER = 'user_e2e_test'

# --- load secrets from .dev.vars ---
secrets = {}
try:
    for line in open(os.path.join(API_DIR, '.dev.vars')):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            secrets[k.strip()] = v.strip().strip('"')
    SK = secrets['STRIPE_SECRET_KEY_TEST']
    WHSEC = secrets['STRIPE_WEBHOOK_SECRET_TEST']
except (FileNotFoundError, KeyError) as e:
    sys.exit(f'需要 api-worker/.dev.vars 內的 STRIPE_SECRET_KEY_TEST + STRIPE_WEBHOOK_SECRET_TEST（{e}）')
if not SK.startswith('sk_test_'):
    sys.exit('拒絕執行：STRIPE_SECRET_KEY_TEST 不是 test mode key（sk_test_ 開頭）')

results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(f"{'✅ PASS' if cond else '❌ FAIL'}  {name}" + (f"  [{detail}]" if detail and not cond else ''))

def stripe_api(method, path, params=None):
    url = f'https://api.stripe.com/v1/{path}'
    data = urllib.parse.urlencode(params or {}).encode() if params else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {SK}')
    if data:
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = json.load(e)
        raise RuntimeError(f"Stripe {method} {path}: {body.get('error', {}).get('message')}")

def send_event(event_type, obj, event_id=None):
    payload = json.dumps({
        'id': event_id or f'evt_e2e_{int(time.time()*1000)}_{event_type.replace(".", "_")}',
        'object': 'event', 'api_version': '2024-11-20.acacia',
        'type': event_type, 'created': int(time.time()),
        'data': {'object': obj},
    })
    ts = int(time.time())
    sig = hmac.new(WHSEC.encode(), f'{ts}.{payload}'.encode(), hashlib.sha256).hexdigest()
    req = urllib.request.Request(f'{WORKER}/api/webhook/stripe', data=payload.encode(), method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('stripe-signature', f't={ts},v1={sig}')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)

def d1(sql):
    out = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'oao-to-db', '--local', '--persist-to', E2E_STATE,
         '--json', '--command', sql],
        cwd=API_DIR, capture_output=True, text=True)
    try:
        return json.loads(out.stdout)[0]['results']
    except Exception:
        print('D1 ERROR:', out.stdout[-500:], out.stderr[-500:])
        raise

def credits_row():
    row = d1(f"SELECT plan_type, plan_override, billing_period, balance, monthly_used, overage_used, monthly_reset_at, subscription_status, stripe_subscription_id, cancel_at_period_end, scheduled_plan_change, subscription_current_period_end FROM credits WHERE user_id='{USER}'")[0]
    # wrangler d1 --json 把 SQL NULL 序列化成字串 "null"
    return {k: (None if v == 'null' else v) for k, v in row.items()}

print('=== Setup: isolated D1 / worker wiring / price mapping ===')
try:
    urllib.request.urlopen(f'{WORKER}/', timeout=3)
except urllib.error.HTTPError:
    pass  # 404 = worker 有回應
except Exception:
    sys.exit(f'本地 worker 未啟動（{WORKER}）：先跑 npx wrangler dev --test-scheduled --port 8787 --persist-to {E2E_STATE}')

# 隔離測試 DB 套用 migrations（冪等）
mig = subprocess.run(
    ['npx', 'wrangler', 'd1', 'migrations', 'apply', 'oao-to-db', '--local', '--persist-to', E2E_STATE],
    cwd=API_DIR, capture_output=True, text=True)
if mig.returncode != 0:
    sys.exit(f'migrations apply 失敗：{mig.stdout[-300:]}{mig.stderr[-300:]}')

def mint_jwt(user_id, email, role='user'):
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
    header = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    payload = b64(json.dumps({'userId': user_id, 'email': email, 'role': role,
                              'exp': int(time.time()) + 3600}).encode())
    sig = b64(hmac.new(secrets['JWT_SECRET'].encode(), f'{header}.{payload}'.encode(), hashlib.sha256).digest())
    return f'{header}.{payload}.{sig}'

# 從 DB 取 price mapping（migration 0007 種的），不硬編 price id
mapping = {f"{r['plan_type']}_{r['billing_period']}": r['stripe_price_id']
           for r in d1('SELECT plan_type, billing_period, stripe_price_id FROM stripe_price_mapping')}
try:
    PRICE_STARTER_M = mapping['starter_monthly']
    PRICE_PRO_M = mapping['pro_monthly']
except KeyError:
    sys.exit('stripe_price_mapping 缺 starter/pro monthly — 先套用 migrations（--local）')

# seed 測試用戶（可重複執行）。balance 用每次執行都不同的 nonce，
# 讓 wiring probe 無法被殘留在「非隔離 DB」裡的舊測試資料騙過
import random
RUN_NONCE = random.SystemRandom().randint(100000, 999999)
d1(f"DELETE FROM credit_transactions WHERE user_id='{USER}'; "
   f"DELETE FROM stripe_events WHERE stripe_event_id LIKE 'evt_e2e%'; "
   f"INSERT OR REPLACE INTO users (id, email, name, role, created_at) VALUES ('{USER}', 'e2e@test.oao.to', 'E2E Tester', 'user', {int(time.time()*1000)}); "
   f"INSERT OR REPLACE INTO credits (id, user_id, balance, purchased_balance, total_purchased, total_used, plan_type, monthly_used, monthly_reset_at, created_at, updated_at) "
   f"VALUES ('cred_e2e_test', '{USER}', {RUN_NONCE}, 0, 0, 0, 'free', 40, {int(time.time()*1000) + 30*86400000}, {int(time.time()*1000)}, {int(time.time()*1000)})")

# 驗證 worker 讀的是同一個隔離 DB：balance 必須等於本次執行的 nonce。
# worker 沒帶 --persist-to、或接到殘留舊資料的非隔離 DB，都會在這裡被擋下
probe = urllib.request.Request(f'{WORKER}/api/account/credits')
probe.add_header('Cookie', f'token={mint_jwt(USER, "e2e@test.oao.to")}')
try:
    with urllib.request.urlopen(probe, timeout=5) as r:
        probe_data = json.load(r)['data']
    assert probe_data['balance']['total'] == RUN_NONCE and probe_data['plan']['type'] == 'free'
except Exception as e:
    sys.exit(f'worker 與測試 DB 不同步（{e}）— worker 必須用 --persist-to {E2E_STATE} 啟動')

import atexit
_cleanup_state = {}
def _cleanup():
    d1(f"DELETE FROM credit_transactions WHERE user_id IN ('{USER}', 'user_e2e_test2'); "
       f"DELETE FROM stripe_events WHERE stripe_event_id LIKE 'evt_e2e%'; "
       f"DELETE FROM api_keys WHERE user_id='{USER}'; "
       f"DELETE FROM promo_code_usage WHERE promo_code_id='promo_e2e_1'; "
       f"DELETE FROM promo_codes WHERE id='promo_e2e_1'; "
       f"DELETE FROM credits WHERE user_id IN ('{USER}', 'user_e2e_test2'); "
       f"DELETE FROM users WHERE id IN ('{USER}', 'user_e2e_test2')")
    if _cleanup_state.get('customer'):
        try:
            stripe_api('DELETE', f"customers/{_cleanup_state['customer']}")  # 一併取消其下訂閱
        except Exception as e:
            print('cleanup warning (stripe):', e)
    if _cleanup_state.get('unmapped_product'):
        try:
            # archive 整個測試 product（default price 不能單獨 archive）
            stripe_api('POST', f"products/{_cleanup_state['unmapped_product']}", {'active': 'false'})
        except Exception as e:
            print('cleanup warning (product):', e)
    print('cleanup: test data removed')
atexit.register(_cleanup)

print('\n=== Setup: create Stripe test customer + subscription (starter monthly) ===')
cus = stripe_api('POST', 'customers', {'email': 'e2e@test.oao.to', 'name': 'E2E Tester'})
_cleanup_state['customer'] = cus['id']
pm = stripe_api('POST', f'payment_methods/pm_card_visa/attach', {'customer': cus['id']})
stripe_api('POST', f'customers/{cus["id"]}', {'invoice_settings[default_payment_method]': pm['id']})
sub = stripe_api('POST', 'subscriptions', {'customer': cus['id'], 'items[0][price]': PRICE_STARTER_M})
print(f"customer={cus['id']} subscription={sub['id']} status={sub['status']}")

# --- A. checkout.session.completed ---
print('\n=== A. Checkout completed → starter activation（含未付款 gate）===')
session = {
    'id': 'cs_e2e_test_001', 'object': 'checkout.session', 'mode': 'subscription',
    'customer': cus['id'], 'subscription': sub['id'], 'amount_total': 900,
    'payment_status': 'unpaid',
    'metadata': {'user_id': USER, 'plan_type': 'starter', 'billing_period': 'monthly'},
}
# 延遲付款：completed 但 payment_status=unpaid → 不得發貨
code, _ = send_event('checkout.session.completed', session, 'evt_e2e_checkout_0')
row = credits_row()
check('A0 未付款不發貨（plan 仍 free）', row['plan_type'] == 'free', row['plan_type'])
# 錢到帳：async_payment_succeeded（payment_status=paid）→ 發貨
session['payment_status'] = 'paid'
code, _ = send_event('checkout.session.async_payment_succeeded', session, 'evt_e2e_checkout_1')
row = credits_row()
check('A1 webhook 200', code == 200, f'code={code}')
check('A2 plan_type=starter', row['plan_type'] == 'starter', row['plan_type'])
check('A3 status=active', row['subscription_status'] == 'active', row['subscription_status'])
check('A4 sub id stored', row['stripe_subscription_id'] == sub['id'])
balance_after_checkout = row['balance']

# --- B. idempotency: same event id, then new event id + same session ---
print('\n=== B. Idempotency (replay + duplicate delivery) ===')
code, _ = send_event('checkout.session.completed', session, 'evt_e2e_checkout_1')  # same evt id
row1 = credits_row()
code2, _ = send_event('checkout.session.completed', session, 'evt_e2e_checkout_1b')  # new evt id, same session
row2 = credits_row()
txns = d1(f"SELECT COUNT(*) as n FROM credit_transactions WHERE id='trans_sub_cs_e2e_test_001'")[0]['n']
check('B1 replay same event id: balance unchanged', row1['balance'] == balance_after_checkout, row1['balance'])
check('B2 duplicate delivery: balance unchanged', row2['balance'] == balance_after_checkout, row2['balance'])
check('B3 exactly one activation txn', txns == 1, txns)

# --- C. upgrade starter→pro via real Stripe update + subscription.updated ---
print('\n=== C. Upgrade starter→pro (the old C3 bug) ===')
item_id = sub['items']['data'][0]['id']
stripe_api('POST', f'subscriptions/{sub["id"]}', {'items[0][id]': item_id, 'items[0][price]': PRICE_PRO_M, 'proration_behavior': 'none'})
code, _ = send_event('customer.subscription.updated', {'id': sub['id'], 'object': 'subscription'})
row = credits_row()
check('C1 webhook 200', code == 200, f'code={code}')
check('C2 plan_type=pro (sync applied upgrade)', row['plan_type'] == 'pro', row['plan_type'])
check('C3 billing_period=monthly', row['billing_period'] == 'monthly', row['billing_period'])

# --- D. scheduled downgrade pro→starter via subscription schedule ---
print('\n=== D. Scheduled downgrade pro→starter (schedule future phase) ===')
sched = stripe_api('POST', 'subscription_schedules', {'from_subscription': sub['id']})
cur = sched['phases'][0]
future_start = cur['end_date']
stripe_api('POST', f'subscription_schedules/{sched["id"]}', {
    'phases[0][items][0][price]': PRICE_PRO_M, 'phases[0][start_date]': cur['start_date'], 'phases[0][end_date]': cur['end_date'],
    'phases[1][items][0][price]': PRICE_STARTER_M, 'phases[1][start_date]': future_start,
})
code, _ = send_event('subscription_schedule.updated', {'id': sched['id'], 'object': 'subscription_schedule', 'subscription': sub['id']})
row = credits_row()
sc = json.loads(row['scheduled_plan_change']) if row['scheduled_plan_change'] else None
check('D1 webhook 200', code == 200, f'code={code}')
check('D2 plan stays pro until effective', row['plan_type'] == 'pro', row['plan_type'])
check('D3 scheduled change recorded', sc is not None)
check('D4 toPlan=starter', sc and sc.get('toPlan') == 'starter', sc and sc.get('toPlan'))
check('D5 toPrice=900 (not old-plan price)', sc and sc.get('toPrice') == 900, sc and sc.get('toPrice'))
check('D6 type=downgrade', sc and sc.get('type') == 'downgrade', sc and sc.get('type'))

# --- E. downgrade actually applies (simulate phase transition: sub now carries starter price) ---
print('\n=== E. Downgrade applies at phase transition (the old C1/design bug) ===')
stripe_api('POST', f'subscription_schedules/{sched["id"]}/release')
sub2 = stripe_api('POST', f'subscriptions/{sub["id"]}', {'items[0][id]': item_id, 'items[0][price]': PRICE_STARTER_M, 'proration_behavior': 'none'})
d1(f"UPDATE credits SET monthly_used = 5000 WHERE user_id='{USER}'")  # used 5000 of pro's 10000
code, _ = send_event('customer.subscription.updated', {'id': sub['id'], 'object': 'subscription'})
row = credits_row()
check('E1 webhook 200', code == 200, f'code={code}')
check('E2 plan_type=starter (downgrade APPLIED)', row['plan_type'] == 'starter', row['plan_type'])
check('E3 scheduled_plan_change cleared', not row['scheduled_plan_change'], row['scheduled_plan_change'])
check('E4 monthly_used capped to starter quota 1000', row['monthly_used'] == 1000, row['monthly_used'])

# --- F. cancel at period end → scheduled cancel ---
print('\n=== F. Cancel at period end → scheduled cancel state ===')
stripe_api('POST', f'subscriptions/{sub["id"]}', {'cancel_at_period_end': 'true'})
code, _ = send_event('customer.subscription.updated', {'id': sub['id'], 'object': 'subscription'})
row = credits_row()
sc = json.loads(row['scheduled_plan_change']) if row['scheduled_plan_change'] else None
check('F1 plan stays starter', row['plan_type'] == 'starter', row['plan_type'])
check('F2 cancel_at_period_end=1', row['cancel_at_period_end'] == 1, row['cancel_at_period_end'])
check('F3 scheduled type=cancel', sc and sc.get('type') == 'cancel', sc and sc.get('type'))

# --- G. actual deletion → free downgrade with full reset ---
print('\n=== G. subscription.deleted → free + full reset ===')
stripe_api('DELETE', f'subscriptions/{sub["id"]}')
code, _ = send_event('customer.subscription.deleted', {'id': sub['id'], 'object': 'subscription'})
row = credits_row()
check('G1 webhook 200', code == 200, f'code={code}')
check('G2 plan_type=free', row['plan_type'] == 'free', row['plan_type'])
check('G3 monthly_used reset 0', row['monthly_used'] == 0, row['monthly_used'])
check('G4 status=canceled', row['subscription_status'] == 'canceled', row['subscription_status'])
check('G5 period end cleared', row['subscription_current_period_end'] is None, row['subscription_current_period_end'])
check('G6 scheduled change cleared', not row['scheduled_plan_change'])

# --- H. credits purchase + idempotency + amount tampering ---
print('\n=== H. One-time credits purchase ===')
bal0 = credits_row()['balance']
psession = {'id': 'cs_e2e_credits_001', 'object': 'checkout.session', 'mode': 'payment',
            'customer': cus['id'], 'amount_total': 1000, 'payment_status': 'paid',
            'payment_intent': 'pi_e2e_credits',
            'metadata': {'user_id': USER, 'purchase_type': 'credits', 'credits_amount': '1000'}}
code, _ = send_event('checkout.session.completed', psession, 'evt_e2e_credits_1')
bal1 = credits_row()['balance']
code2, _ = send_event('checkout.session.completed', psession, 'evt_e2e_credits_2')  # dup delivery
bal2 = credits_row()['balance']
bad = dict(psession, id='cs_e2e_credits_002', amount_total=1)  # tampered/mismatched amount
code3, _ = send_event('checkout.session.completed', bad, 'evt_e2e_credits_3')
bal3 = credits_row()['balance']
check('H1 credits +1000', bal1 == bal0 + 1000, f'{bal0}->{bal1}')
check('H2 duplicate delivery: no double credit', bal2 == bal1, bal2)
check('H3 amount mismatch rejected (500)', code3 == 500, f'code={code3}')
check('H4 mismatch: balance unchanged', bal3 == bal2, bal3)

# --- I. invoice.payment_succeeded quota reset + idempotency ---
print('\n=== I. Invoice payment succeeded → quota reset ===')
d1(f"UPDATE credits SET monthly_used = 77, stripe_subscription_id = '{sub['id']}' WHERE user_id='{USER}'")
inv = {'id': 'in_e2e_001', 'object': 'invoice', 'subscription': sub['id'],
       'billing_reason': 'subscription_cycle', 'period_end': int(time.time())}
code, _ = send_event('invoice.payment_succeeded', inv, 'evt_e2e_inv_1')
row = credits_row()
d1(f"UPDATE credits SET monthly_used = 55 WHERE user_id='{USER}'")
code2, _ = send_event('invoice.payment_succeeded', inv, 'evt_e2e_inv_2')  # dup delivery, same invoice
row2 = credits_row()
check('I1 monthly_used reset to 0', row['monthly_used'] == 0, row['monthly_used'])
check('I2 reset_at ~ now+30d', abs(row['monthly_reset_at'] - (time.time()*1000 + 30*86400000)) < 3600000, row['monthly_reset_at'])
check('I3 duplicate invoice: no second reset', row2['monthly_used'] == 55, row2['monthly_used'])

# --- J. payment_failed → past_due ---
print('\n=== J. Invoice payment failed → past_due ===')
code, _ = send_event('invoice.payment_failed', {'id': 'in_e2e_002', 'object': 'invoice', 'subscription': sub['id']})
row = credits_row()
check('J1 status=past_due', row['subscription_status'] == 'past_due', row['subscription_status'])

# --- K. cron quota reset (free/yearly users) ---
print('\n=== K. Cron: monthly quota reset for lapsed anchor ===')
past = int(time.time()*1000) - 86400000
d1(f"UPDATE credits SET monthly_used = 88, monthly_reset_at = {past} WHERE user_id='{USER}'")
req = urllib.request.Request(f'{WORKER}/__scheduled?cron=0+*+*+*+*', method='GET')
urllib.request.urlopen(req).read()
time.sleep(3)  # scheduled handler 的 async D1 寫入需要一點時間落地（本地 miniflare）
row = credits_row()
check('K1 cron reset monthly_used', row['monthly_used'] == 0, row['monthly_used'])
check('K2 anchor advanced +30d', row['monthly_reset_at'] == past + 30*86400000, row['monthly_reset_at'])

# --- L. 續費 SCA 不得撤銷已付費權益（regression: review gate round 6）---
print('\n=== L. Renewal SCA keeps paid entitlement ===')
sub2 = stripe_api('POST', 'subscriptions', {'customer': cus['id'], 'items[0][price]': PRICE_PRO_M})
_cleanup_state['sub2'] = sub2['id']
lsession = {
    'id': 'cs_e2e_test_L', 'object': 'checkout.session', 'mode': 'subscription',
    'customer': cus['id'], 'subscription': sub2['id'], 'amount_total': 2900, 'payment_status': 'paid',
    'metadata': {'user_id': USER, 'plan_type': 'pro', 'billing_period': 'monthly'},
}
send_event('checkout.session.completed', lsession, 'evt_e2e_L_checkout')
code, _ = send_event('invoice.payment_action_required',
                     {'id': 'in_e2e_L', 'object': 'invoice', 'subscription': sub2['id']})
row = credits_row()
check('L1 webhook 200', code == 200, f'code={code}')
check('L2 狀態同步 Stripe 真值（非手寫 incomplete）', row['subscription_status'] != 'incomplete', row['subscription_status'])
check('L3 plan 保持 pro', row['plan_type'] == 'pro', row['plan_type'])

# --- M. 未映射價格 fail-closed ---
print('\n=== M. Unknown price mapping → fail closed ===')
unmapped = stripe_api('POST', 'prices', {
    'unit_amount': 500, 'currency': 'usd', 'recurring[interval]': 'month',
    'product_data[name]': 'E2E Unmapped Price'})
_cleanup_state['unmapped_product'] = unmapped['product']
item2 = sub2['items']['data'][0]['id']
stripe_api('POST', f'subscriptions/{sub2["id"]}', {'items[0][id]': item2, 'items[0][price]': unmapped['id'], 'proration_behavior': 'none'})
code, _ = send_event('customer.subscription.updated', {'id': sub2['id'], 'object': 'subscription'})
row = credits_row()
check('M1 webhook 500（fail-closed，Stripe 會重試）', code == 500, f'code={code}')
check('M2 plan 不變（不 fallback）', row['plan_type'] == 'pro', row['plan_type'])
# 還原 pro price，讓後續場景狀態一致
stripe_api('POST', f'subscriptions/{sub2["id"]}', {'items[0][id]': item2, 'items[0][price]': PRICE_PRO_M, 'proration_behavior': 'none'})
code, _ = send_event('customer.subscription.updated', {'id': sub2['id'], 'object': 'subscription'})
check('M3 還原後同步恢復 200', code == 200, f'code={code}')

# --- N. 已有存活訂閱 → 再 checkout 被 409 擋下（真實 API + JWT）---
print('\n=== N. Duplicate subscription blocked (409) ===')
nreq = urllib.request.Request(f'{WORKER}/api/checkout/create', method='POST',
                              data=json.dumps({'planType': 'pro', 'billingPeriod': 'monthly'}).encode())
nreq.add_header('Content-Type', 'application/json')
nreq.add_header('Cookie', f'token={mint_jwt(USER, "e2e@test.oao.to")}')
nreq.add_header('Origin', 'http://localhost:5173')
try:
    with urllib.request.urlopen(nreq, timeout=15) as r:
        ncode, nbody = r.status, json.load(r)
except urllib.error.HTTPError as e:
    ncode, nbody = e.code, json.load(e)
check('N1 回 409', ncode == 409, f'code={ncode}')
check('N2 code=SUBSCRIPTION_EXISTS', nbody.get('code') == 'SUBSCRIPTION_EXISTS', nbody)

# --- O. 並發扣款不超用（20 並發打剩 5 的配額）---
print('\n=== O. Concurrent deduction cannot overspend ===')
import threading
kreq = urllib.request.Request(f'{WORKER}/api/account/keys', method='POST',
                              data=json.dumps({'name': 'e2e-concurrency', 'scopes': ['links:write']}).encode())
kreq.add_header('Content-Type', 'application/json')
kreq.add_header('Cookie', f'token={mint_jwt(USER, "e2e@test.oao.to")}')
kreq.add_header('Origin', 'http://localhost:5173')
with urllib.request.urlopen(kreq, timeout=15) as r:
    kresp = json.load(r)
def find_key(obj):
    if isinstance(obj, str) and len(obj) > 24 and ('live_' in obj or 'test_' in obj or obj.startswith('oao')):
        return obj
    if isinstance(obj, dict):
        for v in obj.values():
            k = find_key(v)
            if k: return k
    if isinstance(obj, list):
        for v in obj:
            k = find_key(v)
            if k: return k
    return None
api_key = find_key(kresp)
check('O0 API key 建立成功', api_key is not None)
# pro quota = 10000 → 設 monthly_used 9995（剩 5），balance 0 隔離 quota 路徑
d1(f"UPDATE credits SET monthly_used = 9995, balance = 0, subscription_status = 'active' WHERE user_id='{USER}'")
statuses = []
lock = threading.Lock()
def fire(i):
    req = urllib.request.Request(f'{WORKER}/v1/links', method='POST',
                                 data=json.dumps({'url': f'https://example.com/e2e-{i}'}).encode())
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {api_key}')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            s = r.status
    except urllib.error.HTTPError as e:
        s = e.code
    except Exception:
        s = 0
    with lock:
        statuses.append(s)
threads = [threading.Thread(target=fire, args=(i,)) for i in range(20)]
[t.start() for t in threads]
[t.join() for t in threads]
row = credits_row()
ok_count = sum(1 for s in statuses if 200 <= s < 300)
check('O1 恰好 5 個成功', ok_count == 5, f'ok={ok_count} statuses={sorted(statuses)}')
check('O2 monthly_used 恰好 = 10000（不超用）', row['monthly_used'] == 10000, row['monthly_used'])
check('O3 balance 不為負', row['balance'] == 0, row['balance'])

# --- P. Promo 全域 max_uses 並發不超賣 ---
print('\n=== P. Promo max_uses cannot be oversold concurrently ===')
USER2 = 'user_e2e_test2'
now_ms = int(time.time()*1000)
d1(f"INSERT OR REPLACE INTO users (id, email, name, role, created_at) VALUES ('{USER2}', 'e2e2@test.oao.to', 'E2E Tester 2', 'user', {now_ms}); "
   f"INSERT OR REPLACE INTO credits (id, user_id, balance, purchased_balance, total_purchased, total_used, plan_type, monthly_used, monthly_reset_at, created_at, updated_at) "
   f"VALUES ('cred_e2e_test2', '{USER2}', 0, 0, 0, 0, 'free', 0, {now_ms + 30*86400000}, {now_ms}, {now_ms}); "
   f"INSERT OR REPLACE INTO promo_codes (id, code, discount_type, discount_value, bonus_credits, max_uses, current_uses, per_user_limit, is_active, created_at) "
   f"VALUES ('promo_e2e_1', 'E2EONCE', 'percentage', 10, 300, 1, 0, 1, 1, {now_ms})")
pcodes = []
def redeem(uid, sid, evt):
    s = {'id': sid, 'object': 'checkout.session', 'mode': 'subscription',
         'customer': cus['id'], 'subscription': sub2['id'], 'amount_total': 2900, 'payment_status': 'paid',
         'metadata': {'user_id': uid, 'plan_type': 'pro', 'billing_period': 'monthly',
                      'promo_code': 'E2EONCE', 'promo_code_id': 'promo_e2e_1', 'bonus_credits': '300'}}
    c_, _ = send_event('checkout.session.completed', s, evt)
    with lock:
        pcodes.append(c_)
t1 = threading.Thread(target=redeem, args=(USER, 'cs_e2e_promo_1', 'evt_e2e_promo_1'))
t2 = threading.Thread(target=redeem, args=(USER2, 'cs_e2e_promo_2', 'evt_e2e_promo_2'))
t1.start(); t2.start(); t1.join(); t2.join()
usage_n = d1("SELECT COUNT(*) as n FROM promo_code_usage WHERE promo_code_id='promo_e2e_1'")[0]['n']
uses = d1("SELECT current_uses FROM promo_codes WHERE id='promo_e2e_1'")[0]['current_uses']
# 注意：兩個 session 也各自觸發方案啟用（含 upgrade bonus），
# 所以驗證 promo 只發一份要看 promo 交易紀錄本身，不能看 balance 總和
promo_txn = d1("SELECT COUNT(*) as n, COALESCE(SUM(amount), 0) as amt FROM credit_transactions WHERE id LIKE 'trans_promo_cs_e2e_promo_%'")[0]
check('P1 兩個 webhook 都 200', all(c_ == 200 for c_ in pcodes), pcodes)
check('P2 usage 恰好 1 筆', usage_n == 1, usage_n)
check('P3 current_uses = 1', uses == 1, uses)
check('P4 promo bonus 交易恰好 1 筆、共 300', promo_txn['n'] == 1 and promo_txn['amt'] == 300, promo_txn)

# --- Q. charge.refunded → credits clawback（Codex 抓到的 bug 回歸測試）---
print('\n=== Q. Refund claws back credits ===')
# 確認 payments 表有 H 的 credits 購買（stripe_payment_id = payment_intent）
pay_row = d1("SELECT credits, status FROM payments WHERE stripe_payment_id='pi_e2e_credits'")
check('Q0 credits 購買有寫進 payments 表', len(pay_row) == 1 and pay_row[0]['credits'] == 1000, pay_row)
# 設一個已知且足夠的餘額，讓 clawback 結果確定（前面 test O 把 balance 歸零過）
d1(f"UPDATE credits SET balance = 5000 WHERE user_id='{USER}'")
bal_before_refund = credits_row()['balance']
# 全額退款
refund_charge = {'id': 'ch_e2e_refund', 'object': 'charge', 'payment_intent': 'pi_e2e_credits',
                 'amount': 1000, 'amount_refunded': 1000, 'refunded': True}
codeR, _ = send_event('charge.refunded', refund_charge, 'evt_e2e_refund_1')
bal_after_refund = credits_row()['balance']
# 冪等：重複投遞不重複扣
send_event('charge.refunded', refund_charge, 'evt_e2e_refund_2')
bal_after_dup = credits_row()['balance']
pay_after = d1("SELECT status FROM payments WHERE stripe_payment_id='pi_e2e_credits'")
check('Q1 webhook 200', codeR == 200, f'code={codeR}')
check('Q2 收回 1000 credits', bal_before_refund - bal_after_refund == 1000, f'{bal_before_refund}->{bal_after_refund}')
check('Q3 重複退款不重複扣', bal_after_dup == bal_after_refund, bal_after_dup)
check('Q4 payment 狀態改 refunded', pay_after and pay_after[0]['status'] in ('refunded', 'partially_refunded'), pay_after)

print('\n========================================')
passed = sum(1 for _, ok, _ in results if ok)
print(f'RESULT: {passed}/{len(results)} passed')
for name, ok, detail in results:
    if not ok:
        print(f'  FAILED: {name} [{detail}]')
sys.exit(0 if passed == len(results) else 1)
