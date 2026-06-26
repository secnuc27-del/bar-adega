// ==========================================
// CONFIGURAÇÃO DO FIREBASE — ADEGA IMPERIAL
// ==========================================
//
// Para ativar a sincronização em tempo real entre celular e PC:
// 1. Crie um projeto gratuito no Firebase (https://console.firebase.google.com/)
// 2. Crie um aplicativo Web e copie o objeto de configuração (firebaseConfig)
// 3. Substitua os valores abaixo com as suas chaves reais do Firebase
//
const firebaseConfig = {
  apiKey: "AIzaSyALDjVehNobdqMvpVh_95Glqp6AL4tKWS4",
  authDomain: "adega-imperial.firebaseapp.com",
  projectId: "adega-imperial",
  storageBucket: "adega-imperial.firebasestorage.app",
  messagingSenderId: "111233801132",
  appId: "1:111233801132:web:1242b6cffb08ce82e27809"
};

// Senha de acesso ao Painel Admin (modifique se quiser)
const ADMIN_PASSCODE = "ade1020@";

// Expõe as chaves de forma global
window.firebaseConfig = firebaseConfig;
window.ADMIN_PASSCODE = ADMIN_PASSCODE;
