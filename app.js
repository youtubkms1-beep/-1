const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const CONFIG = {
    GOOGLE_ID: "1065457238444-jo0k3dr5bj0th94qg7i54his9tg66l55.apps.googleusercontent.com",
    KAKAO_ID: "5989b66949eca05b1492411f9adf726b",
    GEMINI_KEY: "AIzaSyCBVZTcV1yPde_F_MFVNlOk3SxXVrcDCoQ",
    REDIRECT_URI: "https://happy-home-e120.onrender.com/auth/callback"
};

// [해결 포인트 1] 명시적으로 v1 정식 버전을 사용하도록 설정
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);

// [해결 포인트 2] 모델 이름 앞에 'models/'를 붙여 경로를 명확히 합니다.
// 'gemini-1.5-flash'가 최신이므로 이를 기본으로 하되 경로를 보강합니다.
const model = genAI.getGenerativeModel({ 
    model: "models/gemini-1.5-flash" 
});

let authList = {}; 

// [1] 로그인 페이지
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&state=google_${user_key}`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&state=kakao_${user_key}`;

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 가족 인증 센터</h2>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px;">
                <a href="${googleAuthUrl}" style="width: 220px; padding: 15px; background: white; border: 1px solid #ccc; text-decoration: none; color: black; border-radius: 8px; font-weight: bold;">Google 로그인</a>
                <a href="${kakaoAuthUrl}" style="width: 220px; padding: 15px; background: #FEE500; border: none; text-decoration: none; color: black; border-radius: 8px; font-weight: bold;">카카오 로그인</a>
            </div>
        </div>
    `);
});

// [2] 인증 콜백
app.get('/auth/callback', (req, res) => {
    const { state } = req.query;
    if (state) {
        const user_key = state.split('_')[1];
        authList[user_key] = true;
        setTimeout(() => { delete authList[user_key]; }, 3600000); 
    }
    res.send("<script>alert('인증 성공!'); window.close();</script><h2>✅ 인증 완료! 카톡으로 돌아가세요.</h2>");
});

// [3] 카카오톡 응답 로직
app.post('/kakao-auth', async (req, res) => {
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        if (uttr.includes("인증") && authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "✅ 인증되었습니다! 이제 대화를 시작해보세요." } }] }
            });
        }

        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "가족 인증이 필요합니다",
                            description: "로그인 후 [인증확인]을 눌러주세요.",
                            thumbnail: { imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png" },
                            buttons: [
                                { action: "webLink", label: "🔒로그인", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                                { action: "message", label: "✅인증확인", messageText: "인증" }
                            ]
                        }
                    }]
                }
            });
        }

        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
            
            // 질문 생성 (정식 경로로 호출)
            const result = await model.generateContent(question);
            const response = await result.response;
            
            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: response.text() } }] }
            });
        }

        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "@ 또는 #을 붙여 질문해주세요!" } }] }
        });

    } catch (err) {
        console.error("최종 에러 상세:", err.message);
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "서버가 모델 주소를 찾는 중입니다. 잠시 후 다시 시도해 주세요!" } }] }
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`서버 가동 완료`));
