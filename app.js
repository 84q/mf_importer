import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const user = "your@mail.addr"
const pass = "your_password"

const browser = await puppeteer.launch({headless: false});
const page = await browser.newPage();

// ログインページに移動
await page.goto('https://moneyforward.com/users/sign_in');

// メールアドレスでログインボタンをクリック
let xpath_login_method = '//p[text() = "メールアドレスでログイン"]';
await page.waitForXPath(xpath_login_method, {visible: true});
await (await page.$x(xpath_login_method))[0].click();

// メールアドレスを入れて、ボタンをクリック
let xpath_email = '//input[@name = "mfid_user[email]"]';
let xpath_email_ok = '//input[@value = "同意してログインする"]';
await page.waitForXPath(xpath_email, {visible: true});
await (await page.$x(xpath_email))[0].type(user);
await (await page.$x(xpath_email_ok))[0].click();

// パスワードを入れて、ボタンをクリック
let xpath_pass = '//input[@name = "mfid_user[password]"]';
let xpath_pass_ok = '//input[@value = "ログインする"]';
await page.waitForXPath(xpath_pass, {visible: true});
await (await page.$x(xpath_pass))[0].type(pass);
await (await page.$x(xpath_pass_ok))[0].click();

// ログインが確認できたら、家計ページでモーダルウィンドウを開く
await page.waitForSelector("#user-info");
await page.goto('https://moneyforward.com/cf#cf_new');

// CSVを1行ずつ読み込む
const csv = await fs.readFile('list.csv', 'utf-8');
const lines = csv.split("\n");
for (const [i, line] of lines.entries()) {
	// 1行目はヘッダなので、パス
	if (i == 0) continue;

	if (line.split(",").length < 8) continue;
	const cells = line.split(/\s*,\s*/);
	//計算対象
	const target = (cells[0] === "1");
	//日付
	const date = new Date(cells[1]);
	const date_str = [date.getFullYear(), ('00' + (date.getMonth() + 1)).slice(-2), ('00' + date.getDate()).slice(-2)].join("/");
	//内容
	const content = cells[2];
	//金額
	const price = Number(cells[3]);
	const is_income = (price > 0);
	const price_abs = Math.abs(price);
	//保有金融機関
	const bank = cells[4];
	//大項目
	const cat_l = cells[5];
	//中項目
	const cat_m = cells[6];

	// 計算対象でないなら登録しない
	if(!target) continue;

	// 入力できる状態を待つ
	await page.waitForSelector('#js-content-field', {visible: true});

	// 収入なら、「収入」ボタンをクリック
	if(is_income) { await page.click('.plus-payment'); }

	// 日付
	await page.evaluate((d) => {document.getElementById("updated-at").value = d}, date_str)

	// 金額
	await page.type('#appendedPrependedInput', String(price_abs))

	// 金融機関(現在は強制ナシ)
	await page.select('#user_asset_act_sub_account_id_hash', '0');

	// 大項目
	await page.click('#js-large-category-selected')
	let xpath_cat_large = `//a[text()="${cat_l}" and @class="l_c_name"]`;
	await page.waitForXPath(xpath_cat_large, {visible: true});
	await(await page.$x(xpath_cat_large))[0].click();

	// 中項目
	await page.click('#js-middle-category-selected')
	let xpath_cat_middle = `//a[text()="${cat_m}" and @class="m_c_name"]`;
	await page.waitForXPath(xpath_cat_middle, {visible: true});
	await(await page.$x(xpath_cat_middle))[0].click();

	// 内容(現在は、"内容(金融機関)")
	await page.type('#js-content-field', `${content}(${bank})`);

	// デバッグなら、ここまで
	//await page.waitForTimeout(1000 * 60);

	await page.click("#submit-button");
	await page.waitForSelector('#confirmation-button', {visible: true});
	console.log(`line ${i+1} success.`);
	await page.click("#confirmation-button");

	// 次の入力が可能となるまで待つ
	await page.waitForSelector('#js-content-field', {visible: true});
}

await page.waitForTimeout(1000 * 5);
browser.close();
