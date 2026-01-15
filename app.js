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

// [핵심 수정] v1beta 버전을 강제로 사용하도록 설정
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_KEY);
// 모델 선언 시점에 API 버전을 명시적으로 지정하여 404 에러를 방지합니다.
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash"
}, { apiVersion: 'v1beta' }); // 여기서 v1beta로 맞춤

let authList = {}; 

// [1] 로그인 페이지 (구글 400 에러 해결을 위한 스코프 최적화)
app.get('/login', (req, res) => {
    const { user_key } = req.query;
    // URL 인코딩을 적용하여 구글 서버가 정확히 인식하게 합니다.
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&state=google_${user_key}`;
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${CONFIG.KAKAO_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&state=kakao_${user_key}`;

    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h2>🏠 행복한 우리집 인증</h2>
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
    res.send("<script>alert('인증되었습니다!'); window.close();</script><h2>✅ 인증 성공! 카톡으로 돌아가세요.</h2>");
});

// [3] 카카오톡 응답 로직
app.post('/kakao-auth', async (req, res) => {
    try {
        const userKey = req.body.userRequest.user.id;
        const uttr = req.body.userRequest.utterance;

        // 인증 확인 버튼 대응
        if (uttr.includes("인증") && authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "✅ 인증이 확인되었습니다! 이제 @ 또는 #으로 질문해 주세요." } }] }
            });
        }

        // 미인증 유저 (BasicCard 가이드 위반 해결)
        if (!authList[userKey]) {
            return res.status(200).json({
                version: "2.0",
                template: {
                    outputs: [{
                        basicCard: {
                            title: "가족 인증이 필요합니다",
                            description: "로그인 후 [✅인증확인✅]을 눌러주세요.",
                            thumbnail: { imageUrl: "https://cdn-icons-png.flaticon.com/512/6195/6195696.png" },
                            buttons: [
                                { action: "webLink", label: "🔒로그인 하기", webLinkUrl: `https://happy-home-e120.onrender.com/login?user_key=${userKey}` },
                                { action: "message", label: "✅인증확인✅", messageText: "인증" }
                            ]
                        }
                    }]
                }
            });
        }

        // Gemini 대화 (v1beta 통신)
        if (uttr.startsWith('@') || uttr.startsWith('#')) {
            const question = uttr.replace(/^[@#]/, "").trim();
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
        console.error("DEBUG:", err.message);
        return res.status(200).json({
            version: "2.0",
            template: { outputs: [{ simpleText: { text: "연결 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." } }] }
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`v1beta 서버 가동 중` ));
