const firebaseConfig = {
  apiKey: "AIzaSyBvtI__5yv6gsm7hwGhH6eyAIsq3OdPTVs",
  authDomain: "el4c-4-24.firebaseapp.com",
  projectId: "el4c-4-24",
  storageBucket: "el4c-4-24.appspot.com",
  messagingSenderId: "133756927867",
  appId: "1:133756927867:web:01b4952517c23745acc7de",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// const storage = firebase.storage();
// const storageRef = storage.ref();
// const imagesRef = storageRef.child("images");
window.onload = () => {
  bung();
};
const bung = () => {
  const imgRef = db.collection("dummy");
  const wrapperElm = document.querySelector(".grid");
  imgRef.get().then((querySnapshot) => {
    querySnapshot.docs.map((doc) => {
      data = doc.data();
      wrapperElm.insertAdjacentHTML(
        "beforeend",
        '<div class="item"><img src="' + data.url + '"></div>'
      );
    });
  });
};
