"use strict";

const functions = require("firebase-functions");
const express = require("express");
const line = require("@line/bot-sdk");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
const fireStore = admin.firestore();

const spawn = require("child-process-promise").spawn;
const path = require("path");
const os = require("os");

const configFunc = functions.config();

const config = {
  channelSecret: configFunc.linebot.channelsecret, // LINE Developersでの準備②でメモったChannel Secret
  channelAccessToken: configFunc.linebot.channelaccesstoken, // LINE Developersでの準備②でメモったアクセストークン
};

const app = express();

app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((result) => console.log("error!!!"));
});

const client = new line.Client(config);
// event.source.userId;
const handleEvent = async (event) => {
  switch (event.type) {
    // follow Event時の返答
    case "follow":
      handleFollow(event);

    // Message Event時の返答
    case "message":
      const message = event.message.text;
      if (message.includes("登録")) return handleRegistration(event);
      if (message.includes("作成")) return handleCreatePaper(event);
      if (message.includes("Subject-")) return handleSelectData(event);
      if (message.includes("no.")) return handleTitle(event);
      if (message.includes("主題:")) return handleVerification(event);
      if (message.includes("はい")) return handleYes(event);
      if (message.includes("いいえ")) return handleNo(event);
      return Promise.resolve(null);

    case "postback":
      if (event.postback.data === "action=settime") {
        const userId = event.source.userId;
        const homeworkCollection = fireStore
          .collection("students")
          .doc(userId)
          .collection("homework")
          .doc(userId);
        const dateList = event.postback.params.date.split("-");
        homeworkCollection.update({
          year: dateList[0],
          month: dateList[1],
          day: dateList[2],
        });
        return replyMessage(
          event,
          "課題Noを入力してください。\n入力方法『no.{番号}』"
        );
      }
      return Promise.resolve(null);

    default:
      return Promise.resolve(null);
  }
};

const handleFollow = async (event) => {
  const userId = event.source.userId;
  const studentsCollection = fireStore.collection("students").doc(userId);
  const studentData = await studentsCollection.get();

  if (studentData.exists)
    return replyMessage(event, "ユーザデータがあります。");

  studentsCollection.set({
    name: "",
    studentNumber: "",
    classId_0: "",
    classId_1: "",
    classId_2: "",
    attendanceNumber: "",
    homeroomTeacher: "",
  });
  const message =
    "あなたの名前を入力してください。\n入力方法『登録:名前-{自分の名前}』";
  replyMessage(event, message);
};

const handleRegistration = async (event) => {
  const message = event.message.text;
  const userId = event.source.userId;

  if (message.includes("登録:名前-")) {
    const sendMessage =
      "クラス記号を入力してください。\n入力方法『登録:クラス記号-{自分のクラス記号}』";
    const ret = message.replace("登録:名前-", "");
    await saveFirestore(userId, ret, "name");
    replyMessage(event, sendMessage);
  } else if (message.includes("登録:クラス記号-")) {
    const sendMessage =
      "出席番号を入力してください。\n入力方法『登録:出席番号-{自分の出席番号}』";
    const ret = message.replace("登録:クラス記号-", "");
    await saveFirestore(userId, ret, "classId");
    replyMessage(event, sendMessage);
  } else if (message.includes("登録:出席番号-")) {
    const sendMessage =
      "学生番号を入力してください。\n入力方法『登録:学籍番号-{学籍番号}』";
    const ret = message.replace("登録:出席番号-", "");
    await saveFirestore(userId, ret, "attendanceNumber");
    replyMessage(event, sendMessage);
  } else if (message.includes("登録:学籍番号-")) {
    const sendMessage =
      "担任の名前を入力してください。\n入力方法『登録:担任-{担任の名前}』";
    const ret = message.replace("登録:学籍番号-", "");
    await saveFirestore(userId, ret, "studentNumber");
    replyMessage(event, sendMessage);
  } else if (message.includes("登録:担任-")) {
    const ret = message.replace("登録:担任-", "");
    await saveFirestore(userId, ret, "homeroomTeacher");
    replyMessage(event, "登録完了しました。");
  } else {
    const sendMessage = "適切な入力方法を行ってください。";
    replyMessage(event, sendMessage);
  }
};

const replyMessage = async (event, message) => {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: message,
  });
};

const saveFirestore = async (id, text, key) => {
  const studentsCollection = fireStore.collection("students").doc(id);

  switch (key) {
    case "name":
      studentsCollection.update({ name: text });
      break;
    case "studentNumber":
      studentsCollection.update({ studentNumber: text });
      break;
    case "classId":
      const list = [];
      for (let index = 0; index < 3; index++) {
        if (index === 0) list.push(text.substr(0, 2));
        if (index === 1) list.push(text.substr(2, 3));
        if (index === 2) list.push(text.substr(-3));
      }
      studentsCollection.update({
        classId_0: list[0],
        classId_1: list[1],
        classId_2: list[2],
      });
      break;
    case "attendanceNumber":
      studentsCollection.update({ attendanceNumber: text });
      break;
    case "homeroomTeacher":
      studentsCollection.update({ homeroomTeacher: text });
      break;

    default:
      break;
  }
};

const handleCreatePaper = async (event) => {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "課題表紙を作成します。\n科目記号を選んでください。",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "FX41",
            text: "Subject-FX41",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "EL4S",
            text: "Subject-EL4S",
          },
        },
      ],
    },
  });
};

const handleSelectData = async (event) => {
  const subjectList = [
    {
      subject: "FX41",
      teacher: "江畑幸一",
    },
    {
      subject: "EL4S",
      teacher: "花山大貴",
    },
  ];
  const message = event.message.text.replace("Subject-", "");

  const userId = event.source.userId;
  const homeworkCollection = fireStore
    .collection("students")
    .doc(userId)
    .collection("homework")
    .doc(userId);

  const target = subjectList
    .filter((object) => {
      return object.subject == message;
    })
    .shift();

  homeworkCollection.set({
    subject: message,
    year: "",
    month: "",
    day: "",
    teacher: target.teacher,
    number: "",
    title: "",
  });

  return client.replyMessage(event.replyToken, {
    type: "template",
    altText: "datetime_picker",
    template: {
      type: "buttons",
      thumbnailImageUrl:
        "https://storage.googleapis.com/lab-mode-cms-production/images/hal21_01_A_w1440h740_color__1/original_hal21_01_A_w1440h740_color__1.jpg", // 画像のURL
      imageAspectRatio: "rectangle", // 画像のアスペクト比、「rectangle: 1.51:1」・「square: 1:1」、デフォルト値はrectangle
      imageSize: "cover", // 画像の表示形式
      imageBackgroundColor: "#FFFFFF", // 画像の背景色
      title: "納期",
      text: "以下より選択してください。",
      // defaultAction: {
      //   type: "uri",
      //   label: "View detail",
      //   uri: "https://arukayies.com/",
      // },
      actions: [
        {
          type: "datetimepicker",
          label: "日時を選択してください。",
          data: "action=settime",
          mode: "date",
          initial: "2021-04-24",
          max: "2021-12-25",
          min: "2021-04-24",
        },
      ],
    },
  });
};

const handleTitle = (event) => {
  const userId = event.source.userId;
  const homeworkCollection = fireStore
    .collection("students")
    .doc(userId)
    .collection("homework")
    .doc(userId);
  const number = event.message.text.replace("no.", "");

  homeworkCollection.update({
    number: number.length === 1 ? `0${number}` : number,
  });

  replyMessage(
    event,
    "課題主題を入力してください。\n入力方法『主題:{課題主題}』"
  );
};

const handleVerification = async (event) => {
  const userId = event.source.userId;
  const homeworkCollection = fireStore
    .collection("students")
    .doc(userId)
    .collection("homework")
    .doc(userId);

  const message = event.message.text;
  const title = message.replace("主題:", "");
  await homeworkCollection.update({
    title,
  });

  const homeworkData = await homeworkCollection.get();
  const text = `科目担当: ${homeworkData.data().subject}\n課題No: ${
    homeworkData.data().number
  }\n課題主題: ${homeworkData.data().title}\n納期: ${
    homeworkData.data().year
  }/${homeworkData.data().month}/${homeworkData.data().day}\n科目担当: ${
    homeworkData.data().teacher
  }\n\n上記の内容で課題表紙が作成されます。送信しますか？`;

  return client.replyMessage(event.replyToken, {
    type: "template",
    altText: "課題表紙が作成され、科目担当に送信されます。",
    template: {
      type: "confirm",
      text,
      actions: [
        {
          type: "message",
          label: "はい",
          text: "はい",
        },
        {
          type: "message",
          label: "いいえ",
          text: "いいえ",
        },
      ],
    },
  });
};

const handleYes = async (event) => {
  const userId = event.source.userId;
  const userData = fireStore.collection("students").doc(userId);
  const userList = await userData.get();
  const homeworkList = await userData.collection("homework").doc(userId).get();

  const allList = Object.assign(userList.data(), homeworkList.data());
  userData.collection("homework").doc(userId).delete();

  client.replyMessage(event.replyToken, {
    type: "text",
    text: "課題表紙を送信しました。",
  });
  fireStore.collection("kadaihyoushi").add(allList);
  createImage(allList);
};

const handleNo = async (event) => {
  const userId = event.source.userId;
  fireStore
    .collection("students")
    .doc(userId)
    .collection("homework")
    .doc(userId);
  replyMessage(event, "再度『作成』と入力してください。");
};

exports.app = functions.https.onRequest(app);

// const storage=admin.storage().bucket("gs://el4s-d5eba");
// CONST
// const FONT_BOLD = "font/NotoSansCJKjp-Medium.otf";
const FONTREGULAR = "font/NotoSansJP-Medium.otf";
const runtimeOpts = {
  timeoutSeconds: 300,
  memory: "1GB",
};
// exports.genOgp = functions
//   .runWith(runtimeOpts)
//   .https.onCall(async (data, context) => {
//     // **************************************************
//     // * ImagiMagickで画像生成
//     // **************************************************
//     console.log(data);
//     const {
//       attendanceNumber,
//       classId_0,
//       classId_1,
//       classId_2,
//       homeroomTeacher,
//       name,
//       studentNumber,
//       day,
//       month,
//       number,
//       subject,
//       teacher,
//       title,
//       year,
//     } = data;
//     // ベースの画像
//     const template = `images/kadaihyoshi.png`;
//     // 生成した画像のパス。tmpディレクトリに配置する
//     const outFile = path.join(
//       os.tmpdir(),
//       `${subject}_${number}_${studentNumber}.png`
//     );
//     // ImageMagicで画像生成
//     await spawn("convert", [
//       "-font",
//       FONTREGULAR,
//       "-kerning",
//       "18", // フォントの指定。カスタムフォントの場合はパスを指定
//       "-pointsize",
//       "44", // フォントサイズの指定
//       "-fill",
//       "black", // 文字色の指定。白文字に設定
//       "-gravity",
//       "NorthWest", // 位置の基準を指定。
//       "-annotate",
//       "+164+200",
//       subject, // 文字の指定。+0+0は位置の基準からの相対位置。
//       "-draw",
//       `text 420, 200 '${number}'`, //課題番号
//       "-draw",
//       `text 164, 280 '${title}'`, //課題主題
//       "-draw",
//       `text 164, 348 '${year}'`, //納期年
//       "-draw",
//       `text 380, 348 '${month}'`, //月
//       "-draw",
//       `text 512, 348 '${day}'`, //日
//       "-draw",
//       `text 164, 413 '${teacher}'`, //科目担当
//       "-draw",
//       `text 164, 520 '${classId_0}'`, //クラス記号
//       "-draw",
//       `text 164, 520 '${classId_1}'`, //クラス記号
//       "-draw",
//       `text 164, 520 '${classId_2}'`, //クラス記号
//       "-draw",
//       `text 660, 520 '${attendanceNumber}'`, //出席番号
//       "-draw",
//       `text 164, 644 '${studentNumber}'`, //学籍番号
//       "-draw",
//       `text 490, 644 '${name}'`, //名前
//       "-draw",
//       `text 164 710 '${homeroomTeacher}'`, //担任
//       template, // 入力画像のパス
//       outFile, // 出力画像のパス
//     ]);
//     // **************************************************
//     // * Cloud Storageへのアップロード
//     // **************************************************
//     const bucket = admin.storage().bucket();
//     const uploadPath = `kadaihyoshi/${subject}_${number}_${studentNumber}.png`; // アップロード先のパス
//     await bucket.upload(outFile, { destination: uploadPath });
//     return;
//   });

const createImage = async (data) => {
  // **************************************************
  // * ImagiMagickで画像生成
  // **************************************************
  console.log(data);
  const {
    attendanceNumber,
    classId_0,
    classId_1,
    classId_2,
    homeroomTeacher,
    name,
    studentNumber,
    day,
    month,
    number,
    subject,
    teacher,
    title,
    year,
  } = data;
  // ベースの画像
  const template = `images/kadaihyoshi.png`;
  // 生成した画像のパス。tmpディレクトリに配置する
  const outFile = path.join(
    os.tmpdir(),
    `${subject}_${number}_${studentNumber}.png`
  );
  // ImageMagicで画像生成
  await spawn("convert", [
    "-font",
    FONTREGULAR,
    "-kerning",
    "18", // フォントの指定。カスタムフォントの場合はパスを指定
    "-pointsize",
    "44", // フォントサイズの指定
    "-fill",
    "black", // 文字色の指定。白文字に設定
    "-gravity",
    "NorthWest", // 位置の基準を指定。
    "-annotate",
    "+164+200",
    subject, // 文字の指定。+0+0は位置の基準からの相対位置。
    "-draw",
    `text 420, 200 '${number}'`, //課題番号
    "-draw",
    `text 164, 280 '${title}'`, //課題主題
    "-draw",
    `text 164, 348 '${year}'`, //納期年
    "-draw",
    `text 380, 348 '${month}'`, //月
    "-draw",
    `text 512, 348 '${day}'`, //日
    "-draw",
    `text 164, 413 '${teacher}'`, //科目担当
    "-draw",
    `text 164, 520 '${classId_0}'`, //クラス記号
    "-draw",
    `text 270, 520 '${classId_1}'`, //クラス記号
    "-draw",
    `text 420, 520 '${classId_2}'`, //クラス記号
    "-draw",
    `text 660, 520 '${attendanceNumber}'`, //出席番号
    "-draw",
    `text 164, 644 '${studentNumber}'`, //学籍番号
    "-draw",
    `text 490, 644 '${name}'`, //名前
    "-draw",
    `text 164 710 '${homeroomTeacher}'`, //担任
    template, // 入力画像のパス
    outFile, // 出力画像のパス
  ]);
  // **************************************************
  // * Cloud Storageへのアップロード
  // **************************************************
  const bucket = admin.storage().bucket();
  const uploadPath = `kadaihyoshi/${subject}_${number}_${studentNumber}.png`; // アップロード先のパス
  await bucket.upload(outFile, { destination: uploadPath });
  return;
};
