<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAtitp-HDKNNkeBWTCpywHdjJhhYJh0QJw",
    authDomain: "starwallet-e1945.firebaseapp.com",
    projectId: "starwallet-e1945",
    storageBucket: "starwallet-e1945.firebasestorage.app",
    messagingSenderId: "625439235564",
    appId: "1:625439235564:web:a30bcc695ffeaae5f934c9",
    measurementId: "G-JZDG4JV5BR"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
