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
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1>🏠 가족 인증 시스템</h1>
            <p>사용자 키: <strong>${userKey}</strong></p>
            <p style="color: #666;">아래 버튼을 누르면 인증이 완료됩니다.</p>
            <button style="padding: 15px 30px; font-size: 18px; background-color: #fee500; border: none; border-radius: 12px; cursor: pointer;" 
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
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>✅ 인증에 성공했습니다!</h2>
                <p>이제 이 창을 닫고 카카오톡으로 돌아가서</p>
                <p><strong>'인증 완료 확인'</strong> 버튼을 눌러주세요.</p>
            </div>
        `);
    }
});

// 3. 챗봇이 물어보는 통로 (카카오톡 스킬 연결 부위)
app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    const isFamily = authList[userKey];

    if (isFamily) {
        // 인증된 경우
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: { text: "✅ 인증이 확인되었습니다! 이제 드라이브를 자유롭게 이용하세요." }
                }]
            }
        });
    } else {
        // 인증 전 (이미지가 포함된 카드 형식)
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 인증이 필요합니다",
                        description: "가족인 경우 아래 버튼을 눌러 로그인을 완료해주세요.",
                        thumbnail: {
                            // 카카오 에러 방지를 위한 썸네일 이미지 추가
                            imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png"
                        },
                        buttons: [
                            {
                                action: "webLink",
                                label: "🔒 1. 로그인하러 가기",
                                webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}`
                            },
                            {
                                action: "message",
                                label: "🔄 2. 인증 완료 확인",
                                messageText: "인증" 
                            }
                        ]
                    }
                }]
            }
        });
    }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버가 ${PORT}번 포트에서 활성화되었습니다.`));
