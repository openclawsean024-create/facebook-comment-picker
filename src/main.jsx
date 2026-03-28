import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Facebook SDK 非同步初始化
window.fbAsyncInit = () => {
  FB.init({
    appId: import.meta.env.VITE_FB_APP_ID || 'YOUR_APP_ID',
    cookie: true,
    xfbml: true,
    version: 'v18.0',
  });
};

// 載入 Facebook SDK (非同步，不封鎖渲染)
(function (d, s, id) {
  var js,
    fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s);
  js.id = id;
  js.src = 'https://connect.facebook.net/zh_TW/sdk.js';
  fjs.parentNode.insertBefore(js, fjs);
})(document, 'script', 'facebook-jssdk');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
