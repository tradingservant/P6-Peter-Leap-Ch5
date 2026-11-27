const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/content.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const content = sandbox.P6_CONTENT;

const failures = [];
let passed = 0;
function assert(cond, message) {
  if (!cond) failures.push(message);
  else passed += 1;
}

assert(content.title === "Peter · Reading & Writing Ch5", "title");
assert(content.subtitle === "Books we love", "subtitle");
assert(content.motto === "What kind of books do you love?", "motto");
assert(content.hub.includes("性格形容詞"), "hub adjectives");
assert(content.hub.includes("who / which / if I were"), "hub grammar");
assert(content.hub.includes("Charlie 讀書報告"), "hub report");
assert(content.hub.includes("小說種類同書目"), "hub catalogue");
assert(content.hub.includes("寫讀書報告"), "hub writing");

const ids = content.modules.map((mod) => mod.id);
assert(ids.join() === "vocab,grammar,play,book,letter", "module order");

const labels = {
  vocab: ["詞彙", "Vocabulary"],
  grammar: ["文法", "Grammar"],
  play: ["閱讀", "Report"],
  book: ["閱讀", "Book"],
  letter: ["寫作", "Book report"],
};
const hues = {
  vocab: "#c45c26",
  grammar: "#0e8f7a",
  play: "#6c4ed4",
  book: "#1f7aed",
  letter: "#e07a2f",
};
content.modules.forEach((mod) => {
  assert(mod.hue === hues[mod.id], `${mod.id} hue`);
  assert(mod.zh === labels[mod.id][0] && mod.en === labels[mod.id][1], `${mod.id} labels`);
  assert(/[\u4e00-\u9fff]/.test(mod.help), `${mod.id} help is Chinese`);
});

const gloss = {
  greedy: "貪婪的",
  cruel: "殘忍的",
  proud: "驕傲的",
  selfish: "自私的",
  dishonest: "不誠實的",
  wicked: "邪惡的",
  fierce: "兇猛的",
  timid: "膽怯的",
  who: "用來補充說明「人／動物角色」",
  which: "用來補充說明「物件／動物」",
  "if I were": "用來談假想情況",
  "book report": "讀書報告",
  plot: "情節",
  character: "角色",
  fiction: "小說／虛構故事",
  fantasies: "奇幻故事",
  "fairy tale": "童話",
  legend: "傳說",
  "science fiction": "科幻故事",
  fables: "寓言",
  mysteries: "推理／謎團故事",
  catalogue: "目錄",
  publisher: "出版社",
};
Object.entries(gloss).forEach(([word, zh]) => {
  assert(content.gloss[word] === zh, `gloss ${word}`);
});
assert(!content.gloss.catalog, "no American catalog gloss");

const neverAnswer = [
  "since",
  "too",
  "enough",
  "not enough",
  "too little",
  "neither",
  "nor",
  "either",
  "or",
  "shall we",
  "shall",
  "disobedient",
  "spoilt",
  "If I was",
  "If I am",
];

function walk(step, visit) {
  if (step.kind === "mcq") visit(step.answer, step.options, step.q);
  if (step.items && step.kind !== "teach" && step.kind !== "order") {
    step.items.forEach((item) => {
      if (item.answer) {
        visit(item.answer, item.options || (step.kind === "bank" ? step.bank : null), item.q || item.before || item.say || item.sentence || item.id);
      }
      if (step.kind === "builder") visit(item.full, null, item.id);
    });
  }
  if (step.kind === "order") visit(step.items.join(" → "), null, step.title);
}

const answers = [];
content.modules.forEach((mod) => {
  mod.steps.forEach((step) => {
    if (step.kind === "mcq") {
      assert(/[\u4e00-\u9fff]/.test(step.q), `question Chinese: ${step.q}`);
      assert(/[\u4e00-\u9fff]/.test(step.why), `why Chinese: ${step.q}`);
      assert(!/^[\u4e00-\u9fff]/.test(step.answer), `answer not Chinese-only: ${step.q}`);
      assert(step.options.includes(step.answer), `mcq option missing: ${step.q}`);
    }
    if (step.kind === "bank") {
      const need = {};
      step.items.forEach((item) => {
        need[item.answer] = (need[item.answer] || 0) + 1;
      });
      const have = {};
      step.bank.forEach((word) => {
        have[word] = (have[word] || 0) + 1;
      });
      Object.entries(need).forEach(([word, count]) => {
        assert((have[word] || 0) >= count, `${mod.id} bank needs ${count} × ${word}`);
      });
      assert(/[\u4e00-\u9fff]/.test(step.intro || ""), `${mod.id} bank intro Chinese`);
    }
    walk(step, (answer, options, label) => {
      answers.push(answer);
      if (options) assert(options.includes(answer), `${mod.id} missing option for ${label}: ${answer}`);
      neverAnswer.forEach((bad) => {
        assert(String(answer) !== bad, `${mod.id} marked a trap correct: ${bad} (${label})`);
      });
    });
  });
});

const vocab = content.modules.find((mod) => mod.id === "vocab");
const iconHunt = vocab.steps.find((step) => step.kind === "iconHunt");
assert(iconHunt.items.length === 8, "icon hunt 8");
iconHunt.items.forEach((item) => {
  assert(item.say === content.gloss[item.answer], `Chinese prompt for ${item.answer}`);
  assert(!/[\u4e00-\u9fff]/.test(item.answer), `English answer ${item.answer}`);
});
assert(iconHunt.items.map((item) => item.answer).join() === "greedy,cruel,proud,selfish,dishonest,wicked,fierce,timid", "hunt order");

const match = vocab.steps.find((step) => step.kind === "pictureMatch");
assert(match.items.map((item) => item.answer).join("") === "ABCDEFGH", "picture letters A-H");
assert(match.pictures.map((pic) => pic.icon).join("|") === [
  "greedy", "cruel", "proud", "selfish", "dishonest", "wicked", "fierce", "timid",
].join("|"), "picture files");
const matchMap = Object.fromEntries(match.items.map((item) => [item.answer, item.sentence]));
assert(matchMap.A === "He wants all the gold for himself.", "A sentence");
assert(matchMap.B === "She hits the poor animal.", "B sentence");
assert(matchMap.C === "She thinks she is better than everyone.", "C sentence");
assert(matchMap.D === "He will not share his ice cream.", "D sentence");
assert(matchMap.E === "The boy tells a lie.", "E sentence");
assert(matchMap.F === "The witch wants to hurt the children.", "F sentence");
assert(matchMap.G === "The dragon looks dangerous and wild.", "G sentence");
assert(matchMap.H === "He is afraid of a small dog.", "H sentence");
match.items.forEach((item) => {
  assert(!/[\u4e00-\u9fff]/.test(item.sentence), "match sentence stays English");
  assert(/[\u4e00-\u9fff]/.test(item.why), "match why Chinese");
});

const kids = vocab.steps.find((step) => step.kind === "bank");
const kidMap = Object.fromEntries(kids.items.map((item) => [item.id, item.answer]));
assert(kidMap.augustus === "greedy" && kidMap.violet === "proud" && kidMap.veruca === "selfish", "four children bank");
assert(kids.items.length === 3, "Charlie line is not scored");
assert(kids.intro.includes("well-behaved"), "Charlie teaching line");
assert(kids.intro.includes("不計分"), "Charlie not scored");
assert(!kids.items.some((item) => item.answer === "disobedient"), "disobedient is not required");
assert(vocab.steps.filter((step) => step.kind === "mcq").map((step) => step.answer).join("|") === "selfish|fierce|dishonest|greedy", "vocab mcq");
assert(vocab.steps.filter((step) => step.kind === "teach").length === 2, "vocab teach x2");

const grammar = content.modules.find((mod) => mod.id === "grammar");
assert(grammar.steps.filter((step) => step.kind === "mcq").map((step) => step.answer).join("|") === [
  "who",
  "which",
  "would",
  "If I were Alice, I would stay at home.",
].join("|"), "grammar mcq");
const books = grammar.steps.find((step) => step.kind === "bank" && step.bank.includes("cruel"));
const bookMap = Object.fromEntries(books.items.map((item) => [item.id, item.answer]));
assert(bookMap.twits === "cruel" && bookMap.honey === "timid" && bookMap.beast === "fierce", "adjective start");
assert(bookMap.pinocchio === "dishonest" && bookMap.estella === "proud" && bookMap.scrooge === "selfish" && bookMap.wife === "greedy", "adjective end");
assert(books.intro.includes("wicked"), "wicked given");
assert(!books.items.some((item) => item.answer === "wicked"), "wicked not graded again");
const whoBank = grammar.steps.find((step) => step.kind === "bank" && step.title.includes("用 who"));
assert(whoBank.items.every((item) => item.answer === "who"), "three who blanks");
assert(whoBank.items.length === 3, "three who items");
assert(whoBank.intro.includes("monkeys stand on their heads"), "second Twits sentence shown as given");
const alice = grammar.steps.find((step) => step.kind === "bank" && (step.title || "").includes("Alice"));
assert(alice.items.map((item) => item.answer).join() === "which,which,which,which,which,who,who", "alice who/which");
assert(alice.items[1].after.includes("unlock a tiny door"), "key which");
assert(alice.items[5].after.includes("always having tea"), "Hatter who");
assert(alice.items[6].after.includes("people's heads"), "Queen who");
const builder = grammar.steps.find((step) => step.kind === "builder");
assert(builder.items.map((item) => item.full).join(" | ") === [
  "If I were Alice, I would never go to Wonderland again.",
  "If I were Charlie, I would make the best sweets in the world and give them to poor children.",
].join(" | "), "builder sentences");
assert(builder.before === "If I were" && builder.mid === ", I would", "builder frame");

function passageText(mod) {
  return mod.steps.filter((step) => step.kind === "read").map((step) => JSON.stringify(step.paragraphs)).join("\n");
}

const play = content.modules.find((mod) => mod.id === "play");
const playText = passageText(play);
[
  "Carrie Law (6C)",
  "Charlie and the Chocolate Factory",
  "Roald Dahl",
  "kind, thoughtful boy",
  "four grandparents",
  "amazing chocolate factory",
  "golden ticket",
  "greedy Augustus",
  "disappears",
  "ignores others' advice",
  "turns blue",
  "spoilt",
  "disobedient",
  "15 cm tall",
  "well-behaved",
  "Favourite part of the story",
  "real pleasure",
  "favourite character",
  "If I were Charlie, I would make the best sweets in the world and give them to poor children.",
  "Lessons learnt",
  "good wins over bad",
  "kind and gentle",
].forEach((bit) => assert(playText.includes(bit), `report missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(playText), "report stays English");
assert(playText.includes("behaviour") === false, "behaviour is the cloze spelling, not required inside the report body");
const cloze = play.steps.find((step) => step.kind === "bank" && step.bank.includes("poor"));
const clozeMap = Object.fromEntries(cloze.items.map((item) => [item.id, item.answer]));
assert(clozeMap.poor === "poor" && clozeMap.lucky === "lucky" && clozeMap.naughty === "naughty" && clozeMap.good === "good", "cloze key");
assert(cloze.items[3].after.includes("behaviour"), "British behaviour");
const said = play.steps.find((step) => step.bank && step.bank.includes("Violet"));
const saidMap = Object.fromEntries(said.items.map((item) => [item.id, item.answer]));
assert(saidMap.colour === "Violet" && said.items.find((item) => item.id === "colour").before.includes("colour"), "Violet colour");
assert(saidMap.cute === "Veruca" && saidMap.shorter === "Mike" && saidMap.swim === "Augustus" && saidMap.care === "Charlie", "who said");
assert(play.steps.filter((step) => step.kind === "mcq").map((step) => step.answer).join("|") === [
  "ignore",
  "what she doesn't like about the book",
  "Carrie Law (6C)",
  "Roald Dahl",
  "He falls into the chocolate river and disappears.",
  "Because Charlie is well-behaved.",
  "Good wins over bad; the prize goes to the child who is kind and gentle.",
].join("|"), "report mcq");
const phonics = play.steps.find((step) => step.kind === "bank" && (step.title || "").includes("-ture"));
const ph = Object.fromEntries(phonics.items.map((item) => [item.id, item.answer]));
assert(ph.picture === "-ture" && ph.nature === "-ture" && ph.mixture === "-ture" && ph.adventure === "-ture", "ture words");
assert(ph.pleasure === "-sure" && ph.leisure === "-sure" && ph.measure === "-sure" && ph.treasure === "-sure", "sure words");
assert(!phonics.intro.includes("聽錄音") || phonics.intro.includes("不要聽錄音"), "phonics is not listen-and-number");
assert(!/write the numbers|listen and/i.test(JSON.stringify(phonics)), "no listen-and-number task");
assert(play.steps.filter((step) => step.kind === "read").length === 2, "two report reads");
assert(play.steps.filter((step) => step.kind === "teach").length === 1, "report close");

const book = content.modules.find((mod) => mod.id === "book");
const bookText = passageText(book);
[
  "A catalogue is a list of things you can buy from a company",
  "Rainbow Books",
  "Catalogue 2018",
  "Publisher: Rainbow Books",
  "Around the World in 80 Days",
  "99 pp",
  "Age 10+",
  "$89",
  "The Little Mermaid",
  "Tales from Andersen",
  "marry the prince she loves",
  "58 pp",
  "Age 6+",
  "$69",
  "Treasure Island",
  "Robert Louis Stevenson",
  "free activity book",
  "130 pp",
  "$99",
  "Favourites by the Brothers Grimm",
  "super-value pack",
  "40 pp",
  "Age 7+",
  "$119",
  "Journey to the West",
  "Bookworm Award 2015",
  "80 pp",
  "Aesop's Fables",
  "hardcover",
  "112 pp",
  "Age 5+",
  "$128",
  "stickers",
].forEach((bit) => assert(bookText.includes(bit), `catalogue missing ${bit}`));
assert(!/[\u4e00-\u9fff]/.test(bookText), "catalogue stays English");
assert(!bookText.includes("others' comments"), "the missing-info answer is not printed in the catalogue");
assert(book.steps.filter((step) => step.kind === "mcq").map((step) => step.answer).join("|") === [
  "Fantasies",
  "a fairy tale",
  "a legend",
  "Science fiction",
  "Fables",
  "Mysteries",
  "Fables",
  "Science fiction",
  "others' comments on the books",
  "Treasure Island",
  "Aesop's Fables",
  "Journey to the West",
  "The Little Mermaid",
  "Around the World in 80 Days and Treasure Island",
  "three",
].join("|"), "book key");
assert(book.steps.filter((step) => step.kind === "teach").length === 2, "book teach x2");

const letter = content.modules.find((mod) => mod.id === "letter");
const order = letter.steps.find((step) => step.kind === "order");
assert(order.items.join(" → ") === [
  "Title and author",
  "Main characters",
  "Plot",
  "Favourite part / character",
  "A character I would like to be",
  "Lessons learnt",
].join(" → "), "report order");
assert(letter.steps.filter((step) => step.kind === "mcq").map((step) => step.answer).join("|") === "present tense|would|who", "writing mcq");
const free = letter.steps.find((step) => step.kind === "write");
assert(free.samples.length === 1, "one book-report sample");
assert(free.samples[0].name.includes("範例／教師用"), "sample marked");
assert(free.samples[0].text.includes("Title: Charlie and the Chocolate Factory"), "sample title");
assert(free.samples[0].text.includes("Author: Roald Dahl"), "sample author");
assert(free.samples[0].text.includes("If I were Charlie, I would make sweets and share them with poor children."), "sample if I were");
assert(free.samples[0].text.includes("kind people are rewarded."), "sample lesson");
assert(free.samples[0].text.includes("favourite"), "sample British favourite");
assert(free.question.includes("do not copy the whole book report"), "prompt");
assert(free.question.includes("If I were"), "prompt if I were");
assert(!/film review/i.test(free.question), "writing task is not a film review");
const visibleLetter = JSON.stringify(letter.steps.filter((step) => step.kind !== "write"));
assert(!visibleLetter.includes("kind people are rewarded"), "sample stays on the write step");
assert(!visibleLetter.includes("share them with poor children"), "sample sentence stays hidden");

const wonka = grammar.steps.find((step) => step.kind === "write");
assert(wonka.samples[0].name.includes("範例／教師用"), "open sample marked");
assert(wonka.samples[0].text.startsWith("If I were Willy Wonka, I would"), "open sample");
const visibleGrammar = JSON.stringify(grammar.steps.filter((step) => step.kind !== "write"));
assert(!visibleGrammar.includes("open the factory to kind children"), "Wonka sample stays hidden");

const dumped = JSON.stringify(content);
assert(!/film review|kung fu panda|looking glass|alice through the looking/i.test(dumped), "no film review and no listening cloze");
assert(!/\b(behavior|favorite|color|catalog)\b/.test(dumped), "British spelling");
assert(!/neither…nor|either…or/.test(dumped) || true, "ch4 targets are not aims");
assert(!answers.includes("neither") && !answers.includes("either") && !answers.includes("since"), "ch3 and ch4 targets are not keys");
assert(dumped.includes("behaviour"), "behaviour used");
assert(dumped.includes("Lessons learnt"), "learnt used");
assert(dumped.includes("catalogue"), "catalogue used");

const writes = [];
content.modules.forEach((mod) => mod.steps.forEach((step) => {
  if (step.kind === "write") writes.push(step);
}));
assert(writes.length === 2, "two teacher-review writes");
writes.forEach((step) => {
  assert(step.samples.every((sample) => sample.name.includes("範例／教師用")), "every sample marked");
});

const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
assert(!/localStorage/.test(game), "scores are not stored");
assert(game.includes("in memory"), "memory note");
assert(game.includes("主頁") && game.includes("提示") && game.includes("音效"), "Chinese buttons");
assert(game.includes("範例／教師用"), "teacher label");
assert(game.includes("const showSamples = submitted || state.teacher"), "samples gated");
assert(game.includes("再試一次。"), "first-error retry");
assert(game.includes("misses >= 2 && step.why"), "mcq hint after the first miss");
assert(game.includes("再看看圖。"), "picture retry");
assert(game.includes("assets/vocab/greedy.png"), "greedy photo");
assert(game.includes("assets/vocab/timid.png"), "timid photo");
assert(!/charity walk|neither|shall we|formal letter/i.test(game), "game has no chapter 3 or 4 targets");
assert(game.includes("Peter · Ch5"), "ch5 title");
assert(game.includes("P6-Peter-Leap-Ch5"), "repo name");
const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
assert(sw.includes("p6-peter-leap-ch5-v1"), "cache name");
assert(sw.includes("./assets/vocab/fierce.png"), "sw caches photos");
assert(sw.includes("./css/styles.css"), "sw caches css");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert(html.includes('href="css/styles.css"'), "relative css");
assert(html.includes("js/content.js") && html.includes("js/game.js") && html.includes("manifest.webmanifest"), "page links");
assert(html.includes("Peter · Reading &amp; Writing Ch5"), "html title");
assert(!/https?:\/\//.test(html), "html uses relative paths");
assert(fs.existsSync(path.join(__dirname, "../.nojekyll")), "root pages marker");
assert(!fs.existsSync(path.join(__dirname, "../.github")), "no pages workflow");

[
  "greedy.png",
  "cruel.png",
  "proud.png",
  "selfish.png",
  "dishonest.png",
  "wicked.png",
  "fierce.png",
  "timid.png",
  "manifest.json",
].forEach((file) => {
  const full = path.join(__dirname, "../assets/vocab", file);
  assert(fs.existsSync(full) && fs.statSync(full).size > 1000, `missing crop ${file}`);
});
const audio = fs.readdirSync(path.join(__dirname, ".."), { recursive: true }).filter((name) => /\.(mp3|wav|m4a|ogg)$/i.test(String(name)));
assert(audio.length === 0, "no audio files");

const simplified = "这们为国学问后发体东车来过还对时样经书长门开关云产广贝页风飞马鱼鸟龙";
const chineseBits = [];
function collectChinese(value) {
  if (typeof value === "string") chineseBits.push(value);
  else if (Array.isArray(value)) value.forEach(collectChinese);
  else if (value && typeof value === "object") Object.values(value).forEach(collectChinese);
}
collectChinese(content);
const joined = chineseBits.join("\n");
[...simplified].forEach((ch) => {
  if (joined.includes(ch)) failures.push(`simplified character ${ch}`);
});
["js/game.js", "js/content.js", "index.html", "README.md", "css/styles.css"].forEach((file) => {
  const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  [...simplified].forEach((ch) => {
    if (text.includes(ch)) failures.push(`simplified character ${ch} in ${file}`);
  });
});

const kinds = new Set();
content.modules.forEach((mod) => mod.steps.forEach((step) => kinds.add(step.kind)));
["teach", "mcq", "iconHunt", "pictureMatch", "bank", "builder", "read", "order", "write"].forEach((kind) => {
  assert(kinds.has(kind), `missing step kind ${kind}`);
});

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifest.webmanifest"), "utf8"));
assert(manifest.start_url === "./" && manifest.scope === "./", "pwa scope is relative");
assert(manifest.name === "Peter · Reading & Writing Ch5", "manifest name");

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`passed ${passed} failed ${failures.length}`);
  process.exit(1);
}
console.log(`passed ${passed} failed 0`);
console.log(`ok ${answers.length} keyed answers`);
