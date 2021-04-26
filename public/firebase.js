require("dotenv").config();

const firebaseConfig = {};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

const storage = firebase.storage();
const storageRef = storage.ref();
const studentsRef = storageRef.child("students");

window.onload = () => {
  bung();
};
const bung = async () => {
  let filenames = [];

  const wrapperElm = document.querySelector(".grid");
  const querySnapshot = await db.collection("kadaihyoushi").get();

  querySnapshot.docs.map((doc) => {
    const data = doc.data();
    filenames.push(data);
  });
  await firebase
    .auth()
    .signInAnonymously()
    .then(() => {})
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
    });

  // Signed in..
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User is signed in, see docs for a list of available properties
      // https://firebase.google.com/docs/reference/js/firebase.User
      var uid = user.uid;
      filenames.map((filename) => {
        console.log(filename);
        storageRef
          .child(
            `kadaihyoshi/${filename.subject}_${filename.number}_${filename.studentNumber}.png`
          )
          .getDownloadURL()
          .then(function (url) {
            console.log(url);
            wrapperElm.insertAdjacentHTML(
              "beforeend",
              '<div class="item"><img src="' + url + '?alt=media"></div>'
            );
          })
          .catch(function (error) {
            console.log(error);

            // Handle any errors
          });
      });
      // ...
    } else {
      // User is signed out
      // ...
    }
  });
};

// https://firebasestorage.googleapis.com/v0/b/el4c-4-24.appspot.com/o/kadaihyoshi%2FFX41_45_81104.png
// https://firebasestorage.googleapis.com/v0/b/el4c-4-24.appspot.com/o/kadaihyoshi%2FFX41_45_81104.png?alt=media&token=00ee057b-c792-4431-baf6-e958dde46e58
