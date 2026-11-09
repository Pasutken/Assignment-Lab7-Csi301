# Sepolia Bank · Web3.js + Infura | CSI301

หน้า DApp แสดงรหัสนักศึกษาและชื่อ–นามสกุล รองรับฝาก ถอน และตรวจยอดเงินของบัญชี MetaMask บน Sepolia โดยใช้ Web3.js 4.16.0 ตามโครงสร้างในเอกสาร T10.2 Web3.js Architecture Blueprint

| ส่วนในเอกสาร | การนำไปใช้ใน `app.js` |
| --- | --- |
| Provider | `new Web3(new Web3.providers.HttpProvider(infuraUrl))` เชื่อม Infura บน Sepolia |
| Contract | สร้าง instance ด้วย `web3.eth.Contract` โดยใช้ ABI และ Contract Address |
| Account | ใช้บัญชีจาก MetaMask และแสดงที่อยู่บัญชีในหน้าเว็บ |
| Call | `checkBlance().call({ from: account })` ผ่าน Infura โดย `from` คือ `msg.sender` ของการอ่าน |
| Send | `deposit().send(...)` และ `withdraw(amount).send(...)` ผ่าน Web3 ที่ใช้ MetaMask เป็น provider ให้ผู้ใช้ยืนยันธุรกรรม |

ตัวอย่างในเอกสารสร้างบัญชีจาก `PRIVATE_KEY` ด้วย `privateKeyToAccount()` ส่วนหน้าเว็บนี้ให้ MetaMask จัดการ Private Key และการลงนามตามข้อกำหนดการเชื่อมกระเป๋า จึงกรอกเฉพาะ **Infura API Key** ใน `config.js`

`config.js` ใช้ ABI และที่อยู่ของ [Bank ที่ Verify แล้วบน Sepolia Etherscan](https://sepolia.etherscan.io/address/0x2565f98cc76ab6810bf24a2b68fe8cec97301406#code) ตามค่าเริ่มต้น สัญญาเก็บยอดแยกตามกระเป๋า แต่ยอดฝากจากงานเดิมจะยังปรากฏเมื่อใช้สัญญาและกระเป๋าเดิม

## เปิดใช้ Infura

1. ไปที่ [Infura Dashboard](https://app.infura.io/) และเปิด Ethereum Sepolia ให้กับ API Key ของโปรเจกต์
2. เปิด `config.js` แล้วใส่ API Key หรือ HTTPS Endpoint ของ Sepolia ที่ `infuraApiKey` ครั้งเดียว

   ```js
   export const infuraApiKey = "YOUR_INFURA_API_KEY";
   ```

3. เปิดเว็บผ่าน HTTP หรือ HTTPS เช่น VS Code Live Server หรือ `npx --yes serve .` จากโฟลเดอร์ที่มี `index.html` เว็บจะตรวจการเชื่อมต่อ Infura อัตโนมัติเมื่อเปิดหน้า
4. ถ้าเว็บยังไม่ได้รับอนุญาตให้ใช้บัญชี ให้กด **เชื่อม MetaMask** และอนุมัติบน Sepolia ถ้าบัญชีเชื่อมอยู่แล้วบน Sepolia เว็บจะอ่านยอดให้อัตโนมัติ

ไฟล์ `config.js` ถูกโหลดโดยเบราว์เซอร์ ผู้เปิดเว็บจึงเห็น API Key ที่ฝังไว้ได้ แม้ repository จะเป็น private เวอร์ชันนี้เหมาะกับการรันในเครื่อง หากต้องเปิดเว็บสาธารณะโดยซ่อนคีย์ ให้เก็บคีย์ไว้ที่ RPC proxy ฝั่งเซิร์ฟเวอร์ เก็บ **API Key Secret** ไว้ฝั่งเซิร์ฟเวอร์เท่านั้น ดู [คู่มือ API Key](https://docs.infura.io/dashboard/how-to/secure-an-api/api-key/)

หากตั้ง Origins allowlist ให้ใส่ origin ที่เปิดเว็บจริง เช่น `http://127.0.0.1:5500` หรือ `https://ชื่อผู้ใช้.github.io` โดยตัด path ของ repository ออก หากจำกัดวิธี RPC ให้เปิด `eth_chainId`, `eth_getCode` และ `eth_call` ดู [คู่มือ Allowlists](https://docs.infura.io/dashboard/how-to/secure-an-api/use-an-allowlist/)

## ทดสอบ

| ขั้นตอน | ตัวอย่าง | ยอดที่คาดหวังเมื่อเริ่มจาก 0 |
| --- | --- | --- |
| ตรวจสอบยอด | บัญชี A | `0.0 ETH` |
| ฝากและยืนยันใน MetaMask | `0.001 ETH` | `0.001 ETH` |
| ถอนและยืนยันใน MetaMask | `0.0004 ETH` | `0.0006 ETH` |
| สลับเป็นบัญชี B ที่ยังไม่เคยฝาก | กดตรวจสอบยอด | `0.0 ETH` |

หลังยืนยันธุรกรรม เว็บอ่านยอดผ่าน Infura ที่บล็อกของธุรกรรมนั้น ถ้า RPC ยังไม่เห็นบล็อก ให้รอสักครู่แล้วกด **ตรวจสอบยอด** ใช้ลิงก์ Etherscan ใต้สถานะเพื่อดูผลธุรกรรม

## เปลี่ยนสัญญาเมื่อจำเป็น

ถ้างานใหม่ต้องการ Contract Address แยก ให้เปิด `Bank.sol` ใน [Remix IDE](https://app.remix.live/) แล้วคอมไพล์ด้วย Solidity `0.8.26`, Optimization **No**, EVM **Default** เปิด **Deploy & Run → Browser Extension → Sepolia Testnet – MetaMask** เลือก `Bank` และ Deploy ด้วย Value `0` จากนั้น Verify บน Sepolia Etherscan ด้วยค่า compiler เดิม แล้วนำ Address และ Contract ABI ไปแทนใน `config.js` ชื่อฟังก์ชัน `checkBlance()` ใช้ตามโจทย์

## ขึ้น GitHub Pages

1. สร้าง repository สำหรับงานนี้ แล้วอัปโหลด `index.html`, `styles.css`, `app.js` และ `config.js` ที่รากของ repository
2. ไปที่ **Settings → Pages → Deploy from a branch → main → /(root) → Save**
3. เปิด URL ที่ได้ ทดสอบ Infura กับ MetaMask แล้วส่ง URL ใน D-Learning โค้ดนี้อ่าน `infuraApiKey` จากไฟล์ที่โฮสต์ ถ้าปล่อยค่าว่าง หน้าเว็บจะแจ้งให้ตั้งค่าในไฟล์ ถ้าฝังคีย์ในไฟล์ที่โฮสต์ ผู้เข้าชมจะเห็นคีย์ได้

[คู่มือตั้งค่า GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
