const express = require('express');
const app = express();

// 챗봇이 보내는 JSON 데이터를 읽기 위한 설정
app.use(express.json());

// 임시 장부 (서버가 켜져있는 동안 인증 상태를 기억합니다)
let authList = {};

// 1. 로그인 페이지 (카카오톡 버튼 누르면 오는 곳)
app.get('/login', (req, res) => {
    const userKey = req.query.user_key;
    res.send(`
        <div style="text-align: center; margin-top: 50px;">
            <h1>🏠 가족 인증 페이지</h1>
            <p>카카오 ID: ${userKey}</p>
            <button style="padding: 15px 30px; font-size: 18px; cursor: pointer;" 
                onclick="location.href='/verify?user_key=${userKey}'">
                인증 완료하기
            </button>
        </div>
    `);
});

// 2. 인증 처리 경로
app.get('/verify', (req, res) => {
    const userKey = req.query.user_key;
    if (userKey) {
        authList[userKey] = true; // 장부에 기록
        res.send("<h2>✅ 인증 성공!</h2><p>이제 카카오톡으로 돌아가서 '확인' 버튼을 누르세요.</p>");
    }
});

// 3. 챗봇이 물어보는 통로 (여기가 에러 났던 부분입니다)
app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const isFamily = authList[userKey];

    if (isFamily) {
        res.json({
            version: "2.0",
            template: {
                outputs: [{ simpleText: { text: "✅ 인증되었습니다! 즐거운 이용 되세요." } }]
            }
        });
    } else {
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "아래 버튼을 눌러 로그인을 완료해주세요.",
                        buttons: [{
                            action: "webLink",
                            label: "🔒 로그인하러 가기",
                            webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}`
                        }]
                    }
                }]
            }
        });
    }
});

// 서버 실행 포트 설정
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`));
