# SecureCounter — My First Blockchain Security Project

مشروع تعليمي محلي لتعلم أمن العقود الذكية باستخدام **Solidity + Foundry + Anvil + Vite**.

يعرض المشروع عقداً بسيطاً باسم `SecureCounter` مع واجهة ويب داكنة تستطيع من خلالها:

- رؤية قيمة العداد الحالية.
- زيادتها بمقدار 1.
- تعيين قيمة محددة.
- رؤية عنوان المالك.
- تجربة حساب مالك (مسموح) وحساب غير مالك (مرفوض).
- قراءة رسائل النجاح والخطأ وسجل الأحداث.

كل شيء يعمل على سلسلة محلية فقط. لا توجد عملات حقيقية، ولا محافظ حقيقية، ولا شبكات عامة.

---

## ما تم إصلاحه في التاسك الأول

الخطأ:

```text
Declaration "Counter" not found in "src/Counter.sol"
```

السبب لم يكن اسم العقد أو مسار الاستيراد في ملفات Foundry. الملفات كانت تستورد `Counter` بشكل صحيح.
السبب الفعلي كان مرتبطاً بأمرين:

1. إعدادات ذاكرة مؤقتة قديمة في Foundry (`cache/` و `out/`).
2. إضافة Solidity في VS Code كانت تستخدم المترجم القديم `0.5.11`، وهذا المترجم لا يفهم صيغة الاستيراد الحديثة:

```solidity
import {Counter} from "../src/Counter.sol";
```

لذلك كانت الإضافة تعرض خطأً وهمياً، بينما Foundry نفسه يعمل.

ما تم عمله:

- تثبيت Solidity `0.8.28` في `foundry.toml`.
- تثبيت نفس الإصدار في إعدادات VS Code داخل `.vscode/settings.json`.
- إضافة `remappings.txt` لربط `forge-std`.
- تنظيف `cache` و `out` وإعادة البناء.
- التحقق من `forge build` و `forge test -vv` بنجاح.

---

## المتطلبات

تم التحقق من المشروع باستخدام:

- macOS
- Foundry `1.8.7`
- Solidity `0.8.28`
- Node.js `26.12.1`
- npm `11.20.0`
- Vite `8.3.5`
- ethers `6.17.0`

الأدوات المطلوبة:

```bash
forge --version
anvil --version
node --version
npm --version
```

---

## البدء السريع بأمر واحد

من داخل مجلد المشروع:

```bash
cd /Users/sfalah/Documents/vscode/projects/Crypt/MyBlockchainProject
./start-local.sh
```

سيقوم السكربت تلقائياً بـ:

1. تشغيل Anvil إذا لم يكن يعمل.
2. تثبيت اعتماديات الواجهة عند أول تشغيل.
3. تجميع العقود.
4. نشر `SecureCounter`.
5. كتابة عنوان العقد في `frontend/public/deployment.json`.
6. تشغيل الواجهة على:

```text
http://127.0.0.1:5173
```

أوقف كل شيء بـ `Ctrl+C`.

---

## الأوامر اليدوية بالترتيب

افتح الطرفية داخل مجلد المشروع:

```bash
cd /Users/sfalah/Documents/vscode/projects/Crypt/MyBlockchainProject
```

### 1. تجميع العقود

```bash
forge build
```

### 2. تشغيل كل اختبارات الأمان

```bash
forge test -vv
```

### 3. تشغيل Anvil محلياً

اترك هذه الطرفية مفتوحة:

```bash
anvil
```

### 4. نشر العقد محلياً

من طرفية ثانية، ومن داخل مجلد المشروع:

```bash
./deploy-local.sh
```

هذا السكربت يشغّل أمر Foundry التالي ثم يحدّث عنوان العقد للواجهة:

```bash
forge script script/DeploySecureCounter.s.sol:DeploySecureCounter \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

المفتاح أعلاه هو مفتاح Anvil التجريبي العام للحساب رقم 0. ليس مفتاحاً حقيقياً ولا يجب استخدامه مع أموال حقيقية.

### 5. تشغيل الواجهة

```bash
cd frontend
npm install
npm run dev
```

### 6. فتح التطبيق

```bash
open http://127.0.0.1:5173
```

أو افتح الرابط يدوياً في المتصفح.

---

## كيف تجرب الأمان بنفسك

بعد فتح الواجهة:

1. اختر `Account #0`، وهو المالك، واضغط **Increase by 1**. النتيجة: نجاح، وتظهر رسالة خضراء، ويظهر حدث جديد.
2. غيّر الحساب إلى `Account #1`، واضغط **Increase by 1**. النتيجة: رفض بسبب `Not owner: access denied`.
3. ارجع إلى `Account #0` واكتب `100` ثم اضغط **Update**. النتيجة: نجاح.
4. اضغط **Increase by 1** مرة أخرى. النتيجة: رفض بسبب الوصول إلى الحد الأقصى.
5. اكتب `101` واضغط **Update**. النتيجة: رفض لأن القيمة أكبر من 100.

الواجهة لا تحتوي على أي مفتاح خاص. تستخدم حسابات Anvil المفتوحة محلياً:

```js
provider.send("eth_accounts", [])
provider.getSigner(address)
```

وعملية التوقيع تحدث داخل عقدة Anvil المحلية نفسها.

---

## بنية المشروع

```text
MyBlockchainProject/
├── src/
│   ├── Counter.sol                 # عقد Foundry الأصلي
│   └── SecureCounter.sol           # العقد الآمن الجديد
├── script/
│   ├── Counter.s.sol               # نشر Counter الأصلي
│   └── DeploySecureCounter.s.sol   # نشر SecureCounter
├── test/
│   ├── Counter.t.sol               # اختبارات Counter
│   └── SecureCounter.t.sol         # اختبارات الأمان التسعة
├── frontend/
│   ├── index.html                  # واجهة اللوحة
│   ├── src/main.js                 # منطق الاتصال بـ Anvil
│   ├── src/style.css               # التصميم الداكن
│   ├── src/abi.json                # ABI المولّد من Foundry
│   ├── public/deployment.json      # عنوان العقد بعد النشر
│   ├── package.json
│   └── vite.config.js
├── .vscode/
│   ├── settings.json               # تثبيت مترجم Solidity 0.8.28
│   ├── tasks.json                  # أوامر جاهزة داخل VS Code
│   └── extensions.json
├── foundry.toml                    # إعداد Foundry والمترجم
├── remappings.txt                  # ربط forge-std
├── deploy-local.sh                 # نشر محلي + تحديث عنوان الواجهة
├── start-local.sh                  # تشغيل المشروع كاملاً بأمر واحد
├── LEARN_AR.md                     # الدليل التعليمي العربي
└── README.md                       # هذا الملف
```

---

## اختبارات الأمان

ملف `test/SecureCounter.t.sol` يغطي:

1. القيمة الابتدائية تساوي 0.
2. المالك يستطيع زيادة العداد.
3. المالك يستطيع تعيين قيمة جديدة.
4. المستخدم غير المصرح لا يستطيع الزيادة.
5. المستخدم غير المصرح لا يستطيع تعيين قيمة.
6. رفض القيم أكبر من 100.
7. رفض الزيادة بعد الوصول إلى 100.
8. قبول القيمة الحدية 100.
9. اختبار Fuzz للقيم الصحيحة بين 0 و 100.

النتيجة الفعلية بعد التشغيل:

```text
Ran 2 test suites: 11 tests passed, 0 failed, 0 skipped (11 total tests)
```

تنقسم إلى:

- `CounterTest`: اختباران.
- `SecureCounterTest`: تسعة اختبارات.

---

## إعداد VS Code مع Foundry

افتح مجلد `MyBlockchainProject` نفسه في VS Code:

```text
File > Open Folder > MyBlockchainProject
```

ثم:

1. ثبّت إضافة Solidity الموصى بها `JuanBlanco.solidity` إن لم تكن مثبتة.
2. أعد تحميل النافذة `Developer: Reload Window`.
3. تأكد من إصدار المترجم عبر `Command Palette` ثم:

```text
Solidity: Select Compiler Version > v0.8.28
```

الإعدادات موجودة مسبقاً في `.vscode/settings.json`:

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.28+commit.7893614a",
  "solidity.packageDefaultDependenciesDirectory": "lib",
  "solidity.packageDefaultDependenciesContractsDirectory": "src",
  "solidity.remappings": ["forge-std/=lib/forge-std/src/"]
}
```

إذا ظهر الخطأ القديم مرة أخرى:

```bash
forge clean
forge build
```

ثم من VS Code:

```text
Command Palette > Solidity: Restart Language Server
```

---

## استكشاف الأخطاء

### Anvil غير متصل

الواجهة تعرض `Anvil offline` أو `Cannot reach Anvil`.

الحل:

```bash
anvil
```

أو استخدم:

```bash
./start-local.sh
```

### العقد غير منشور

إذا كانت رسالة الواجهة تقول `SecureCounter is not deployed yet`:

```bash
./deploy-local.sh
```

ثم اضغط **Refresh state**.

### المنفذ 8545 مستخدم

أوقف عملية Anvil القديمة أو استخدم منفذاً آخر:

```bash
RPC_URL=http://127.0.0.1:8546 ./start-local.sh
```

### المنفذ 5173 مستخدم

أوقف Vite القديم أو استخدم:

```bash
FRONTEND_PORT=5174 ./start-local.sh
```

### فشل تثبيت الواجهة

```bash
cd frontend
npm install
npm run build
```

### اختبارات Foundry لا تعمل

تأكد أنك داخل مجلد المشروع:

```bash
pwd
forge test -vv
```

---

## ملاحظات أمان مهمة

- هذا المشروع تعليمي وغير مدقق أمنياً.
- لا تستخدمه على شبكة عامة أو بأموال حقيقية.
- لا تضع مفاتيح خاصة حقيقية في أي ملف واجهة.
- `SecureCounter` يحمي التعديل عبر `onlyOwner`، لكنه ليس بديلاً عن تدقيق أمني كامل.
- `Counter.sol` الأصلي لا يحتوي على حماية وصول، وهو موجود فقط للمقارنة التعليمية.

---

## الملفات التي تمت إضافتها أو تعديلها

تم تعديل:

- `foundry.toml`
- `src/Counter.sol`
- `script/Counter.s.sol`
- `test/Counter.t.sol`
- `.gitignore`
- `README.md`

تمت إضافة:

- `src/SecureCounter.sol`
- `script/DeploySecureCounter.s.sol`
- `test/SecureCounter.t.sol`
- `.vscode/settings.json`
- `.vscode/tasks.json`
- `.vscode/extensions.json`
- `remappings.txt`
- `deploy-local.sh`
- `start-local.sh`
- `frontend/` بالكامل
- `LEARN_AR.md`

لم يتم حذف مشروعك القديم، ولم يتم عمل Git reset، وتم الإبقاء على عقد `Counter` الأصلي واختباراته.

---

## التعلم بالعربية

راجع الملف الكامل:

[LEARN_AR.md](./LEARN_AR.md)

يشرح Solidity، والعقد الذكي، ومجلدات المشروع، و `uint256` و `address` و `msg.sender` و `require` و `event`، وكيف تعمل حماية المالك، وكيف تقرأ نتائج Foundry.
