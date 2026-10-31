# دليل التعلم العربي — SecureCounter

هذا الدليل مكتوب للمبتدئين. يشرح ما بنيناه خطوة بخطوة، ويشرح المصطلحات التي ستراها في الكود والاختبارات.

---

## 1. ما هي Solidity؟

**Solidity** هي لغة برمجة تُستخدم لكتابة العقود الذكية على شبكات EVM مثل Ethereum.

تشبه JavaScript و TypeScript في الشكل، لكنها تُنفَّذ على البلوكشين، وكل عملية تغيّر البيانات تكلف غازاً وتحتاج معاملة `transaction`.

مثال بسيط:

```solidity
uint256 public number = 0;
```

هذا السطر ينشئ متغيراً اسمه `number`، نوعه `uint256`، وقيمته الابتدائية صفر.

---

## 2. ما هو العقد الذكي؟

**العقد الذكي** هو برنامج يعيش على عنوان في البلوكشين.

- له عنوان مثل محفظة: `0x5FbDB...`
- له حالة داخلية محفوظة على الشبكة، مثل قيمة العداد.
- له دوال يمكن للناس استدعاؤها.
- يستطيع إصدار أحداث `events`.
- لا يمكن تعديله بعد النشر، لكن بياناته يمكن أن تتغير عبر دواله.

في مشروعنا، العقد `SecureCounter` يحفظ:

- قيمة العداد `number`.
- عنوان المالك `owner`.
- الحد الأقصى `MAX_VALUE = 100`.

---

## 3. ما الذي يوجد في كل مجلد؟

```text
MyBlockchainProject/
├── src/        # كود العقود الذكية
├── script/     # سكربتات النشر
├── test/       # اختبارات Foundry
├── lib/        # مكتبات خارجية مثل forge-std
├── frontend/   # واجهة الويب
├── out/        # مخرجات التجميع، تُنشأ تلقائياً
├── cache/      # ذاكرة مؤقتة، تُنشأ تلقائياً
├── broadcast/  # سجل عمليات النشر
└── .vscode/    # إعدادات VS Code
```

### `src/`

يحتوي على العقود:

- `Counter.sol`: عقد Foundry الأصلي، بسيط وغير محمي. موجود للمقارنة التعليمية.
- `SecureCounter.sol`: العقد الآمن الذي ندرسه.

### `script/`

يحتوي على سكربتات النشر:

- `Counter.s.sol`: ينشر العقد الأصلي.
- `DeploySecureCounter.s.sol`: ينشر `SecureCounter`.

### `test/`

يحتوي على اختبارات Foundry:

- `Counter.t.sol`
- `SecureCounter.t.sol`

### `lib/`

مكتبات خارجية. `forge-std` توفر `Test` و `Script` وأدوات مساعدة.

### `frontend/`

واجهة Vite + ethers:

- `index.html`: عناصر الصفحة.
- `src/main.js`: الاتصال بـ Anvil وقراءة العقد وإرسال المعاملات.
- `src/style.css`: التصميم الداكن.
- `src/abi.json`: قائمة دوال العقد وأحداثه.
- `public/deployment.json`: عنوان العقد بعد النشر.

### `out/` و `cache/`

ملفات مؤقتة. يمكن حذفها بأمان عبر:

```bash
forge clean
```

### `broadcast/`

سجل معاملات النشر. يستخدمه `deploy-local.sh` لاستخراج عنوان العقد الجديد.

---

## 4. شرح المصطلحات المهمة

### `uint256`

عدد صحيح غير سالب.

- `uint` اختصار لـ unsigned integer.
- `256` عدد البتات.
- أصغر قيمة: `0`.
- أكبر قيمة كبيرة جداً: `2^256 - 1`.
- لا يمكن أن يكون سالباً.

مثال:

```solidity
uint256 public number = 0;
```

### `address`

عنوان على البلوكشين، طوله 20 بايت.

يُستخدم لتمثيل:

- محفظة مستخدم.
- عقد ذكي.
- المالك.

مثال:

```solidity
address public owner;
```

### `msg.sender`

عنوان الحساب الذي استدعى الدالة الحالية.

إذا نقرت في الواجهة على زر باستخدام `Account #0`، فإن `msg.sender` سيكون عنوان `Account #0`.

إذا استخدمت `Account #1`، فإن `msg.sender` سيكون عنوان `Account #1`.

هذا هو أساس التحقق من الصلاحيات:

```solidity
require(msg.sender == owner, "Not owner: access denied");
```

### `require`

دالة تتحقق من شرط. إذا كان الشرط غير صحيح:

- تتوقف المعاملة.
- تُعاد القيمة السابقة.
- تظهر رسالة الخطأ.
- لا يتم حفظ التغيير.

مثال:

```solidity
require(newNumber <= MAX_VALUE, "Invalid number: must be 100 or less");
```

أي محاولة لتعيين `101` تُرفض قبل أن تتغير قيمة `number`.

### `event`

الحدث سجل يُحفظ على البلوكشين. لا يمكن للعقد قراءته لاحقاً كجزء من منطقه، لكن التطبيقات تستطيع قراءته.

مثال:

```solidity
event NumberChanged(address indexed changedBy, uint256 oldValue, uint256 newValue);
```

عند كل تغيير ناجح:

```solidity
emit NumberChanged(msg.sender, oldValue, number);
```

الواجهة تقرأ هذه الأحداث وتعرضها في قسم `NumberChanged events`.

كلمة `indexed` تسمح للتطبيقات بالبحث والفلترة حسب العنوان.

### `modifier`

الـ modifier غلاف يُنفَّذ قبل أو بعد الدالة. عندنا:

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner: access denied");
    _;
}
```

الرمز `_` يعني: أكمل تنفيذ جسم الدالة بعد انتهاء التحقق.

عندما نكتب:

```solidity
function increment() external onlyOwner {
```

فإن أي استدعاء يجب أن يمر أولاً من `onlyOwner`.

### `constructor`

ينفَّذ مرة واحدة فقط عند نشر العقد:

```solidity
constructor() {
    owner = msg.sender;
}
```

الحساب الذي ينشر العقد يصبح المالك.

في مشروعنا، `Account #0` هو الذي ينشر العقد، لذلك هو المالك.

### `constant`

قيمة ثابتة لا يمكن تغييرها:

```solidity
uint256 public constant MAX_VALUE = 100;
```

### `external` و `public`

- `external`: الدالة تُستدعى من خارج العقد.
- `public`: يمكن استدعاؤها من داخل وخارج العقد.

`number` و `owner` معرّفان كـ `public`، لذلك Solidity ينشئ لهما دوال قراءة تلقائية:

```solidity
counter.number()
counter.owner()
counter.MAX_VALUE()
```

---

## 5. كيف تعمل حماية المالك؟

العقد يخزن عنوان المالك:

```solidity
address public owner;
```

عند النشر:

```solidity
constructor() {
    owner = msg.sender;
}
```

عند أي تعديل:

```solidity
function increment() external onlyOwner {
    // ...
}
```

والـ modifier يتحقق:

```solidity
require(msg.sender == owner, "Not owner: access denied");
```

النتيجة:

| الحساب | `msg.sender == owner` | النتيجة |
|---|---|---|
| Account #0 | صحيح | يُسمح بالتعديل |
| Account #1 | غير صحيح | يُرفض |

---

## 6. لماذا تُرفض عمليات غير المصرح لهم؟

عندما يستدعي `Account #1` الدالة `increment`:

1. تدخل الدالة إلى modifier `onlyOwner`.
2. يُقارن `msg.sender` مع `owner`.
3. المقارنة تكون خاطئة.
4. ينفّذ `require` عملية `revert`.
5. تُلغى المعاملة بالكامل.
6. لا تتغير قيمة `number`.
7. لا يُصدر الحدث.
8. تعرض الواجهة رسالة `Access denied`.

هذا مهم لأن العقد لا يعتمد على الواجهة لإخفاء الأزرار. حتى لو استدعى شخص العقد مباشرة عبر `cast` أو أي أداة أخرى، فإن العقد نفسه يرفضه.

الأمان الحقيقي يجب أن يكون داخل العقد، وليس في الواجهة فقط.

---

## 7. كيف تقرأ نتائج Foundry؟

شغّل:

```bash
forge test -vv
```

مثال من مشروعنا:

```text
Ran 2 tests for test/Counter.t.sol:CounterTest
[PASS] testFuzz_SetNumber(uint256) (runs: 256, μ: 50823, ~: 51699)
[PASS] test_Increment() (gas: 51512)
Suite result: ok. 2 passed; 0 failed; 0 skipped

Ran 9 tests for test/SecureCounter.t.sol:SecureCounterTest
[PASS] testFuzz_OwnerCanSetValidNumber(uint256) (runs: 256, μ: 59617, ~: 61705)
[PASS] test_InitialNumberIsZero() (gas: 22529)
[PASS] test_OwnerCanIncrement() (gas: 62545)
[PASS] test_OwnerCanSetMaximumValue() (gas: 60527)
[PASS] test_OwnerCanSetNumber() (gas: 62427)
[PASS] test_RevertWhen_IncrementBeyondLimit() (gas: 97372)
[PASS] test_RevertWhen_SetNumberAboveLimit() (gas: 35015)
[PASS] test_UnauthorizedCannotIncrement() (gas: 37275)
[PASS] test_UnauthorizedCannotSetNumber() (gas: 37368)
Suite result: ok. 9 passed; 0 failed; 0 skipped
```

معنى الرموز:

| الرمز | المعنى |
|---|---|
| `[PASS]` | الاختبار نجح |
| `[FAIL]` | الاختبار فشل |
| `runs: 256` | اختبار Fuzz جرّب 256 قيمة مختلفة |
| `gas` | الغاز المستهلك في الاختبار |
| `Suite result: ok` | كل اختبارات الملف نجحت |
| `0 failed` | لا توجد اختبارات فاشلة |
| `0 skipped` | لا توجد اختبارات متجاهلة |

### تشغيل اختبار واحد فقط

```bash
forge test --match-test test_UnauthorizedCannotIncrement -vvv
```

### تشغيل ملف اختبار واحد

```bash
forge test --match-contract SecureCounterTest -vv
```

### مزيد من التفاصيل عند الفشل

```bash
forge test -vvvv
```

`-vv` يعرض المزيد من المعلومات، و `-vvvv` يعرض تتبع التنفيذ الكامل.

---

## 8. كيف تقرأ ملف الاختبار؟

مثال:

```solidity
function test_UnauthorizedCannotIncrement() public {
    vm.prank(attacker);
    vm.expectRevert(bytes("Not owner: access denied"));
    counter.increment();

    assertEq(counter.number(), 0);
}
```

شرح السطور:

- `vm.prank(attacker)`: اجعل الاستدعاء التالي يأتي من عنوان المهاجم.
- `vm.expectRevert(...)`: توقع أن تفشل المعاملة برسالة محددة.
- `counter.increment()`: حاول تنفيذ التعديل.
- `assertEq(counter.number(), 0)`: تأكد أن القيمة لم تتغير.

### اختبار Fuzz

```solidity
function testFuzz_OwnerCanSetValidNumber(uint256 newNumber) public {
    newNumber = bound(newNumber, 0, counter.MAX_VALUE());
    counter.setNumber(newNumber);
    assertEq(counter.number(), newNumber);
}
```

Foundry يولّد قيماً عشوائية كثيرة ويجربها. `bound` تجعل القيمة ضمن النطاق المسموح.

---

## 9. كيف تعدل الكود ثم تعيد الاختبار؟

مثال: تريد تغيير الحد الأقصى إلى 200.

### الخطوة 1: عدّل العقد

في `src/SecureCounter.sol`:

```solidity
uint256 public constant MAX_VALUE = 200;
```

### الخطوة 2: راجع الاختبارات

في `test/SecureCounter.t.sol` يوجد اختبار يستخدم `101`:

```solidity
counter.setNumber(101);
```

إذا أصبح الحد 200، يجب تغييره إلى قيمة أكبر من 200:

```solidity
counter.setNumber(201);
```

باقي الاختبارات تستخدم `counter.MAX_VALUE()`، لذلك تتكيف تلقائياً.

### الخطوة 3: راجع الواجهة

في `frontend/index.html` غيّر النص و `max` إن أردت:

```html
<input max="200" placeholder="Value from 0 to 200" />
```

وفي `src/main.js` الواجهة تقرأ الحد من العقد، لذلك التحقق الفعلي سيستخدم القيمة الجديدة تلقائياً.

### الخطوة 4: أعد التنسيق والبناء والاختبار

```bash
forge fmt
forge build
forge test -vv
```

### الخطوة 5: أعد النشر

```bash
./deploy-local.sh
```

ثم اضغط **Refresh state** في الواجهة.

---

## 10. تمرين إضافي: إضافة دالة `decrement`

حاول بنفسك إضافة دالة لتقليل العداد:

```solidity
function decrement() external onlyOwner {
    require(number > 0, "Counter is already zero");
    uint256 oldValue = number;
    number = oldValue - 1;
    emit NumberChanged(msg.sender, oldValue, number);
}
```

ثم أضف اختبارات:

```solidity
function test_OwnerCanDecrement() public {
    counter.setNumber(5);
    counter.decrement();
    assertEq(counter.number(), 4);
}

function test_RevertWhen_DecrementBelowZero() public {
    vm.expectRevert(bytes("Counter is already zero"));
    counter.decrement();
}
```

ثم:

```bash
forge fmt
forge test -vv
```

هذا التمرين يعلّمك:

- إضافة دالة جديدة.
- إعادة استخدام `onlyOwner`.
- التحقق من المدخلات.
- إصدار حدث.
- كتابة اختبار نجاح واختبار فشل.

---

## 11. كيف تتصل الواجهة بالعقد؟

الواجهة تستخدم `ethers`:

```js
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const contract = new Contract(address, abi, provider);
```

قراءة القيمة:

```js
const number = await contract.number();
```

إرسال معاملة:

```js
const signer = await provider.getSigner(selectedAccount);
const connected = contract.connect(signer);
const tx = await connected.increment();
await tx.wait();
```

قبل الإرسال، الواجهة تنفذ محاكاة:

```js
await connected.increment.staticCall();
```

هذه المحاكاة لا تكلف غازاً، وتسمح لنا بعرض سبب الرفض بوضوح، مثل:

```text
Not owner: access denied
```

### أين المفتاح الخاص؟

لا يوجد مفتاح خاص في الواجهة.

Anvil يشغّل حسابات محلية مفتوحة. الواجهة ترسل عنوان الحساب فقط، وعقدة Anvil المحلية هي التي توقّع المعاملة.

هذا آمن فقط في بيئة تطوير محلية. لا تفعل هذا مع شبكة حقيقية.

---

## 12. ملاحظات أمان تعليمية

- الحماية في العقد أهم من إخفاء الأزرار في الواجهة.
- استخدم `require` للتحقق من المدخلات قبل تغيير الحالة.
- استخدم `onlyOwner` للدوال الحساسة.
- أصدر `events` للتغييرات المهمة.
- اكتب اختبارات للحالة الطبيعية وللحالة الخاطئة.
- لا تعرض المفاتيح الخاصة في أي كود واجهة.
- هذا المشروع تعليمي وغير مدقق أمنياً.
- لا تستخدمه بأموال حقيقية أو على شبكة عامة.

---

## 13. أوامر سريعة

```bash
# تجميع
forge build

# كل الاختبارات
forge test -vv

# اختبار واحد
forge test --match-test test_OwnerCanIncrement -vvv

# تنسيق الكود
forge fmt

# تنظيف المخرجات
forge clean

# تشغيل Anvil
anvil

# نشر العقد وتحديث عنوان الواجهة
./deploy-local.sh

# تشغيل الواجهة
cd frontend && npm run dev

# تشغيل كل شيء بأمر واحد
./start-local.sh
```

---

## 14. الخلاصة

تعلمت في هذا المشروع:

1. كيف تكتب عقد Solidity بسيطاً.
2. كيف تخزن قيمة وعنوان مالك.
3. كيف تستخدم `msg.sender` و `require`.
4. كيف تحمي دالة بـ `onlyOwner`.
5. كيف تتحقق من الحد الأقصى للقيمة.
6. كيف تصدر `event` لكل تغيير ناجح.
7. كيف تكتب اختبارات Foundry للحالات المسموحة والمرفوضة.
8. كيف تنشر على Anvil محلياً.
9. كيف تربط واجهة ويب محلية بالعقد.
10. لماذا يجب أن تكون الحماية داخل العقد نفسه.

الخطوة التالية المقترحة: أضف دالة `decrement` بنفسك، واكتب لها اختبارات، ثم أعد تشغيل `forge test -vv`.
