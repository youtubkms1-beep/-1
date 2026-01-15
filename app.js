const express = require('express');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const app = express();

app.use(express.json());

// 설정 정보 (보내주신 키 적용)
const CONFIG = {
    GOOGLE: { 
        id: "454352830368-03qq6p3sp2md488cakspnj2nltpa8e6t.apps.googleusercontent.com",
        client: new OAuth2Client("454352830368-03qq6p3sp2md488cakspnj2nltpa8e6t.apps.googleusercontent.com")
    },
    KAKAO: { 
        id: "5989b66949eca05b1492411f9adf726b",
        secret: "A3RQH7OTnBGqpijRKVvIdlnpBpKHD2rV"
    },
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

let authList = {};

// 1. 로그인 선택 화면
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 가족 통합 로그인</h2>
            <p>원하시는 계정으로 인증해 주세요. (10분 유지)</p>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px;">
                <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE.id}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&scope=email profile&state=google_${user_key}" 
                   style="width: 220px; padding: 12px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; display: block;">Google 로그인</a>
                
                <a href="https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO.id}&redirect_uri=${CONFIG.REDIRECT_URI}&response_type=code&state=kakao_${user_key}" 
                   style="width: 220px; padding: 12px; background: #FEE500; border: none; text-decoration: none; color: black; border-radius: 8px; font-weight: bold; display: block;">카카오 로그인</a>
            </div>
        </div>
    `);
});

// 2. 통합 콜백 처리
app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!state) return res.send("인증 정보가 없습니다.");
    
    const [provider, user_key] = state.split('_');

    try {
        // 실제 서비스에서는 여기서 각 사의 API를 호출해 이메일 등을 확인하지만,
        // 현재는 로그인을 거쳐 돌아왔다는 사실만으로 인증 성공 처리를 합니다.
        authList[user_key] = true;
        
        // 10분 후 자동 만료
        setTimeout(() => { delete authList[user_key]; }, 600000); 

        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2 style="color: #2e7d32;">✅ ${provider.toUpperCase()} 인증 성공!</h2>
                <p>이제 10분 동안 챗봇을 이용하실 수 있습니다.</p>
                <p>카카오톡 창으로 돌아가서 <strong>'인증 확인'</strong> 버튼을 누르세요.</p>
            </div>
        `);
    } catch (e) {
        res.status(500).send("인증 처리 중 에러: " + e.message);
    }
});

// 3. 카카오톡 스킬 응답
app.post('/kakao-auth', (req, res) => {
    const userKey = req.body.userRequest.user.id;
    if (authList[userKey]) {
        res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: "✅ 인증되었습니다! 즐거운 이용 되세요." } }] } });
    } else {
        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    basicCard: {
                        title: "가족 보안 인증",
                        description: "로그인 후 10분간 이용이 가능합니다.",
                        thumbnail: { imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png" },
                        buttons: [
                            { action: "webLink", label: "🔒 로그인하기", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                            { action: "message", label: "🔄 인증 확인", messageText: "인증" }
                        ]
                    }
                }]
            }
        });
    }
});

app.listen(3000, () => console.log("구글/카카오 통합 서버 가동 중"));
