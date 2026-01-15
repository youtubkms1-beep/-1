const express = require('express');
const app = express();
app.use(express.json());

// 1. 임시 장부 (서버가 재시작되면 초기화됨)
let authList = {};

// 2. 가족이 들어오는 로그인 화면
app.get('/login', (req, res) => {
    const userKey = req.query.user_key; 
    res.send(`
        <h1>가족 인증 시스템</h1>
        <p>인증을 시작하시겠습니까?</p>
        <button onclick="location.href='/verify?user_key=${userKey}'">구글/MS 계정으로 인증</button>
    `);
});

// 3. 실제 인증이 완료되는 시점 (소셜 로그인 성공 후 리다이렉트되는 곳)
app.get('/verify', (req, res) => {
    const userKey = req.query.user_key;
    if (userKey) {
        authList[userKey] = true; // 장부에 '인증됨' 기록!
        res.send("<h2>인증 성공!</h2><p>이제 카카오톡으로 돌아가서 '확인' 버튼을 누르세요.</p>");
    }
});

// 4. [중요] 카카오 챗봇이 물어보는 뒷문 (API)
app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id; // 챗봇이 보낸 ID
    const isFamily = authList[userKey]; // 장부 확인

    res.json({
        version: "2.0",
        template: {
            outputs: [{
                simpleText: {
                    text: isFamily ? "✅ 확인되었습니다. 우리 가족이 맞네요!" : "❌ 아직 인증 전입니다. 위 링크에서 로그인을 해주세요."
                }
            }]
        }
    });
});

app.listen(3000, () => console.log('Server is running!'));