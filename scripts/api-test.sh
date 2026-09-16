#!/usr/bin/env bash
# Usage: start the dev server (npm run dev), then run: npm run test:api
# Against a deployment: BASE_URL=https://your-app.vercel.app npm run test:api
# Nine equip checks grant gold directly in data/aetherquest.db, so they only run against localhost.
# Adversarial API checks against a running server.
B=${BASE_URL:-http://localhost:3000}; B=${B%/}
D=$(mktemp -d)
A="$D/a.jar"; U2="$D/b.jar"
RUN=$RANDOM$RANDOM
pass=0; fail=0

check() { # name expected actual
  if [ "$2" == "$3" ]; then echo "  PASS  $1"; pass=$((pass+1)); else echo "  FAIL  $1  (expected [$2], got [$3])"; fail=$((fail+1)); fi
}

req() { # jar method path [json] -> prints status, body saved to $D/out
  local jar=$1 m=$2 p=$3 body=$4
  if [ -n "$body" ]; then
    curl -s -o "$D/out" -w "%{http_code}" -H "x-forwarded-for: 198.51.$((RANDOM%250)).$((RANDOM%250))" -b "$jar" -c "$jar" -X "$m" -H "content-type: application/json" --data "$body" "$B$p"
  else
    curl -s -o "$D/out" -w "%{http_code}" -H "x-forwarded-for: 198.51.$((RANDOM%250)).$((RANDOM%250))" -b "$jar" -c "$jar" -X "$m" "$B$p"
  fi
}

# Evaluate a JS accessor against the last response body, e.g.  jq_ '.snapshot.quests.length'
jq_() {
  node -e '
    let s = "";
    process.stdin.on("data", d => s += d).on("end", () => {
      try { const o = JSON.parse(s); console.log(eval("o" + process.argv[1])); }
      catch (e) { console.log("PARSE_ERR:" + s.slice(0, 200)); }
    });
  ' "$1" < "$D/out"
}

echo "== readiness"
for i in $(seq 1 90); do c=$(curl -s -o /dev/null -w "%{http_code}" $B/); [ "$c" == "200" ] && break; sleep 1; done
check "landing page 200" 200 "$c"

echo "== registration & validation"
check "register A" 201 "$(req $A POST /api/auth/register "{\"displayName\":\"Wren\",\"email\":\"wren$RUN@test.dev\",\"password\":\"hunter2hunter2\",\"timezone\":\"Asia/Kolkata\"}")"
check "A has 4 starter quests" 4 "$(jq_ '.snapshot.quests.length')"
check "A starts at level 1" 1 "$(jq_ '.snapshot.character.level')"
check "timezone stored" "Asia/Kolkata" "$(jq_ '.snapshot.user.timezone')"
check "session cookie is HttpOnly" 1 "$(grep -c '^#HttpOnly_' $A)"
check "duplicate email (case-insensitive) -> 409" 409 "$(req $D/x.jar POST /api/auth/register "{\"displayName\":\"Wren\",\"email\":\"WREN$RUN@test.dev\",\"password\":\"hunter2hunter2\"}")"
check "bad email -> 422" 422 "$(req $D/x.jar POST /api/auth/register '{"displayName":"Ok","email":"nope","password":"hunter2hunter2"}')"
check "short password -> 422" 422 "$(req $D/x.jar POST /api/auth/register "{\"displayName\":\"Ok\",\"email\":\"s$RUN@t.dev\",\"password\":\"short\"}")"
check "malformed JSON -> 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{oops' $B/api/auth/register)"
check "invalid timezone falls back safely" 201 "$(req $D/tz.jar POST /api/auth/register "{\"displayName\":\"Tz\",\"email\":\"tz$RUN@test.dev\",\"password\":\"hunter2hunter2\",\"timezone\":\"Mars/Olympus\"}")"
check "  ...to UTC" "UTC" "$(jq_ '.snapshot.user.timezone')"

echo "== unauthenticated & tampered sessions"
check "no cookie -> 401" 401 "$(req $D/none.jar GET /api/quests)"
TOKEN=$(awk '$6=="aq_session"{print $7}' $A)
check "valid token extracted" 1 "$([ ${#TOKEN} -gt 50 ] && echo 1 || echo 0)"
check "tampered signature -> 401" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H "cookie: aq_session=${TOKEN%?????}AAAAA" $B/api/quests)"
check "forged alg=none token -> 401" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'cookie: aq_session=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ4In0.' $B/api/quests)"

echo "== quest CRUD & validation"
check "empty title (spaces only) -> 422" 422 "$(req $A POST /api/quests '{"title":"    ","attribute":"might"}')"
check "  ...with a readable message" "A quest needs a name." "$(jq_ '.error')"
check "unknown attribute -> 422" 422 "$(req $A POST /api/quests '{"title":"x","attribute":"charm"}')"
LONG=$(printf 'a%.0s' $(seq 1 200))
check "200-char title -> 422" 422 "$(req $A POST /api/quests "{\"title\":\"$LONG\",\"attribute\":\"might\"}")"
check "create with injected xp/gold fields -> 201" 201 "$(req $A POST /api/quests '{"title":"Epic cheat","attribute":"might","difficulty":"epic","cadence":"daily","xp":999999,"gold":999999}')"
Q=$(jq_ '.questId')
check "update quest -> 200" 200 "$(req $A PATCH /api/quests/$Q '{"title":"Lift heavy things"}')"
check "empty patch -> 422" 422 "$(req $A PATCH /api/quests/$Q '{}')"
check "patch unknown id -> 404" 404 "$(req $A PATCH /api/quests/does-not-exist '{"title":"x"}')"

echo "== completion economics & anti-cheat"
req $A GET /api/quests >/dev/null
EXPECT_XP=$(jq_ ".snapshot.quests.find(q=>q.id==='$Q').award.xp")
check "preview for epic @ first day = 204" 204 "$EXPECT_XP"
check "complete with forged body -> 200" 200 "$(req $A POST /api/quests/$Q/complete '{"xp":999999,"gold":999999}')"
check "paid award == previewed award" "$EXPECT_XP" "$(jq_ '.award.xp')"
check "character xp == award (forged body ignored)" "$EXPECT_XP" "$(jq_ '.snapshot.character.xp')"
check "streak lit to 1" 1 "$(jq_ '.snapshot.character.streak')"
check "204 xp -> level 2 (L3 needs 293)" 2 "$(jq_ '.leveledUpTo')"
check "attribute Might gained the xp" "$EXPECT_XP" "$(jq_ ".snapshot.attributes.find(a=>a.key==='might').xp")"
check "second completion same day -> 409" 409 "$(req $A POST /api/quests/$Q/complete)"

echo "== concurrency: 8 parallel completes on one quest"
req $A POST /api/quests '{"title":"Race me","attribute":"intellect","difficulty":"hard"}' >/dev/null
R=$(jq_ '.questId')
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code}\n" -b $A -X POST $B/api/quests/$R/complete &
done > $D/race.txt
wait
check "exactly one 200 among 8 racers" 1 "$(grep -c '^200$' $D/race.txt)"
check "the other seven are 409" 7 "$(grep -c '^409$' $D/race.txt)"
req $A GET /api/codex >/dev/null
check "codex holds exactly 2 deeds" 2 "$(jq_ '.deeds.length')"

echo "== undo"
req $A GET /api/quests >/dev/null
XP_BEFORE=$(jq_ '.snapshot.character.xp')
HARD_XP=$(req $A GET /api/codex >/dev/null; jq_ ".deeds.find(d=>d.questTitle==='Race me').xpAwarded")
check "undo -> 200" 200 "$(req $A DELETE /api/quests/$R/complete)"
check "xp reduced by exactly that deed" $((XP_BEFORE-HARD_XP)) "$(jq_ '.snapshot.character.xp')"
check "quest is open again" false "$(jq_ ".snapshot.quests.find(q=>q.id==='$R').isComplete")"
check "undo again -> 409" 409 "$(req $A DELETE /api/quests/$R/complete)"
XP_AFTER_UNDO=$((XP_BEFORE-HARD_XP))

echo "== isolation: user B against user A's data"
check "register B" 201 "$(req $U2 POST /api/auth/register "{\"displayName\":\"Intruder\",\"email\":\"b$RUN@test.dev\",\"password\":\"hunter2hunter2\"}")"
check "B sees none of A's quests" 0 "$(jq_ ".snapshot.quests.filter(q=>q.id==='$Q').length")"
check "B complete A's quest -> 404" 404 "$(req $U2 POST /api/quests/$R/complete)"
check "B edit A's quest -> 404" 404 "$(req $U2 PATCH /api/quests/$Q '{"title":"pwned"}')"
check "B delete A's quest -> 404" 404 "$(req $U2 DELETE /api/quests/$Q)"
check "B undo A's deed -> 409" 409 "$(req $U2 DELETE /api/quests/$Q/complete)"
req $U2 GET /api/codex >/dev/null
check "B's codex is empty" 0 "$(jq_ '.deeds.length')"
req $A GET /api/quests >/dev/null
check "A's quest title untouched" "Lift heavy things" "$(jq_ ".snapshot.quests.find(q=>q.id==='$Q').title")"

echo "== vault economy"
check "B buy with 0 gold -> 402" 402 "$(req $U2 POST /api/vault/buy '{"itemId":"sigil-ember"}')"
check "B buy level-locked item -> 403" 403 "$(req $U2 POST /api/vault/buy '{"itemId":"sigil-ouroboros"}')"
check "B equip unowned -> 403" 403 "$(req $U2 POST /api/vault/equip '{"slot":"sigil","itemId":"sigil-ember"}')"
check "unknown item -> 404" 404 "$(req $U2 POST /api/vault/buy '{"itemId":"sigil-nonexistent"}')"
req $A GET /api/quests >/dev/null
GOLD=$(jq_ '.snapshot.character.gold')
check "A buys Ember (has $GOLD gold)" 200 "$(req $A POST /api/vault/buy '{"itemId":"sigil-ember"}')"
check "gold debited by exactly 80" $((GOLD-80)) "$(jq_ '.snapshot.character.gold')"
check "buy same item twice -> 409" 409 "$(req $A POST /api/vault/buy '{"itemId":"sigil-ember"}')"
check "sigil in title slot -> 400" 400 "$(req $A POST /api/vault/equip '{"slot":"title","itemId":"sigil-ember"}')"
check "equip Ember -> 200" 200 "$(req $A POST /api/vault/equip '{"slot":"sigil","itemId":"sigil-ember"}')"
check "sigil resolves to glyph id" ember "$(jq_ '.snapshot.character.sigil')"
if [[ "$B" == http://localhost* ]]; then
A_ID=$(req $A GET /api/quests >/dev/null; jq_ '.snapshot.user.id')
(node -e '
  const { createClient } = require("@libsql/client");
  createClient({ url: "file:./data/aetherquest.db" })
    .execute({ sql: "update characters set gold = gold + 1000 where user_id = ?", args: [process.argv[1]] })
    .then(r => process.exit(r.rowsAffected === 1 ? 0 : 1));
' "$A_ID") && echo "  (fixture: granted A 1000 gold directly in the DB)"
check "A buys Quill (L2) -> 200" 200 "$(req $A POST /api/vault/buy '{"itemId":"sigil-quill"}')"
check "A equips Quill -> 200" 200 "$(req $A POST /api/vault/equip '{"slot":"sigil","itemId":"sigil-quill"}')"
check "crest shows quill, not the fallback" quill "$(jq_ '.snapshot.character.sigil')"
check "A buys title Wayfarer (needs L2) -> 200" 200 "$(req $A POST /api/vault/buy '{"itemId":"title-wayfarer"}')"
check "A wears Wayfarer -> 200" 200 "$(req $A POST /api/vault/equip '{"slot":"title","itemId":"title-wayfarer"}')"
check "title resolves to display name" Wayfarer "$(jq_ '.snapshot.character.title')"
req $A GET /api/vault >/dev/null
check "vault marks Quill as equipped" true "$(jq_ ".items.find(i=>i.id==='sigil-quill').equipped")"
check "vault marks Ember as owned, not equipped" "true,false" "$(jq_ ".items.filter(i=>i.id==='sigil-ember').map(i=>[i.owned,i.equipped]).join()")"
else
  echo "  (skipped 9 equip checks: their gold fixture writes to the local database file)"
fi
check "unequip -> 200" 200 "$(req $A POST /api/vault/equip '{"slot":"sigil","itemId":null}')"
check "sigil cleared" null "$(jq_ '.snapshot.character.sigil')"

echo "== login"
check "wrong password -> 401" 401 "$(req $D/l.jar POST /api/auth/login "{\"email\":\"wren$RUN@test.dev\",\"password\":\"wrongwrong\"}")"
MSG1=$(jq_ '.error')
check "unknown email -> 401" 401 "$(req $D/l.jar POST /api/auth/login "{\"email\":\"ghost$RUN@test.dev\",\"password\":\"wrongwrong\"}")"
check "identical message for both (no enumeration)" "$MSG1" "$(jq_ '.error')"
check "correct login, mixed-case email -> 200" 200 "$(req $D/l.jar POST /api/auth/login "{\"email\":\"WREN$RUN@test.dev\",\"password\":\"hunter2hunter2\"}")"
check "progress persisted across sessions" "$XP_AFTER_UNDO" "$(jq_ '.snapshot.character.xp')"
check "logout -> 200" 200 "$(req $D/l.jar POST /api/auth/logout)"
check "after logout -> 401" 401 "$(req $D/l.jar GET /api/quests)"

echo "== page protection"
check "/sanctum signed out -> 307" 307 "$(curl -s -o /dev/null -w '%{http_code}' $B/sanctum)"
check "  ...to /enter?next=" "/enter?next=%2Fsanctum" "$(curl -s -o /dev/null -w '%{redirect_url}' $B/sanctum | sed "s#$B##")"
check "/enter signed in -> 307" 307 "$(curl -s -o /dev/null -w '%{http_code}' -b $A $B/enter)"
check "/enter?next=//evil.com renders (next sanitised server-side)" 200 "$(curl -s -o $D/page -w '%{http_code}' "$B/enter?next=//evil.com")"
check "  ...form receives next=/sanctum" 1 "$(grep -c 'mode\\":\\"enter\\",\\"next\\":\\"/sanctum' $D/page)"

echo "== delete keeps history"
check "delete quest -> 200" 200 "$(req $A DELETE /api/quests/$Q)"
req $A GET /api/codex >/dev/null
check "deed survives, title as it was when sealed" "Lift heavy things" "$(jq_ ".deeds.find(d=>d.xpAwarded===204).questTitle")"

echo "== rate limiting"
for i in $(seq 1 11); do curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'content-type: application/json' --data "{\"email\":\"rl$RUN@t.dev\",\"password\":\"x\"}" -H "x-forwarded-for: 10.9.$RUN.1" $B/api/auth/login; done > $D/rl.txt
check "11th login attempt from one IP -> 429" 429 "$(tail -1 $D/rl.txt)"

echo
echo "RESULT: $pass passed, $fail failed"
rm -rf "$D"
